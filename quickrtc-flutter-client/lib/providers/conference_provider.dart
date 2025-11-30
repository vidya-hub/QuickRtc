import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:logger/logger.dart';
import 'package:quickrtc_flutter_client/models/conference_config.dart';
import 'package:quickrtc_flutter_client/models/conference_state.dart';
import 'package:quickrtc_flutter_client/models/local_stream_info.dart';
import 'package:quickrtc_flutter_client/models/remote_participant.dart';
import 'package:quickrtc_flutter_client/services/device_service.dart';
import 'package:quickrtc_flutter_client/services/socket_service.dart';
import 'package:quickrtc_flutter_client/services/stream_service.dart';

/// Provider for managing conference state
class ConferenceProvider extends ChangeNotifier {
  final Logger _logger = Logger();

  // Services
  final DeviceService _deviceService = DeviceService();
  final SocketService _socketService = SocketService();
  final StreamService _streamService = StreamService();

  // State
  ConferenceState _state = const ConferenceState();

  // Getters
  ConferenceState get state => _state;
  bool get isJoined => _state.isJoined;
  bool get isConnecting => _state.isConnecting;
  List<LocalStreamInfo> get localStreams => _state.localStreams;
  List<RemoteParticipant> get remoteParticipants => _state.remoteParticipants;
  String? get error => _state.error;

  // Convenience getters
  bool get hasLocalAudio => _state.localStreams
      .any((s) => s.type == LocalStreamType.audio && s.enabled);
  bool get hasLocalVideo => _state.localStreams
      .any((s) => s.type == LocalStreamType.video && s.enabled);
  bool get hasLocalScreenShare =>
      _state.localStreams.any((s) => s.type == LocalStreamType.screenshare);

  ConferenceProvider() {
    _setupSocketListeners();
  }

  /// Setup socket event listeners (replaces eventMiddleware)
  void _setupSocketListeners() {
    _socketService.onParticipantJoined.listen((data) async {
      _logger.d('Participant joined: ${data['participantId']}');

      // Auto-consume new participant
      try {
        await consumeParticipant(
          participantId: data['participantId'] as String,
          participantName: data['participantName'] as String,
        );
      } catch (e) {
        _logger.e('Failed to auto-consume participant: $e');
      }
    });

    _socketService.onParticipantLeft.listen((data) {
      _logger.d('Participant left: ${data['participantId']}');
      _removeRemoteParticipant(data['participantId'] as String);
      notifyListeners();
    });

    _socketService.onNewProducer.listen((data) async {
      _logger.d('New producer: ${data['producerId']}');

      // Auto-consume new producer
      final participantId = data['participantId'] as String;
      try {
        await consumeParticipant(
          participantId: participantId,
          participantName: data['participantName'] as String,
        );
      } catch (e) {
        _logger.e('Failed to auto-consume new producer: $e');
      }
    });

    _socketService.onProducerClosed.listen((data) {
      _logger.d('Producer closed: ${data['producerId']}');
      // Handle producer closed
      notifyListeners();
    });

    _socketService.onConsumerClosed.listen((data) {
      _logger.d('Consumer closed: ${data['consumerId']}');
      // Handle consumer closed
      notifyListeners();
    });
  }

  /// Join conference
  Future<void> joinConference(ConferenceConfig config) async {
    _logger.i('Joining conference: ${config.conferenceId}');

    _updateState(_state.copyWith(isConnecting: true, error: null));

    try {
      // Initialize socket service
      _socketService.setSocket(
        config.socket,
        config.conferenceId,
        config.participantId,
      );

      // Join conference on server
      final joinResponse = await _socketService.joinConference(
        conferenceId: config.conferenceId,
        participantId: config.participantId,
        participantName: config.participantName,
      );

      // Load device with router capabilities
      final routerRtpCapabilities =
          joinResponse['routerRtpCapabilities'] as Map<String, dynamic>;
      final device = await _deviceService.loadDevice(routerRtpCapabilities);

      // Create send and receive transports
      await _socketService.createTransports();

      // Create send transport (peer connection for sending)
      final sendTransport = await createPeerConnection({
        'iceServers': [],
        'sdpSemantics': 'unified-plan',
      });

      // Create receive transport (peer connection for receiving)
      final recvTransport = await createPeerConnection({
        'iceServers': [],
        'sdpSemantics': 'unified-plan',
      });

      // Setup transport handlers
      _setupTransportHandlers(sendTransport, 'producer');
      _setupTransportHandlers(recvTransport, 'consumer');

      _updateState(_state.copyWith(
        isJoined: true,
        isConnecting: false,
        config: config,
        device: device,
        sendTransport: sendTransport,
        recvTransport: recvTransport,
      ));

      _logger.i('Successfully joined conference');
    } catch (e) {
      _logger.e('Failed to join conference: $e');
      _updateState(_state.copyWith(
        isConnecting: false,
        error: e.toString(),
      ));
      rethrow;
    }
  }

  /// Setup transport event handlers
  void _setupTransportHandlers(RTCPeerConnection transport, String direction) {
    transport.onIceCandidate = (candidate) {
      _logger.d('ICE candidate for $direction: $candidate');
    };

    transport.onIceConnectionState = (state) {
      _logger.d('ICE connection state for $direction: $state');
    };

    transport.onConnectionState = (state) {
      _logger.d('Connection state for $direction: $state');
      if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
        _logger.i('Transport connected: $direction');
      }
    };
  }

  /// Produce media
  Future<Map<String, String?>> produceMedia({
    MediaStreamTrack? audioTrack,
    MediaStreamTrack? videoTrack,
  }) async {
    if (_state.sendTransport == null) {
      throw Exception('Send transport not initialized');
    }

    _logger.i('Producing media');

    try {
      final result = await _streamService.produceMedia(
        sendTransport: _state.sendTransport as RTCPeerConnection,
        options: ProduceMediaOptions(
          audioTrack: audioTrack,
          videoTrack: videoTrack,
        ),
        onProduce: (kind, rtpParameters) async {
          return await _socketService.produce(
            kind: kind,
            rtpParameters: rtpParameters,
          );
        },
      );

      // Create local stream infos
      final List<LocalStreamInfo> newStreams = [];

      if (result.audioStreamId != null && audioTrack != null) {
        final audioStream = await _streamService.createLocalStreamInfo(
          streamId: result.audioStreamId!,
          type: LocalStreamType.audio,
          track: audioTrack,
          producer: null, // Will be set by actual producer
        );
        newStreams.add(audioStream);
      }

      if (result.videoStreamId != null && videoTrack != null) {
        final videoStream = await _streamService.createLocalStreamInfo(
          streamId: result.videoStreamId!,
          type: LocalStreamType.video,
          track: videoTrack,
          producer: null, // Will be set by actual producer
        );
        newStreams.add(videoStream);
      }

      _updateState(_state.copyWith(
        localStreams: [..._state.localStreams, ...newStreams],
      ));

      _logger.i('Media produced successfully');

      return {
        'audioStreamId': result.audioStreamId,
        'videoStreamId': result.videoStreamId,
      };
    } catch (e) {
      _logger.e('Failed to produce media: $e');
      _updateState(_state.copyWith(error: e.toString()));
      rethrow;
    }
  }

  /// Consume existing streams from all participants
  Future<void> consumeExistingStreams() async {
    _logger.i('Consuming existing streams');

    try {
      final participants = await _socketService.getParticipants();

      for (final participant in participants) {
        // Don't consume own streams
        if (participant.participantId == _state.config?.participantId) {
          continue;
        }

        await consumeParticipant(
          participantId: participant.participantId,
          participantName: participant.participantName,
        );
      }

      _logger.i(
          'Consumed existing streams from ${participants.length} participants');
    } catch (e) {
      _logger.e('Failed to consume existing streams: $e');
      _updateState(_state.copyWith(error: e.toString()));
      rethrow;
    }
  }

  /// Consume participant media
  Future<void> consumeParticipant({
    required String participantId,
    required String participantName,
  }) async {
    if (_state.recvTransport == null) {
      throw Exception('Receive transport not initialized');
    }

    _logger.i('Consuming participant: $participantId');

    try {
      final rtpCapabilities = _deviceService.getRtpCapabilities();
      if (rtpCapabilities == null) {
        throw Exception('Device not loaded');
      }

      final consumerParams = await _socketService.consumeParticipantMedia(
        targetParticipantId: participantId,
        rtpCapabilities: rtpCapabilities,
      );

      if (consumerParams.isEmpty) {
        _logger.w('No media to consume from participant: $participantId');
        return;
      }

      // Resume all consumers
      for (final params in consumerParams) {
        await _socketService.resumeConsumer(params.id);
      }

      final participant = await _streamService.consumeParticipant(
        recvTransport: _state.recvTransport as RTCPeerConnection,
        participantId: participantId,
        participantName: participantName,
        consumerParams: consumerParams
            .map((e) => {
                  'id': e.id,
                  'producerId': e.producerId,
                  'kind': e.kind,
                  'rtpParameters': e.rtpParameters,
                })
            .toList(),
      );

      // Add or update participant in state
      _addOrUpdateRemoteParticipant(participant);

      _logger.i('Successfully consumed participant: $participantId');
    } catch (e) {
      _logger.e('Failed to consume participant: $e');
      _updateState(_state.copyWith(error: e.toString()));
      rethrow;
    }
  }

  /// Stop local stream
  Future<void> stopLocalStream(String streamId) async {
    _logger.i('Stopping local stream: $streamId');

    try {
      final streamInfo = _state.localStreams.firstWhere(
        (s) => s.id == streamId,
        orElse: () => throw Exception('Stream not found: $streamId'),
      );

      await _streamService.stopLocalStream(streamInfo);
      await _socketService.closeProducer(streamId);

      _updateState(_state.copyWith(
        localStreams:
            _state.localStreams.where((s) => s.id != streamId).toList(),
      ));

      _logger.i('Local stream stopped: $streamId');
    } catch (e) {
      _logger.e('Failed to stop local stream: $e');
      _updateState(_state.copyWith(error: e.toString()));
      rethrow;
    }
  }

  /// Stop watching participant
  Future<void> stopWatchingParticipant(String participantId) async {
    _logger.i('Stop watching participant: $participantId');

    try {
      final participant = _state.remoteParticipants.firstWhere(
        (p) => p.participantId == participantId,
        orElse: () => throw Exception('Participant not found: $participantId'),
      );

      await _streamService.stopConsumingParticipant(participant);

      _removeRemoteParticipant(participantId);

      _logger.i('Stopped watching participant: $participantId');
    } catch (e) {
      _logger.e('Failed to stop watching participant: $e');
      _updateState(_state.copyWith(error: e.toString()));
      rethrow;
    }
  }

  /// Toggle audio
  Future<void> toggleAudio() async {
    final audioStream = _state.localStreams.firstWhere(
      (s) => s.type == LocalStreamType.audio,
      orElse: () => throw Exception('No audio stream found'),
    );

    final newEnabled = !audioStream.enabled;
    audioStream.track.enabled = newEnabled;

    final updatedStreams = _state.localStreams.map((s) {
      if (s.id == audioStream.id) {
        return LocalStreamInfo(
          id: s.id,
          type: s.type,
          track: s.track,
          stream: s.stream,
          enabled: newEnabled,
          producer: s.producer,
        );
      }
      return s;
    }).toList();

    _updateState(_state.copyWith(localStreams: updatedStreams));
    _logger.i('Audio toggled: $newEnabled');
  }

  /// Toggle video
  Future<void> toggleVideo() async {
    final videoStream = _state.localStreams.firstWhere(
      (s) => s.type == LocalStreamType.video,
      orElse: () => throw Exception('No video stream found'),
    );

    final newEnabled = !videoStream.enabled;
    videoStream.track.enabled = newEnabled;

    final updatedStreams = _state.localStreams.map((s) {
      if (s.id == videoStream.id) {
        return LocalStreamInfo(
          id: s.id,
          type: s.type,
          track: s.track,
          stream: s.stream,
          enabled: newEnabled,
          producer: s.producer,
        );
      }
      return s;
    }).toList();

    _updateState(_state.copyWith(localStreams: updatedStreams));
    _logger.i('Video toggled: $newEnabled');
  }

  /// Leave conference
  Future<void> leaveConference() async {
    _logger.i('Leaving conference');

    try {
      // Stop all local streams
      for (final stream in _state.localStreams) {
        await _streamService.stopLocalStream(stream);
        await _socketService.closeProducer(stream.id);
      }

      // Stop all remote participants
      for (final participant in _state.remoteParticipants) {
        await _streamService.stopConsumingParticipant(participant);
      }

      // Close transports
      if (_state.sendTransport != null) {
        await (_state.sendTransport as RTCPeerConnection).close();
      }
      if (_state.recvTransport != null) {
        await (_state.recvTransport as RTCPeerConnection).close();
      }

      // Notify server
      await _socketService.leaveConference();

      // Reset services
      await _deviceService.reset();
      await _socketService.reset();
      await _streamService.reset();

      // Clear state
      _updateState(const ConferenceState());

      _logger.i('Left conference successfully');
    } catch (e) {
      _logger.e('Failed to leave conference: $e');
      _updateState(_state.copyWith(error: e.toString()));
      rethrow;
    }
  }

  /// Add or update remote participant
  void _addOrUpdateRemoteParticipant(RemoteParticipant participant) {
    final existingIndex = _state.remoteParticipants
        .indexWhere((p) => p.participantId == participant.participantId);

    List<RemoteParticipant> updatedParticipants;
    if (existingIndex >= 0) {
      updatedParticipants = List.from(_state.remoteParticipants);
      updatedParticipants[existingIndex] = participant;
    } else {
      updatedParticipants = [..._state.remoteParticipants, participant];
    }

    _updateState(_state.copyWith(remoteParticipants: updatedParticipants));
  }

  /// Remove remote participant
  void _removeRemoteParticipant(String participantId) {
    final updatedParticipants = _state.remoteParticipants
        .where((p) => p.participantId != participantId)
        .toList();

    _updateState(_state.copyWith(remoteParticipants: updatedParticipants));
  }

  /// Update state and notify listeners
  void _updateState(ConferenceState newState) {
    _state = newState;
    notifyListeners();
  }

  /// Clear error
  void clearError() {
    _updateState(_state.copyWith(error: null));
  }

  @override
  void dispose() {
    _socketService.dispose();
    super.dispose();
  }
}
