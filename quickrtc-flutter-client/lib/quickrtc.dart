import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:logger/logger.dart' as app_logger;
import 'package:quickrtc_flutter_client/src/mediasoup/mediasoup.dart';
import 'package:quickrtc_flutter_client/platform/quickrtc_platform.dart';

import 'package:quickrtc_flutter_client/types.dart';

/// QuickRTC - Simple WebRTC conferencing client for Flutter
///
/// Example:
/// ```dart
/// final socket = io.io('https://your-server.com');
/// final rtc = QuickRTC(QuickRTCConfig(socket: socket));
///
/// // Listen for events
/// rtc.on<NewParticipantEvent>('newParticipant', (event) {
///   print('${event.participantName} joined with ${event.streams.length} streams');
/// });
///
/// rtc.on<StreamRemovedEvent>('streamRemoved', (event) {
///   // Remove stream from UI
/// });
///
/// // Join a conference
/// await rtc.join(JoinConfig(
///   conferenceId: 'room-123',
///   participantName: 'Alice',
/// ));
///
/// // Produce media
/// final stream = await navigator.mediaDevices.getUserMedia({'audio': true, 'video': true});
/// final localStreams = await rtc.produce(ProduceInput.fromTracks(stream.getTracks()));
///
/// // Leave
/// await rtc.leave();
/// ```
class QuickRTC {
  // Configuration
  final QuickRTCConfig _config;
  final app_logger.Logger _logger = app_logger.Logger();

  // Mediasoup
  Device? _device;
  Transport? _sendTransport;
  Transport? _recvTransport;

  // State
  bool _isConnected = false;
  String? _conferenceId;
  String? _participantId;
  String? _participantName;
  final Map<String, Participant> _participants = {};
  final Set<String> _consumedProducerIds = {};

  // Producers and Consumers
  final Map<String, ProducerInfo> _producers = {};
  final Map<String, ConsumerInfo> _consumers = {};

  // Pending completers for callback-based API
  final Map<String, Completer<Producer>> _pendingProducers = {};
  final Map<String, Completer<Consumer>> _pendingConsumers = {};

  // Event handlers
  final Map<String, Set<Function>> _eventHandlers = {};

  QuickRTC(this._config);

  // ========================================================================
  // LOGGING
  // ========================================================================

  void _log(String message, [dynamic data]) {
    if (_config.debug) {
      if (data != null) {
        _logger.d('[QuickRTC] $message: $data');
      } else {
        _logger.d('[QuickRTC] $message');
      }
    }
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  /// Whether connected to a conference
  bool get isConnected => _isConnected;

  /// Current conference ID
  String? get conferenceId => _conferenceId;

  /// Current participant ID
  String? get participantId => _participantId;

  /// Current participant name
  String? get participantName => _participantName;

  /// Map of local streams
  Map<String, LocalStream> get localStreams {
    final streams = <String, LocalStream>{};
    for (final entry in _producers.entries) {
      streams[entry.key] = _createLocalStreamHandle(entry.value);
    }
    return streams;
  }

  /// Map of remote participants
  Map<String, Participant> get participants => Map.unmodifiable(_participants);

  /// Map of remote streams
  Map<String, RemoteStream> get remoteStreams {
    final streams = <String, RemoteStream>{};
    for (final entry in _consumers.entries) {
      final info = entry.value;
      streams[entry.key] = RemoteStream(
        id: info.id,
        type: info.type,
        stream: info.stream,
        producerId: info.producerId,
        participantId: info.participantId,
        participantName: info.participantName,
      );
    }
    return streams;
  }

  // ========================================================================
  // CONNECTION
  // ========================================================================

  /// Join a conference
  Future<void> join(JoinConfig config) async {
    if (_isConnected) {
      throw Exception('Already connected to a conference');
    }

    _log('Joining conference', config.conferenceId);

    // Generate participant ID if not provided
    final participantId = config.participantId ?? _generateParticipantId();

    try {
      // Setup socket event listeners
      _setupSocketListeners();

      // Join conference and get router capabilities
      final response = await _emitWithAck('joinConference', {
        'data': {
          'conferenceId': config.conferenceId,
          'conferenceName': config.conferenceName,
          'participantId': participantId,
          'participantName': config.participantName,
          'participantInfo': config.participantInfo,
        },
      });

      if (response['status'] != 'ok') {
        throw Exception(response['error'] ?? 'Failed to join conference');
      }

      final data = response['data'] as Map<String, dynamic>;
      final routerCapabilities =
          data['routerCapabilities'] as Map<String, dynamic>;

      // Create and load device
      _device = Device();
      await _device!.load(
        routerRtpCapabilities: RtpCapabilities.fromMap(routerCapabilities),
      );

      _log('Device loaded');

      // Update state BEFORE creating transports (they need conferenceId/participantId)
      _conferenceId = config.conferenceId;
      _participantId = participantId;
      _participantName = config.participantName;

      // Create transports
      await _createTransports();

      // Mark as connected
      _isConnected = true;

      _log('Successfully joined conference');

      // Emit connected event
      _emit(
        'connected',
        ConnectedEvent(
          conferenceId: config.conferenceId,
          participantId: participantId,
        ),
      );

      // Auto-consume existing participants
      await _consumeExistingParticipants();
    } catch (error) {
      _log('Failed to join conference', error);
      _emit(
          'error',
          ErrorEvent(
            message: 'Failed to join conference',
            error: error,
          ));
      rethrow;
    }
  }

  /// Create send and receive transports
  Future<void> _createTransports() async {
    _log('Creating transports');

    // Create send transport
    final sendResponse = await _emitWithAck('createTransport', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'direction': 'producer',
    });

    if (sendResponse['status'] != 'ok') {
      throw Exception(
        sendResponse['error'] ?? 'Failed to create send transport',
      );
    }

    final sendData = TransportOptionsData.fromJson(
      sendResponse['data'] as Map<String, dynamic>,
    );

    _sendTransport = _device!.createSendTransportFromMap(
      {
        'id': sendData.id,
        'iceParameters': sendData.iceParameters,
        'iceCandidates': sendData.iceCandidates,
        'dtlsParameters': sendData.dtlsParameters,
        'sctpParameters': sendData.sctpParameters,
      },
      producerCallback: _onProducerCallback,
    );

    _setupSendTransportHandlers();

    // Create receive transport
    final recvResponse = await _emitWithAck('createTransport', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'direction': 'consumer',
    });

    if (recvResponse['status'] != 'ok') {
      throw Exception(
        recvResponse['error'] ?? 'Failed to create receive transport',
      );
    }

    final recvData = TransportOptionsData.fromJson(
      recvResponse['data'] as Map<String, dynamic>,
    );

    _recvTransport = _device!.createRecvTransportFromMap(
      {
        'id': recvData.id,
        'iceParameters': recvData.iceParameters,
        'iceCandidates': recvData.iceCandidates,
        'dtlsParameters': recvData.dtlsParameters,
        'sctpParameters': recvData.sctpParameters,
      },
      consumerCallback: _onConsumerCallback,
    );

    _setupRecvTransportHandlers();

    _log('Transports created');
  }

  void _onProducerCallback(Producer producer) {
    _log('Producer callback received', producer.id);

    // Complete any pending producer request
    // The producer ID is the same as the one we get from server in 'produce' event callback
    final pendingKey = _pendingProducers.keys.firstWhere(
      (key) => !_pendingProducers[key]!.isCompleted,
      orElse: () => '',
    );

    if (pendingKey.isNotEmpty) {
      _pendingProducers[pendingKey]!.complete(producer);
    }
  }

  void _onConsumerCallback(Consumer consumer, [dynamic accept]) {
    _log('Consumer callback received', consumer.id);

    // Accept the consumer
    if (accept != null) {
      accept({});
    }

    // Complete the pending consumer request for this consumer ID
    final completer = _pendingConsumers.remove(consumer.id);
    if (completer != null && !completer.isCompleted) {
      completer.complete(consumer);
    }
  }

  void _setupSendTransportHandlers() {
    _sendTransport!.on('connect', (Map data) async {
      _log('Send transport connect');
      try {
        final response = await _emitWithAck('connectTransport', {
          'conferenceId': _conferenceId,
          'participantId': _participantId,
          'direction': 'producer',
          'dtlsParameters': data['dtlsParameters'].toMap(),
        });

        if (response['status'] == 'ok') {
          data['callback']();
        } else {
          data['errback'](Exception(response['error']));
        }
      } catch (e) {
        data['errback'](e);
      }
    });

    _sendTransport!.on('produce', (Map data) async {
      _log('Send transport produce', data['kind']);
      try {
        final appData = data['appData'] as Map<String, dynamic>? ?? {};
        final streamType = appData['streamType'] as String?;

        final response = await _emitWithAck('produce', {
          'conferenceId': _conferenceId,
          'participantId': _participantId,
          'transportId': _sendTransport!.id,
          'kind': data['kind'],
          'rtpParameters': data['rtpParameters'].toMap(),
          'appData': appData,
          'streamType': streamType, // Send streamType as top-level param
        });

        if (response['status'] == 'ok') {
          final producerId = response['data']['producerId'] as String;
          data['callback'](producerId);
        } else {
          data['errback'](Exception(response['error']));
        }
      } catch (e) {
        data['errback'](e);
      }
    });
  }

  void _setupRecvTransportHandlers() {
    _recvTransport!.on('connect', (Map data) async {
      _log('Recv transport connect');
      try {
        final response = await _emitWithAck('connectTransport', {
          'conferenceId': _conferenceId,
          'participantId': _participantId,
          'direction': 'consumer',
          'dtlsParameters': data['dtlsParameters'].toMap(),
        });

        if (response['status'] == 'ok') {
          data['callback']();
        } else {
          data['errback'](Exception(response['error']));
        }
      } catch (e) {
        data['errback'](e);
      }
    });
  }

  /// Auto-consume all existing participants in the conference
  Future<void> _consumeExistingParticipants() async {
    _log('Fetching and consuming existing participants...');

    try {
      final response = await _emitWithAck('getParticipants', {
        'conferenceId': _conferenceId,
      });

      if (response['status'] != 'ok') {
        _log('Failed to get participants', response['error']);
        return;
      }

      final participantsList = response['data'] as List<dynamic>;

      for (final p in participantsList) {
        final pData = p as Map<String, dynamic>;
        final pId = pData['participantId'] as String;
        final pName = pData['participantName'] as String;
        final pInfo = pData['participantInfo'] as Map<String, dynamic>? ?? {};

        // Skip self
        if (pId == _participantId) continue;

        // Store participant
        final participant = Participant(id: pId, name: pName, info: pInfo);
        _participants[pId] = participant;

        // Consume their streams (may be empty)
        final streams = await _consumeParticipantInternal(pId, pName, pInfo);

        _log('Existing participant: $pName with ${streams.length} streams');

        // Always emit newParticipant (even with empty streams)
        _emit(
          'newParticipant',
          NewParticipantEvent(
            participantId: pId,
            participantName: pName,
            participantInfo: pInfo,
            streams: streams,
          ),
        );
      }
    } catch (error) {
      _log('Error consuming existing participants', error);
      // Don't throw - this shouldn't break the join flow
    }
  }

  /// Leave the conference
  Future<void> leave() async {
    if (!_isConnected) {
      return;
    }

    _log('Leaving conference');

    try {
      // Close all producers (Producer.close() returns void)
      for (final producer in _producers.values) {
        producer.producer.close();
      }
      _producers.clear();

      // Close all consumers (Consumer.close() returns Future<void>)
      for (final consumer in _consumers.values) {
        await consumer.consumer.close();
      }
      _consumers.clear();

      // Close transports
      _sendTransport?.close();
      _recvTransport?.close();

      // Leave conference on server
      await _emitWithAck('leaveConference', {
        'conferenceId': _conferenceId,
        'participantId': _participantId,
      });
    } catch (error) {
      _log('Error during leave', error);
    } finally {
      // Cleanup
      _cleanup();
      _emit('disconnected', const DisconnectedEvent(reason: 'user_left'));
    }
  }

  /// Cleanup all resources
  void _cleanup() {
    // Remove socket listeners
    _config.socket.off('participantJoined');
    _config.socket.off('participantLeft');
    _config.socket.off('newProducer');
    _config.socket.off('producerClosed');
    _config.socket.off('disconnect');

    // Reset state
    _isConnected = false;
    _conferenceId = null;
    _participantId = null;
    _participantName = null;
    _participants.clear();
    _consumedProducerIds.clear();
    _device = null;
    _sendTransport = null;
    _recvTransport = null;
  }

  // ========================================================================
  // PRODUCING
  // ========================================================================

  /// Produce media tracks
  ///
  /// Accepts:
  /// - Single track: `produce(ProduceInput.fromTrack(track))`
  /// - Array of tracks: `produce(ProduceInput.fromTracks([audioTrack, videoTrack]))`
  /// - Track with type hint: `produce(ProduceInput.fromTrack(screenTrack, type: StreamType.screenshare))`
  ///
  /// Returns array of LocalStream handles with pause/resume/stop methods
  Future<List<LocalStream>> produce(ProduceInput input) async {
    if (!_isConnected) {
      throw Exception('Not connected to a conference');
    }

    final tracksWithTypes = input.toTrackList();
    _log('Producing tracks', tracksWithTypes.length);

    final results = <LocalStream>[];

    for (final trackWithType in tracksWithTypes) {
      final track = trackWithType.track;
      final streamType = trackWithType.type ?? _inferStreamType(track);

      _log('Producing track', '${track.kind} as ${streamType.value}');

      // Create MediaStream for the track
      final stream = await createLocalMediaStream('quickrtc_${track.id}');
      stream.addTrack(track);

      // Create a completer and unique key for this produce request
      final produceKey =
          'produce_${DateTime.now().millisecondsSinceEpoch}_${track.id}';
      final completer = Completer<Producer>();
      _pendingProducers[produceKey] = completer;

      // Start produce (returns void, producer comes via callback)
      _sendTransport!.produce(
        track: track,
        stream: stream,
        appData: {'streamType': streamType.value},
        source:
            streamType == StreamType.screenshare ? 'screenshare' : track.kind!,
      );

      // Wait for the producer via callback
      final producer = await completer.future;
      _pendingProducers.remove(produceKey);

      // Store producer info
      final producerInfo = ProducerInfo(
        id: producer.id,
        type: streamType,
        track: track,
        producer: producer,
        stream: stream,
        paused: producer.paused,
      );

      _producers[producer.id] = producerInfo;

      // Handle native track ended (e.g., browser "Stop sharing" button)
      track.onEnded = () async {
        _log('Track ended externally: ${producer.id} (${streamType.value})');

        // Only cleanup if we still have this producer
        if (_producers.containsKey(producer.id)) {
          await stop(producer.id);

          // Emit event so app can update its state
          _emit(
            'localStreamEnded',
            LocalStreamEndedEvent(
              streamId: producer.id,
              type: streamType,
            ),
          );
        }
      };

      results.add(_createLocalStreamHandle(producerInfo));
    }

    return results;
  }

  /// Infer stream type from track kind
  StreamType _inferStreamType(MediaStreamTrack track) {
    return track.kind == 'audio' ? StreamType.audio : StreamType.video;
  }

  /// Create LocalStream handle from ProducerInfo
  LocalStream _createLocalStreamHandle(ProducerInfo info) {
    return LocalStream(
      id: info.id,
      type: info.type,
      stream: info.stream,
      track: info.track,
      paused: info.paused,
      producer: info.producer,
      onPause: pause,
      onResume: resume,
      onStop: stop,
    );
  }

  /// Pause a local stream
  Future<void> pause(String streamId) async {
    _log('Pausing stream', streamId);

    final producerInfo = _producers[streamId];
    if (producerInfo == null) {
      throw Exception('Producer not found: $streamId');
    }

    producerInfo.producer.pause();
    producerInfo.paused = true;

    await _emitWithAck('pauseProducer', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'producerId': streamId,
    });
  }

  /// Resume a local stream
  Future<void> resume(String streamId) async {
    _log('Resuming stream', streamId);

    final producerInfo = _producers[streamId];
    if (producerInfo == null) {
      throw Exception('Producer not found: $streamId');
    }

    producerInfo.producer.resume();
    producerInfo.paused = false;

    await _emitWithAck('unpauseProducer', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'producerId': streamId,
    });
  }

  /// Stop a local stream
  Future<void> stop(String streamId) async {
    _log('Stopping stream', streamId);

    final producerInfo = _producers.remove(streamId);
    if (producerInfo == null) {
      return;
    }

    producerInfo.producer.close();
    producerInfo.track.stop();

    await _emitWithAck('closeProducer', {
      'conferenceId': _conferenceId,
      'participantId': _participantId,
      'extraData': {
        'producerId': streamId,
      },
    });
  }

  // ========================================================================
  // LOCAL MEDIA
  // ========================================================================

  /// Get local media (camera, microphone, screen share)
  ///
  /// This is a static method that can be called without joining a conference.
  /// Use it to preview media before joining or to manage media independently.
  ///
  /// Example:
  /// ```dart
  /// // Get audio and video
  /// final media = await QuickRTC.getLocalMedia(MediaConfig.audioVideo());
  ///
  /// // Get screen share only
  /// final screen = await QuickRTC.getLocalMedia(MediaConfig.screenShareOnly());
  ///
  /// // Get with custom config
  /// final media = await QuickRTC.getLocalMedia(MediaConfig(
  ///   audio: true,
  ///   video: true,
  ///   audioConfig: AudioConfig(echoCancellation: true),
  ///   videoConfig: VideoConfig.hd,
  /// ));
  ///
  /// // Later, produce the media
  /// final streams = await rtc.produce(ProduceInput.fromTracksWithTypes(media.tracksWithTypes));
  /// ```
  static Future<LocalMedia> getLocalMedia(MediaConfig config) async {
    MediaStream? cameraStream;
    MediaStream? screenStream;
    MediaStreamTrack? audioTrack;
    MediaStreamTrack? videoTrack;
    MediaStreamTrack? screenshareTrack;
    MediaStreamTrack? screenshareAudioTrack;
    final capturedTypes = <MediaType>{};

    try {
      // Get camera/microphone media
      if (config.audio || config.video) {
        final constraints = <String, dynamic>{};

        if (config.audio) {
          constraints['audio'] = config.audioConfig?.toConstraints() ?? true;
        }

        if (config.video) {
          constraints['video'] = config.videoConfig?.toConstraints() ??
              {
                'facingMode': 'user',
                'width': 1280,
                'height': 720,
              };
        }

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (config.audio) {
          final audioTracks = cameraStream.getAudioTracks();
          if (audioTracks.isNotEmpty) {
            audioTrack = audioTracks.first;
            capturedTypes.add(MediaType.audio);
          }
        }

        if (config.video) {
          final videoTracks = cameraStream.getVideoTracks();
          if (videoTracks.isNotEmpty) {
            videoTrack = videoTracks.first;
            capturedTypes.add(MediaType.video);
          }
        }
      }

      // Get screen share media
      if (config.screenshare) {
        screenStream = await _getScreenShareStream(config.screenshareConfig);

        final videoTracks = screenStream.getVideoTracks();
        if (videoTracks.isNotEmpty) {
          screenshareTrack = videoTracks.first;
          capturedTypes.add(MediaType.screenshare);
        }

        // Check for system audio (if captured)
        final audioTracks = screenStream.getAudioTracks();
        if (audioTracks.isNotEmpty) {
          screenshareAudioTrack = audioTracks.first;
        }
      }

      // Create combined stream with all tracks
      final combinedStream =
          await createLocalMediaStream('quickrtc_local_media');
      if (audioTrack != null) combinedStream.addTrack(audioTrack);
      if (videoTrack != null) combinedStream.addTrack(videoTrack);
      // Note: screenshare tracks are kept in separate stream for better management

      return LocalMedia(
        stream: combinedStream,
        audioTrack: audioTrack,
        videoTrack: videoTrack,
        screenshareTrack: screenshareTrack,
        screenshareAudioTrack: screenshareAudioTrack,
        screenshareStream: screenStream,
        capturedTypes: capturedTypes,
      );
    } catch (e) {
      // Cleanup on error
      cameraStream?.dispose();
      screenStream?.dispose();
      rethrow;
    }
  }

  /// Get screen share stream with platform-specific handling
  static Future<MediaStream> _getScreenShareStream(
      ScreenShareConfig? config) async {
    final effectiveConfig = config ?? ScreenShareConfig.defaultConfig;

    // Build constraints based on platform
    final constraints = <String, dynamic>{
      'video': {
        ...effectiveConfig.toConstraints(),
        'cursor': 'always',
      },
    };

    // Add audio constraints for system audio capture
    if (effectiveConfig.includeSystemAudio) {
      constraints['audio'] = {
        'mandatory': {
          'chromeMediaSource': 'desktop',
        },
      };
    }

    // Platform-specific screen capture
    if (WebRTC.platformIsDesktop) {
      // Desktop platforms (macOS, Windows, Linux)
      return await _getDesktopScreenShare(effectiveConfig);
    } else if (WebRTC.platformIsWeb) {
      // Web platform
      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } else if (WebRTC.platformIsMobile) {
      // Mobile platforms (iOS, Android)
      return await _getMobileScreenShare(effectiveConfig);
    } else {
      // Fallback
      return await navigator.mediaDevices.getDisplayMedia(constraints);
    }
  }

  /// Get screen share on desktop platforms
  static Future<MediaStream> _getDesktopScreenShare(
      ScreenShareConfig config) async {
    // On desktop, we need to get sources first, then use getUserMedia
    // getDisplayMedia on desktop flutter_webrtc requires a sourceId

    // Get available sources (screens and windows)
    final sources = await desktopCapturer.getSources(
      types: config.preferWindow
          ? [SourceType.Window, SourceType.Screen]
          : [SourceType.Screen, SourceType.Window],
    );

    if (sources.isEmpty) {
      throw Exception(
          'No screen share sources available. Please grant screen recording permission in System Preferences > Privacy & Security > Screen Recording');
    }

    // Use the first screen source
    final source = sources.first;

    // On macOS/desktop, we must use getUserMedia with the sourceId
    // getDisplayMedia doesn't work the same way on desktop
    final constraints = <String, dynamic>{
      'audio': false,
      'video': {
        'mandatory': {
          'sourceId': source.id,
          'frameRate': config.frameRate ?? 30,
          'minWidth': config.width ?? 1280,
          'minHeight': config.height ?? 720,
        },
      },
    };

    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  /// Get screen share on mobile platforms
  static Future<MediaStream> _getMobileScreenShare(
      ScreenShareConfig config) async {
    // On Android 10+, we MUST start a foreground service BEFORE calling getDisplayMedia
    // This is required by the MediaProjection API
    if (!kIsWeb && Platform.isAndroid) {
      final serviceStarted = await QuickRTCPlatform.startScreenCaptureService();
      if (!serviceStarted) {
        throw Exception('Failed to start screen capture foreground service. '
            'Screen sharing requires a foreground service on Android 10+.');
      }
      // Small delay to ensure the service is fully started
      await Future.delayed(const Duration(milliseconds: 100));
    }

    try {
      // Mobile screen share using flutter_webrtc's built-in support
      // This uses ReplayKit on iOS and MediaProjection on Android
      final constraints = <String, dynamic>{
        'video': {
          ...config.toConstraints(),
        },
      };

      // On mobile, system audio capture might be available through the screen capture API
      if (config.includeSystemAudio) {
        constraints['audio'] = true;
      }

      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (e) {
      // If screen capture fails, stop the foreground service
      if (!kIsWeb && Platform.isAndroid) {
        await QuickRTCPlatform.stopScreenCaptureService();
      }
      rethrow;
    }
  }

  /// Get available screen share sources (desktop only)
  ///
  /// Returns a list of available screens and windows that can be shared.
  /// Use this to build a source picker UI.
  static Future<List<DesktopCapturerSource>> getScreenShareSources({
    bool includeScreens = true,
    bool includeWindows = true,
  }) async {
    if (!WebRTC.platformIsDesktop) {
      return [];
    }

    final types = <SourceType>[];
    if (includeScreens) types.add(SourceType.Screen);
    if (includeWindows) types.add(SourceType.Window);

    return await desktopCapturer.getSources(types: types);
  }

  /// Get screen share from a specific source (desktop only)
  ///
  /// Use with [getScreenShareSources] to let users pick their source.
  static Future<MediaStream> getScreenShareFromSource(
    DesktopCapturerSource source, {
    ScreenShareConfig? config,
  }) async {
    final effectiveConfig = config ?? ScreenShareConfig.defaultConfig;

    final constraints = <String, dynamic>{
      'video': {
        'deviceId': {'exact': source.id},
        'mandatory': {
          'frameRate': effectiveConfig.frameRate ?? 30,
        },
      },
    };

    if (effectiveConfig.width != null) {
      (constraints['video'] as Map)['mandatory']['width'] =
          effectiveConfig.width;
    }
    if (effectiveConfig.height != null) {
      (constraints['video'] as Map)['mandatory']['height'] =
          effectiveConfig.height;
    }

    if (effectiveConfig.includeSystemAudio) {
      constraints['audio'] = {
        'deviceId': {'exact': source.id},
      };
    }

    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  /// Switch camera between front and back (mobile only)
  ///
  /// Returns the new video track after switching.
  static Future<MediaStreamTrack?> switchCamera(
      MediaStreamTrack currentTrack) async {
    if (!WebRTC.platformIsMobile) {
      throw Exception('switchCamera is only available on mobile platforms');
    }

    try {
      await Helper.switchCamera(currentTrack);
      return currentTrack;
    } catch (e) {
      rethrow;
    }
  }

  /// Get available media devices
  static Future<List<MediaDeviceInfo>> getMediaDevices() async {
    return await navigator.mediaDevices.enumerateDevices();
  }

  /// Get available audio input devices (microphones)
  static Future<List<MediaDeviceInfo>> getAudioInputDevices() async {
    final devices = await getMediaDevices();
    return devices.where((d) => d.kind == 'audioinput').toList();
  }

  /// Get available video input devices (cameras)
  static Future<List<MediaDeviceInfo>> getVideoInputDevices() async {
    final devices = await getMediaDevices();
    return devices.where((d) => d.kind == 'videoinput').toList();
  }

  /// Get available audio output devices (speakers)
  static Future<List<MediaDeviceInfo>> getAudioOutputDevices() async {
    final devices = await getMediaDevices();
    return devices.where((d) => d.kind == 'audiooutput').toList();
  }

  // ========================================================================
  // CONSUMING (Internal - auto-handled)
  // ========================================================================

  /// Internal: Consume all media from a participant
  Future<List<RemoteStream>> _consumeParticipantInternal(
    String participantId,
    String participantName,
    Map<String, dynamic> participantInfo,
  ) async {
    if (!_isConnected || _recvTransport == null) {
      return [];
    }

    // Ensure participant is in our map
    if (!_participants.containsKey(participantId)) {
      _participants[participantId] = Participant(
        id: participantId,
        name: participantName,
        info: participantInfo,
      );
    }

    _log('Consuming participant', participantId);

    try {
      final response = await _emitWithAck('consumeParticipantMedia', {
        'conferenceId': _conferenceId,
        'participantId': _participantId,
        'targetParticipantId': participantId,
        'rtpCapabilities': _device!.rtpCapabilities.toMap(),
      });

      if (response['status'] != 'ok') {
        _log('Failed to consume participant', response['error']);
        return [];
      }

      final consumerParamsList = response['data'] as List<dynamic>;
      final streams = <RemoteStream>[];

      for (final params in consumerParamsList) {
        final consumerParams = ConsumerParamsData.fromJson(
          params as Map<String, dynamic>,
        );

        // Skip if we already have this producer consumed
        if (_consumedProducerIds.contains(consumerParams.producerId)) {
          _log(
            'Skipping already consumed producer: ${consumerParams.producerId}',
          );
          continue;
        }

        // Track this producer as consumed
        _consumedProducerIds.add(consumerParams.producerId);

        // Create completer for this consumer - use the consumer ID as key
        final completer = Completer<Consumer>();
        _pendingConsumers[consumerParams.id] = completer;

        // Start consume (returns void, consumer comes via callback)
        _recvTransport!.consume(
          id: consumerParams.id,
          producerId: consumerParams.producerId,
          kind: RTCRtpMediaTypeExtension.fromString(consumerParams.kind),
          rtpParameters: RtpParameters.fromMap(consumerParams.rtpParameters),
          peerId: participantId,
        );

        // Wait for the consumer via callback
        final consumer = await completer.future;

        // Resume consumer on server
        await _emitWithAck('unpauseConsumer', {
          'conferenceId': _conferenceId,
          'participantId': _participantId,
          'consumerId': consumerParams.id,
        });

        // Determine stream type
        final streamType = consumerParams.streamType ??
            (consumerParams.kind == 'audio'
                ? StreamType.audio
                : StreamType.video);

        // Log detailed track info
        final track = consumer.track;
        _log(
            'Consumer created - id: ${consumer.id}, producerId: ${consumerParams.producerId}, kind: ${consumerParams.kind}, consumerParams.streamType: ${consumerParams.streamType}, resolved streamType: ${streamType.value}');
        _log(
            'Consumer track details - trackId: ${track.id}, label: ${track.label}, kind: ${track.kind}, streamId: ${consumer.stream.id}');

        // For video streams, create a dedicated MediaStream with only this consumer's track
        // This is necessary because mediasoup-client groups all tracks from a peer
        // into a single MediaStream, which causes issues when rendering multiple video streams
        // For audio, we can use the original stream since audio doesn't have this problem
        MediaStream streamToUse;
        if (consumerParams.kind == 'video') {
          final dedicatedStream =
              await createLocalMediaStream('consumer_${consumer.id}');
          dedicatedStream.addTrack(track);
          streamToUse = dedicatedStream;
        } else {
          // For audio, use the original consumer stream
          streamToUse = consumer.stream;
        }

        // Store consumer info
        final consumerInfo = ConsumerInfo(
          id: consumer.id,
          type: streamType,
          consumer: consumer,
          stream: streamToUse,
          producerId: consumerParams.producerId,
          participantId: participantId,
          participantName: participantName,
        );

        _consumers[consumer.id] = consumerInfo;

        streams.add(RemoteStream(
          id: consumer.id,
          type: streamType,
          stream: streamToUse,
          producerId: consumerParams.producerId,
          participantId: participantId,
          participantName: participantName,
        ));
      }

      return streams;
    } catch (error) {
      _log('Error consuming participant', error);
      return [];
    }
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /// Subscribe to an event
  void on<T>(String event, void Function(T data) handler) {
    _eventHandlers.putIfAbsent(event, () => {});
    _eventHandlers[event]!.add(handler);
  }

  /// Unsubscribe from an event
  void off<T>(String event, void Function(T data) handler) {
    _eventHandlers[event]?.remove(handler);
  }

  /// Emit an event
  void _emit<T>(String event, T data) {
    _log('Event: $event', data);

    final handlers = _eventHandlers[event];
    if (handlers != null) {
      for (final handler in handlers) {
        try {
          handler(data);
        } catch (error) {
          _logger.e('Error in event handler for $event: $error');
        }
      }
    }
  }

  // ========================================================================
  // SOCKET EVENTS
  // ========================================================================

  void _setupSocketListeners() {
    final socket = _config.socket;

    // Participant joined
    socket.on('participantJoined', (data) {
      _log('Socket: participantJoined', data);

      final joinedData = ParticipantJoinedData.fromJson(
        data as Map<String, dynamic>,
      );

      // Check max participants
      if (_config.maxParticipants > 0 &&
          _participants.length >= _config.maxParticipants) {
        _log('Max participants reached, ignoring new participant');
        return;
      }

      final participant = Participant(
        id: joinedData.participantId,
        name: joinedData.participantName,
        info: joinedData.participantInfo ?? {},
      );

      _participants[joinedData.participantId] = participant;

      // Emit newParticipant immediately with empty streams
      _emit(
        'newParticipant',
        NewParticipantEvent(
          participantId: joinedData.participantId,
          participantName: joinedData.participantName,
          participantInfo: joinedData.participantInfo ?? {},
          streams: [],
        ),
      );
    });

    // Participant left
    socket.on('participantLeft', (data) async {
      _log('Socket: participantLeft', data);

      final leftData = ParticipantLeftData.fromJson(
        data as Map<String, dynamic>,
      );

      // Close all consumers for this participant and emit streamRemoved
      final consumersToRemove = _consumers.entries
          .where((e) => e.value.participantId == leftData.participantId)
          .toList();

      for (final entry in consumersToRemove) {
        final info = entry.value;

        // Remove from consumed tracking
        _consumedProducerIds.remove(info.producerId);

        _emit(
          'streamRemoved',
          StreamRemovedEvent(
            participantId: leftData.participantId,
            streamId: info.id,
            type: info.type,
          ),
        );

        await info.consumer.close();
        _consumers.remove(entry.key);
      }

      _participants.remove(leftData.participantId);

      _emit(
        'participantLeft',
        ParticipantLeftEvent(participantId: leftData.participantId),
      );
    });

    // New producer - auto-consume and emit streamAdded
    socket.on('newProducer', (data) async {
      _log('Socket: newProducer', data);

      final producerData = NewProducerData.fromJson(
        data as Map<String, dynamic>,
      );

      // Check if we already consumed this producer
      if (_consumedProducerIds.contains(producerData.producerId)) {
        _log('Already consumed producer ${producerData.producerId}, skipping');
        return;
      }

      // Check if this participant is already known
      var participant = _participants[producerData.participantId];
      final isNewParticipant = participant == null;

      if (participant == null) {
        // Edge case: participantJoined event missed or arrived late
        participant = Participant(
          id: producerData.participantId,
          name: producerData.participantName,
          info: {},
        );
        _participants[producerData.participantId] = participant;
      }

      // Auto-consume this participant's streams
      final streams = await _consumeParticipantInternal(
        producerData.participantId,
        producerData.participantName,
        participant.info,
      );

      if (streams.isNotEmpty) {
        _log(
          'Auto-consumed ${streams.length} streams from ${producerData.participantName}',
        );

        if (isNewParticipant) {
          // Edge case: Emit newParticipant if we missed the participantJoined event
          _emit(
            'newParticipant',
            NewParticipantEvent(
              participantId: producerData.participantId,
              participantName: producerData.participantName,
              participantInfo: participant.info,
              streams: streams,
            ),
          );
        } else {
          // Existing participant added new stream(s) - emit streamAdded for each
          for (final stream in streams) {
            _emit('streamAdded', stream);
          }
        }
      }
    });

    // Producer closed
    socket.on('producerClosed', (data) async {
      _log('Socket: producerClosed', data);

      final closedData = ProducerClosedData.fromJson(
        data as Map<String, dynamic>,
      );

      // Remove from consumed tracking
      _consumedProducerIds.remove(closedData.producerId);

      // Find and remove consumer by producer ID
      final consumerEntry =
          _consumers.entries.cast<MapEntry<String, ConsumerInfo>?>().firstWhere(
                (e) => e!.value.producerId == closedData.producerId,
                orElse: () => null,
              );

      if (consumerEntry != null) {
        final info = consumerEntry.value;
        await info.consumer.close();
        _consumers.remove(consumerEntry.key);

        _emit(
          'streamRemoved',
          StreamRemovedEvent(
            participantId: closedData.participantId,
            streamId: info.id,
            type: info.type,
          ),
        );
      }
    });

    // Audio muted
    socket.on('audioMuted', (data) {
      _log('Socket: audioMuted', data);
      final mutedData = data as Map<String, dynamic>;
      final participantId = mutedData['participantId'] as String;

      _emit(
        'streamPaused',
        StreamPausedEvent(
          participantId: participantId,
          type: StreamType.audio,
        ),
      );
    });

    // Audio unmuted
    socket.on('audioUnmuted', (data) {
      _log('Socket: audioUnmuted', data);
      final mutedData = data as Map<String, dynamic>;
      final participantId = mutedData['participantId'] as String;

      _emit(
        'streamResumed',
        StreamResumedEvent(
          participantId: participantId,
          type: StreamType.audio,
        ),
      );
    });

    // Video muted
    socket.on('videoMuted', (data) {
      _log('Socket: videoMuted', data);
      final mutedData = data as Map<String, dynamic>;
      final participantId = mutedData['participantId'] as String;

      _emit(
        'streamPaused',
        StreamPausedEvent(
          participantId: participantId,
          type: StreamType.video,
        ),
      );
    });

    // Video unmuted
    socket.on('videoUnmuted', (data) {
      _log('Socket: videoUnmuted', data);
      final mutedData = data as Map<String, dynamic>;
      final participantId = mutedData['participantId'] as String;

      _emit(
        'streamResumed',
        StreamResumedEvent(
          participantId: participantId,
          type: StreamType.video,
        ),
      );
    });

    // Socket disconnect
    socket.on('disconnect', (reason) {
      _log('Socket: disconnected', reason);

      if (_isConnected) {
        _cleanup();
        _emit('disconnected', DisconnectedEvent(reason: reason.toString()));
      }
    });

    // Socket error
    socket.on('error', (error) {
      _log('Socket: error', error);
      _emit('error', ErrorEvent(message: error.toString(), error: error));
    });
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /// Generate a unique participant ID
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

  /// Emit socket event with acknowledgment
  Future<Map<String, dynamic>> _emitWithAck(
    String event,
    Map<String, dynamic> data,
  ) async {
    final completer = Completer<Map<String, dynamic>>();

    _config.socket.emitWithAck(event, data, ack: (response) {
      if (response is Map<String, dynamic>) {
        completer.complete(response);
      } else if (response is Map) {
        completer.complete(Map<String, dynamic>.from(response));
      } else {
        completer.complete({'status': 'ok', 'data': response});
      }
    });

    return completer.future;
  }

  /// Get existing participants from server
  Future<List<Participant>> getParticipants() async {
    if (!_isConnected) {
      throw Exception('Not connected to a conference');
    }

    final response = await _emitWithAck('getParticipants', {
      'conferenceId': _conferenceId,
    });

    if (response['status'] != 'ok') {
      throw Exception(response['error'] ?? 'Failed to get participants');
    }

    final participantsList = response['data'] as List<dynamic>;

    // Update local cache
    for (final p in participantsList) {
      final pData = p as Map<String, dynamic>;
      final pId = pData['participantId'] as String;

      if (pId != _participantId) {
        _participants[pId] = Participant(
          id: pId,
          name: pData['participantName'] as String,
          info: pData['participantInfo'] as Map<String, dynamic>? ?? {},
        );
      }
    }

    return _participants.values.toList();
  }

  /// Dispose of resources
  void dispose() {
    if (_isConnected) {
      leave();
    }
    _eventHandlers.clear();
  }
}
