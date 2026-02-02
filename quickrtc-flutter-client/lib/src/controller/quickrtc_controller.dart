import 'dart:async';
import 'dart:math' show Random;
import 'package:flutter/foundation.dart' show ChangeNotifier;
import 'package:logger/logger.dart' as app_logger;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';
import 'package:quickrtc_flutter_client/src/exceptions.dart';
import 'package:quickrtc_flutter_client/src/quickrtc_socket.dart';

// Mixins
import 'package:quickrtc_flutter_client/src/controller/quickrtc_transport_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_producer_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_consumer_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_socket_mixin.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_media_mixin.dart';

// Re-export static utilities
export 'quickrtc_static.dart';

// Re-export exceptions for easy access
export 'package:quickrtc_flutter_client/src/exceptions.dart';

/// QuickRTCController - Main controller for WebRTC conferencing
///
/// This controller manages the entire lifecycle of a WebRTC conference,
/// including joining, producing/consuming media, and leaving.
///
/// ## Quick Start (Recommended)
///
/// ```dart
/// // Connect and join in one step
/// final controller = await QuickRTCController.connect(
///   serverUrl: 'https://your-server.com',
///   conferenceId: 'room-123',
///   participantName: 'Alice',
/// );
///
/// // Enable media
/// await controller.enableMedia();
///
/// // Leave when done
/// await controller.leaveMeeting();
/// controller.dispose();
/// ```
///
/// ## Manual Setup (More Control)
///
/// ```dart
/// // Create socket and controller separately
/// final socket = await QuickRTCSocket.connect('https://your-server.com');
/// final controller = QuickRTCController(socket: socket);
///
/// // Join meeting
/// await controller.joinMeeting(
///   conferenceId: 'room-123',
///   participantName: 'Alice',
/// );
///
/// // Enable camera and microphone
/// await controller.enableMedia();
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

  /// Whether this controller owns the socket (created via connect())
  final bool _ownsSocket;

  /// Maximum participants allowed (0 = unlimited)
  final int _maxParticipants;

  /// Enable debug logging
  final bool _debug;

  /// Default timeout for socket operations
  final Duration _socketTimeout;

  /// Default timeout for producer/consumer operations
  final Duration _operationTimeout;

  /// Logger instance
  final app_logger.Logger _logger = app_logger.Logger();

  /// Secure random generator for participant IDs
  static final Random _secureRandom = Random.secure();

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
    log(
      'updateState called',
      'old participants: ${_state.participants.length}, new: ${newState.participants.length}',
    );
    log('States equal?', _state == newState);

    if (_state != newState) {
      _state = newState;
      // Only notify if not disposed
      if (_isDisposed) return;
      log(
        'Notifying listeners',
        'hasListeners check skipped, using _isDisposed',
      );
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

  /// Get the operation timeout for producer/consumer operations
  @override
  Duration get operationTimeout => _operationTimeout;

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
    Map<String, dynamic> data, {
    Duration? timeout,
  }) async {
    final effectiveTimeout = timeout ?? _socketTimeout;
    final completer = Completer<Map<String, dynamic>>();

    _socket.emitWithAck(event, data, ack: (response) {
      if (completer.isCompleted) return; // Guard against late responses

      if (response is Map<String, dynamic>) {
        completer.complete(response);
      } else if (response is Map) {
        completer.complete(Map<String, dynamic>.from(response));
      } else {
        completer.complete({'status': 'ok', 'data': response});
      }
    });

    try {
      return await completer.future.timeout(
        effectiveTimeout,
        onTimeout: () {
          throw QuickRTCTimeoutException(
            operation: 'Socket event "$event"',
            timeout: effectiveTimeout,
          );
        },
      );
    } catch (e) {
      if (e is QuickRTCTimeoutException) rethrow;
      throw QuickRTCSocketException('Failed to emit "$event"',
          event: event, cause: e);
    }
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
  /// [socketTimeout] - Timeout for socket operations (default: 30 seconds)
  /// [operationTimeout] - Timeout for producer/consumer operations (default: 30 seconds)
  QuickRTCController({
    required io.Socket socket,
    bool debug = false,
    int maxParticipants = 0,
    Duration socketTimeout = const Duration(seconds: 30),
    Duration operationTimeout = const Duration(seconds: 30),
  })  : _socket = socket,
        _ownsSocket = false,
        _debug = debug,
        _maxParticipants = maxParticipants,
        _socketTimeout = socketTimeout,
        _operationTimeout = operationTimeout;

  /// Private constructor for internal use (when socket is created internally)
  QuickRTCController._internal({
    required io.Socket socket,
    required bool ownsSocket,
    bool debug = false,
    int maxParticipants = 0,
    Duration socketTimeout = const Duration(seconds: 30),
    Duration operationTimeout = const Duration(seconds: 30),
  })  : _socket = socket,
        _ownsSocket = ownsSocket,
        _debug = debug,
        _maxParticipants = maxParticipants,
        _socketTimeout = socketTimeout,
        _operationTimeout = operationTimeout;

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /// Connect to server and optionally join a conference
  ///
  /// This is the recommended way to create a QuickRTCController.
  /// It handles socket connection and optionally joins a conference.
  ///
  /// Example:
  /// ```dart
  /// // Connect and join immediately
  /// final controller = await QuickRTCController.connect(
  ///   serverUrl: 'https://your-server.com',
  ///   conferenceId: 'room-123',
  ///   participantName: 'Alice',
  /// );
  ///
  /// // Or connect without joining (join later)
  /// final controller = await QuickRTCController.connect(
  ///   serverUrl: 'https://your-server.com',
  /// );
  /// await controller.joinMeeting(conferenceId: '...', participantName: '...');
  /// ```
  static Future<QuickRTCController> connect({
    required String serverUrl,
    String? conferenceId,
    String? participantName,
    String? conferenceName,
    String? participantId,
    Map<String, dynamic>? participantInfo,
    bool debug = false,
    int maxParticipants = 0,
    Duration connectionTimeout = const Duration(seconds: 10),
    Duration socketTimeout = const Duration(seconds: 30),
    Duration operationTimeout = const Duration(seconds: 30),
    Map<String, String>? extraHeaders,
    Map<String, dynamic>? query,
  }) async {
    // Connect socket
    final socket = await QuickRTCSocket.connect(
      serverUrl,
      timeout: connectionTimeout,
      extraHeaders: extraHeaders,
      query: query,
    );

    // Create controller (owns the socket)
    final controller = QuickRTCController._internal(
      socket: socket,
      ownsSocket: true,
      debug: debug,
      maxParticipants: maxParticipants,
      socketTimeout: socketTimeout,
      operationTimeout: operationTimeout,
    );

    // Optionally join meeting
    if (conferenceId != null && participantName != null) {
      try {
        await controller.joinMeeting(
          conferenceId: conferenceId,
          participantName: participantName,
          conferenceName: conferenceName,
          participantId: participantId,
          participantInfo: participantInfo,
        );
      } catch (e) {
        // Cleanup on failure
        controller.dispose();
        rethrow;
      }
    }

    return controller;
  }

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

      updateState(
        _state.copyWith(
          status: ConnectionStatus.connected,
          conferenceId: conferenceId,
          participantId: effectiveParticipantId,
          participantName: participantName,
          clearError: true,
        ),
      );

      await consumeExistingParticipants();
    } catch (error) {
      log('Failed to join meeting', error);
      updateState(
        _state.copyWith(
          status: ConnectionStatus.disconnected,
          error: 'Failed to join meeting: $error',
        ),
      );
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
    return 'p-${DateTime.now().millisecondsSinceEpoch}-${_randomString(12)}';
  }

  /// Generate a cryptographically secure random string
  String _randomString(int length) {
    const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return List.generate(
      length,
      (index) => chars[_secureRandom.nextInt(chars.length)],
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

    // Complete all pending completers with errors to prevent hanging futures
    _completePendingWithError();

    // Synchronously cleanup if still connected
    // We use a non-awaited call since dispose() is synchronous
    if (_state.isConnected) {
      // Fire and forget - we can't await in dispose
      _disposeCleanup();
    }

    // Disconnect socket if we own it
    if (_ownsSocket) {
      _socket.disconnect();
      _socket.dispose();
    }

    // Clear state before disposing to prevent socket handlers from triggering
    _state = const QuickRTCState();
    super.dispose();
  }

  /// Complete all pending completers with disposed exception
  void _completePendingWithError() {
    final disposedException = QuickRTCDisposedException();

    // Complete pending producers
    for (final completer in _pendingProducers.values) {
      if (!completer.isCompleted) {
        completer.completeError(disposedException);
      }
    }
    _pendingProducers.clear();

    // Complete pending consumers
    for (final completer in _pendingConsumers.values) {
      if (!completer.isCompleted) {
        completer.completeError(disposedException);
      }
    }
    _pendingConsumers.clear();
  }

  /// Async cleanup for dispose (fire and forget)
  Future<void> _disposeCleanup() async {
    try {
      await leaveMeeting();
    } catch (e) {
      // Ignore errors during dispose cleanup
      log('Dispose cleanup error (ignored)', e);
    }
  }
}
