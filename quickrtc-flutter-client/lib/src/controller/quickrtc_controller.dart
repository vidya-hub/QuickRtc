import 'dart:async';
import 'package:flutter/foundation.dart' show ChangeNotifier;
import 'package:logger/logger.dart' as app_logger;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';

// Mixins
import 'package:quickrtc_flutter_client/src/controller/quickrtc_transport_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_producer_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_consumer_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_socket_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_media_mixin.dart';

// Re-export static utilities
export 'quickrtc_static.dart';

/// QuickRTCController - Main controller for WebRTC conferencing
///
/// This controller manages the entire lifecycle of a WebRTC conference,
/// including joining, producing/consuming media, and leaving.
///
/// Example:
/// ```dart
/// // Create socket
/// final socket = io.io('https://your-server.com');
///
/// // Create controller
/// final controller = QuickRTCController(socket: socket);
///
/// // Wrap your app with QuickRTCProvider
/// QuickRTCProvider(
///   controller: controller,
///   child: MyApp(),
/// )
///
/// // Join a meeting
/// await controller.joinMeeting(
///   conferenceId: 'room-123',
///   participantName: 'Alice',
/// );
///
/// // Enable camera and microphone
/// await controller.enableMedia();
///
/// // Or use low-level API
/// final media = await QuickRTCStatic.getLocalMedia(MediaConfig.audioVideo());
/// await controller.produce(ProduceInput.fromTracksWithTypes(media.tracksWithTypes));
///
/// // Leave
/// await controller.leaveMeeting();
/// ```
class QuickRTCController extends ChangeNotifier
    with
        QuickRTCTransportMixin,
        QuickRTCProducerMixin,
        QuickRTCConsumerMixin,
        QuickRTCSocketMixin,
        QuickRTCMediaMixin {
  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /// Socket.IO client instance (injected at construction)
  final io.Socket _socket;

  /// Maximum participants allowed (0 = unlimited)
  final int _maxParticipants;

  /// Enable debug logging
  final bool _debug;

  /// Logger instance
  final app_logger.Logger _logger = app_logger.Logger();

  // ============================================================================
  // INTERNAL STATE (for mediasoup operations)
  // ============================================================================

  Device? _device;
  Transport? _sendTransport;
  Transport? _recvTransport;

  String? _conferenceId;
  String? _participantId;

  final Set<String> _consumedProducerIds = {};
  final Map<String, ProducerInfo> _producers = {};
  final Map<String, ConsumerInfo> _consumers = {};
  final Map<String, Completer<Producer>> _pendingProducers = {};
  final Map<String, Completer<Consumer>> _pendingConsumers = {};

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  QuickRTCState _state = const QuickRTCState();

  /// Current state of the controller
  @override
  QuickRTCState get state => _state;

  bool _isDisposed = false;

  /// Update state and notify listeners
  @override
  void updateState(QuickRTCState newState) {
    log('updateState called',
        'old participants: ${_state.participants.length}, new: ${newState.participants.length}',);
    log('States equal?', _state == newState);

    if (_state != newState) {
      _state = newState;
      // Only notify if not disposed
      if (_isDisposed) return;
      log('Notifying listeners',
          'hasListeners check skipped, using _isDisposed',);
      notifyListeners();
    } else {
      log('State unchanged', 'NOT notifying listeners');
    }
  }

  // ============================================================================
  // MIXIN INTERFACE IMPLEMENTATIONS
  // ============================================================================

  @override
  io.Socket get socket => _socket;

  @override
  int get maxParticipants => _maxParticipants;

  @override
  Device? get device => _device;

  @override
  set device(Device? value) => _device = value;

  @override
  Transport? get sendTransport => _sendTransport;

  @override
  set sendTransport(Transport? value) => _sendTransport = value;

  @override
  Transport? get recvTransport => _recvTransport;

  @override
  set recvTransport(Transport? value) => _recvTransport = value;

  @override
  String? get conferenceId => _conferenceId;

  @override
  String? get participantId => _participantId;

  @override
  Map<String, ProducerInfo> get producers => _producers;

  @override
  Map<String, ConsumerInfo> get consumers => _consumers;

  @override
  Set<String> get consumedProducerIds => _consumedProducerIds;

  @override
  Map<String, Completer<Producer>> get pendingProducers => _pendingProducers;

  @override
  Map<String, Completer<Consumer>> get pendingConsumers => _pendingConsumers;

  @override
  void log(String message, [dynamic data]) {
    if (_debug) {
      if (data != null) {
        _logger.d('[QuickRTC] $message: $data');
      } else {
        _logger.d('[QuickRTC] $message');
      }
    }
  }

  @override
  Future<Map<String, dynamic>> emitWithAck(
    String event,
    Map<String, dynamic> data,
  ) async {
    final completer = Completer<Map<String, dynamic>>();

    _socket.emitWithAck(event, data, ack: (response) {
      if (response is Map<String, dynamic>) {
        completer.complete(response);
      } else if (response is Map) {
        completer.complete(Map<String, dynamic>.from(response));
      } else {
        completer.complete({'status': 'ok', 'data': response});
      }
    },);

    return completer.future;
  }

  @override
  void onProducerCallback(Producer producer) {
    log('Producer callback received', producer.id);

    final pendingKey = _pendingProducers.keys.firstWhere(
      (key) => !_pendingProducers[key]!.isCompleted,
      orElse: () => '',
    );

    if (pendingKey.isNotEmpty) {
      _pendingProducers[pendingKey]!.complete(producer);
    }
  }

  @override
  void onConsumerCallback(Consumer consumer, [dynamic accept]) {
    log('Consumer callback received', consumer.id);

    if (accept != null) {
      accept({});
    }

    final completer = _pendingConsumers.remove(consumer.id);
    if (completer != null && !completer.isCompleted) {
      completer.complete(consumer);
    }
  }

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  /// Create a new QuickRTCController
  ///
  /// [socket] - Socket.IO client instance (required)
  /// [debug] - Enable debug logging (default: false)
  /// [maxParticipants] - Maximum participants allowed, 0 = unlimited (default: 0)
  QuickRTCController({
    required io.Socket socket,
    bool debug = false,
    int maxParticipants = 0,
  })  : _socket = socket,
        _debug = debug,
        _maxParticipants = maxParticipants;

  // ============================================================================
  // CONVENIENCE GETTERS
  // ============================================================================

  /// Whether connected to a conference
  bool get isConnected => _state.isConnected;

  /// Whether connecting to a conference
  bool get isConnecting => _state.isConnecting;

  /// Whether disconnected
  bool get isDisconnected => _state.isDisconnected;

  /// Whether there is an error
  bool get hasError => _state.hasError;

  /// Current error message
  String? get error => _state.error;

  /// List of remote participants
  List<RemoteParticipant> get participants => _state.participantList;

  /// Number of remote participants
  int get participantCount => _state.participantCount;

  /// Whether local audio is being produced
  bool get hasLocalAudio => _state.hasLocalAudio;

  /// Whether local video is being produced
  bool get hasLocalVideo => _state.hasLocalVideo;

  /// Whether screen is being shared
  bool get hasLocalScreenshare => _state.hasLocalScreenshare;

  /// Whether local audio is muted (paused)
  bool get isAudioMuted => _state.isLocalAudioPaused;

  /// Whether local video is paused
  bool get isVideoPaused => _state.isLocalVideoPaused;

  /// Whether local screenshare is paused
  bool get isScreensharePaused => _state.isLocalScreensharePaused;

  // ============================================================================
  // HIGH-LEVEL: Meeting Lifecycle
  // ============================================================================

  /// Join a meeting/conference
  ///
  /// This is the high-level method to join a conference.
  /// It handles all the setup including device initialization and transport creation.
  Future<void> joinMeeting({
    required String conferenceId,
    required String participantName,
    String? conferenceName,
    String? participantId,
    Map<String, dynamic>? participantInfo,
  }) async {
    if (_state.isConnected) {
      throw Exception('Already connected to a conference');
    }

    log('Joining meeting', conferenceId);

    updateState(_state.copyWith(status: ConnectionStatus.connecting));

    final effectiveParticipantId = participantId ?? _generateParticipantId();

    try {
      setupSocketListeners();

      final response = await emitWithAck('joinConference', {
        'data': {
          'conferenceId': conferenceId,
          'conferenceName': conferenceName,
          'participantId': effectiveParticipantId,
          'participantName': participantName,
          'participantInfo': participantInfo,
        },
      });

      if (response['status'] != 'ok') {
        throw Exception(response['error'] ?? 'Failed to join conference');
      }

      final data = response['data'] as Map<String, dynamic>;
      final routerCapabilities =
          data['routerCapabilities'] as Map<String, dynamic>;

      _device = Device();
      await _device!.load(
        routerRtpCapabilities: RtpCapabilities.fromMap(routerCapabilities),
      );

      log('Device loaded');

      _conferenceId = conferenceId;
      _participantId = effectiveParticipantId;

      await createTransports();

      log('Successfully joined meeting');

      updateState(_state.copyWith(
        status: ConnectionStatus.connected,
        conferenceId: conferenceId,
        participantId: effectiveParticipantId,
        participantName: participantName,
        clearError: true,
      ),);

      await consumeExistingParticipants();
    } catch (error) {
      log('Failed to join meeting', error);
      updateState(_state.copyWith(
        status: ConnectionStatus.disconnected,
        error: 'Failed to join meeting: $error',
      ),);
      rethrow;
    }
  }

  /// Leave the current meeting/conference
  Future<void> leaveMeeting() async {
    if (!_state.isConnected) {
      return;
    }

    log('Leaving meeting');

    try {
      // Notify server first (while connections are still active)
      await emitWithAck('leaveConference', {
        'conferenceId': _conferenceId,
        'participantId': _participantId,
      });
    } catch (error) {
      log('Error notifying server of leave', error);
    }

    // Close transports first - this closes the peer connection
    // which will automatically clean up all producers/consumers
    closeTransports();

    // Just clear the collections - don't try to close individual
    // producers/consumers as the peer connection is already gone
    _producers.clear();
    _consumers.clear();
    _consumedProducerIds.clear();

    cleanup();
  }

  /// Clear the current error
  void clearError() {
    if (_state.error != null) {
      updateState(_state.copyWith(clearError: true));
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /// Cleanup all resources (called by mixin)
  @override
  void cleanup() {
    removeSocketListeners();

    _conferenceId = null;
    _participantId = null;
    _producers.clear();
    _consumers.clear();
    _consumedProducerIds.clear();
    _pendingProducers.clear();
    _pendingConsumers.clear();
    _device = null;
    _sendTransport = null;
    _recvTransport = null;

    updateState(const QuickRTCState());
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  String _generateParticipantId() {
    return 'p-${DateTime.now().millisecondsSinceEpoch}-${_randomString(9)}';
  }

  String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = DateTime.now().microsecondsSinceEpoch;
    return List.generate(
      length,
      (index) => chars[(random + index * 7) % chars.length],
    ).join();
  }

  /// Get existing participants from server
  Future<List<RemoteParticipant>> getParticipants() async {
    if (!_state.isConnected) {
      throw Exception('Not connected to a conference');
    }

    final response = await emitWithAck('getParticipants', {
      'conferenceId': _conferenceId,
    });

    if (response['status'] != 'ok') {
      throw Exception(response['error'] ?? 'Failed to get participants');
    }

    final participantsList = response['data'] as List<dynamic>;
    final updatedParticipants =
        Map<String, RemoteParticipant>.from(_state.participants);

    for (final p in participantsList) {
      final pData = p as Map<String, dynamic>;
      final pId = pData['participantId'] as String;

      if (pId != _participantId && !updatedParticipants.containsKey(pId)) {
        updatedParticipants[pId] = RemoteParticipant(
          id: pId,
          name: pData['participantName'] as String,
          info: pData['participantInfo'] as Map<String, dynamic>? ?? {},
          streams: const [],
        );
      }
    }

    updateState(_state.copyWith(participants: updatedParticipants));

    return updatedParticipants.values.toList();
  }

  // ============================================================================
  // DISPOSE
  // ============================================================================

  @override
  void dispose() {
    _isDisposed = true;
    // Disconnect if still connected
    if (_state.isConnected) {
      leaveMeeting();
    }
    // Clear state before disposing to prevent socket handlers from triggering
    _state = const QuickRTCState();
    super.dispose();
  }
}
