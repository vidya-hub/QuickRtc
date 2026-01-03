import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart'
    hide ConferenceProvider;
import 'package:socket_io_client/socket_io_client.dart' as io;

/// Connection status for the conference
enum ConferenceStatus {
  initial,
  connecting,
  connected,
  disconnected,
  error,
}

/// Remote participant with their streams and renderers
class RemoteParticipantState {
  final String id;
  final String name;
  final Map<String, RemoteStream> streams;
  final Map<String, RTCVideoRenderer> renderers;

  RemoteParticipantState({
    required this.id,
    required this.name,
    Map<String, RemoteStream>? streams,
    Map<String, RTCVideoRenderer>? renderers,
  })  : streams = streams ?? {},
        renderers = renderers ?? {};

  bool get hasAudio => streams.values.any((s) => s.type == StreamType.audio);
  bool get hasVideo => streams.values.any((s) => s.type == StreamType.video);

  RemoteParticipantState copyWith({
    String? id,
    String? name,
    Map<String, RemoteStream>? streams,
    Map<String, RTCVideoRenderer>? renderers,
  }) {
    return RemoteParticipantState(
      id: id ?? this.id,
      name: name ?? this.name,
      streams: streams ?? this.streams,
      renderers: renderers ?? this.renderers,
    );
  }
}

/// Conference provider using ChangeNotifier
class ConferenceProvider extends ChangeNotifier {
  // Connection state
  ConferenceStatus _status = ConferenceStatus.initial;
  String? _errorMessage;
  String? _conferenceId;
  String? _participantName;

  // Media state
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _isScreenSharing = false;
  bool _isFullScreen = false;

  // Renderers
  RTCVideoRenderer? _localRenderer;
  RTCVideoRenderer? _screenShareRenderer;

  // Streams
  MediaStream? _localStream;
  LocalMedia? _screenShareMedia;
  final Map<String, LocalStream> _localStreams = {};

  // Remote participants
  final Map<String, RemoteParticipantState> _remoteParticipants = {};

  // Internal
  QuickRTC? _rtc;
  io.Socket? _socket;

  // Getters
  ConferenceStatus get status => _status;
  String? get errorMessage => _errorMessage;
  String? get conferenceId => _conferenceId;
  String? get participantName => _participantName;
  bool get audioEnabled => _audioEnabled;
  bool get videoEnabled => _videoEnabled;
  bool get isScreenSharing => _isScreenSharing;
  bool get isFullScreen => _isFullScreen;
  RTCVideoRenderer? get localRenderer => _localRenderer;
  RTCVideoRenderer? get screenShareRenderer => _screenShareRenderer;
  MediaStream? get localStream => _localStream;
  LocalMedia? get screenShareMedia => _screenShareMedia;
  Map<String, LocalStream> get localStreams => Map.unmodifiable(_localStreams);
  Map<String, RemoteParticipantState> get remoteParticipants =>
      Map.unmodifiable(_remoteParticipants);

  bool get isJoining => _status == ConferenceStatus.connecting;
  bool get isConnected => _status == ConferenceStatus.connected;
  bool get hasError =>
      _status == ConferenceStatus.error && _errorMessage != null;

  /// Join a conference
  Future<void> joinConference({
    required String conferenceId,
    required String participantName,
    required String serverUrl,
  }) async {
    if (_status == ConferenceStatus.connecting) return;

    _status = ConferenceStatus.connecting;
    _errorMessage = null;
    _conferenceId = conferenceId;
    _participantName = participantName;
    notifyListeners();

    try {
      // Initialize renderers
      _localRenderer = RTCVideoRenderer();
      _screenShareRenderer = RTCVideoRenderer();
      await _localRenderer!.initialize();
      await _screenShareRenderer!.initialize();

      // Create socket connection
      _socket = io.io(
        serverUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setTimeout(10000)
            .disableReconnection()
            .build(),
      );

      // Wait for socket connection
      final socketCompleter = Completer<void>();

      _socket!.onConnect((_) {
        debugPrint('Socket connected!');
        if (!socketCompleter.isCompleted) socketCompleter.complete();
      });

      _socket!.onConnectError((data) {
        debugPrint('Socket connect error: $data');
        if (!socketCompleter.isCompleted) {
          socketCompleter.completeError('Connection failed: $data');
        }
      });

      _socket!.onError((data) {
        debugPrint('Socket error: $data');
      });

      _socket!.connect();

      await socketCompleter.future.timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          throw Exception('Connection timeout - server at $serverUrl');
        },
      );

      // Create QuickRTC instance
      _rtc = QuickRTC(QuickRTCConfig(
        socket: _socket!,
        debug: true,
      ));

      // Setup event listeners
      _setupEventListeners();

      // Join conference
      await _rtc!.join(JoinConfig(
        conferenceId: conferenceId,
        participantName: participantName,
      ));

      // Get local media
      final mediaConstraints = {
        'audio': true,
        'video': {'facingMode': 'user', 'width': 1280, 'height': 720},
      };
      _localStream = await Helper.openCamera(mediaConstraints);
      _localRenderer!.srcObject = _localStream;

      debugPrint('Local stream set: ${_localStream?.id}');
      debugPrint('Local renderer srcObject: ${_localRenderer?.srcObject?.id}');

      // Notify to update UI with local video
      notifyListeners();

      // Produce media
      final tracks = _localStream!.getTracks();
      final localStreams = await _rtc!.produce(ProduceInput.fromTracks(tracks));

      for (final stream in localStreams) {
        _localStreams[stream.id] = stream;
      }

      _status = ConferenceStatus.connected;
      notifyListeners();
    } catch (e, stackTrace) {
      debugPrint('Error joining conference: $e');
      debugPrint('Stack trace: $stackTrace');
      _status = ConferenceStatus.error;
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  void _setupEventListeners() {
    _rtc!.on<NewParticipantEvent>('newParticipant', (event) {
      _onParticipantJoined(
        event.participantId,
        event.participantName,
        event.streams,
      );
    });

    _rtc!.on<ParticipantLeftEvent>('participantLeft', (event) {
      _onParticipantLeft(event.participantId);
    });

    _rtc!.on<StreamAddedEvent>('streamAdded', (event) {
      _onStreamAdded(event);
    });

    _rtc!.on<StreamRemovedEvent>('streamRemoved', (event) {
      _onStreamRemoved(event.participantId, event.streamId);
    });

    _rtc!.on<DisconnectedEvent>('disconnected', (event) {
      _status = ConferenceStatus.disconnected;
      _errorMessage = 'Disconnected: ${event.reason}';
      notifyListeners();
    });

    _rtc!.on<ErrorEvent>('error', (event) {
      _status = ConferenceStatus.error;
      _errorMessage = event.message;
      notifyListeners();
    });
  }

  Future<void> _onParticipantJoined(
    String participantId,
    String participantName,
    List<RemoteStream> streams,
  ) async {
    debugPrint(
        'Participant joined: $participantName with ${streams.length} streams');

    _remoteParticipants[participantId] = RemoteParticipantState(
      id: participantId,
      name: participantName,
    );

    // Process streams
    for (final stream in streams) {
      await _addStreamToParticipant(participantId, stream);
    }

    notifyListeners();
  }

  Future<void> _onParticipantLeft(String participantId) async {
    final participant = _remoteParticipants.remove(participantId);
    if (participant != null) {
      for (final renderer in participant.renderers.values) {
        await renderer.dispose();
      }
    }
    notifyListeners();
  }

  Future<void> _onStreamAdded(RemoteStream stream) async {
    debugPrint('Stream added: ${stream.id} from ${stream.participantId}');
    await _addStreamToParticipant(stream.participantId, stream);
    notifyListeners();
  }

  Future<void> _addStreamToParticipant(
    String participantId,
    RemoteStream stream,
  ) async {
    var participant = _remoteParticipants[participantId];
    if (participant == null) {
      debugPrint('Participant not found for stream: $participantId');
      return;
    }

    // Log video tracks in the stream
    final videoTracks = stream.stream?.getVideoTracks() ?? [];
    final audioTracks = stream.stream?.getAudioTracks() ?? [];
    debugPrint(
        '[_addStreamToParticipant] stream.id: ${stream.id}, stream.type: ${stream.type}, stream.stream?.id: ${stream.stream?.id}, videoTracks: ${videoTracks.length}, audioTracks: ${audioTracks.length}');
    for (final track in videoTracks) {
      debugPrint(
          '  -> Video track: id=${track.id}, label=${track.label}, enabled=${track.enabled}');
    }
    for (final track in audioTracks) {
      debugPrint(
          '  -> Audio track: id=${track.id}, label=${track.label}, enabled=${track.enabled}');
    }

    final updatedStreams = Map<String, RemoteStream>.from(participant.streams);
    final updatedRenderers =
        Map<String, RTCVideoRenderer>.from(participant.renderers);

    updatedStreams[stream.id] = stream;

    if (stream.type == StreamType.video ||
        stream.type == StreamType.screenshare) {
      final renderer = RTCVideoRenderer();
      await renderer.initialize();
      renderer.srcObject = stream.stream;
      updatedRenderers[stream.id] = renderer;

      debugPrint(
          'Created renderer for stream ${stream.id} (type: ${stream.type}), srcObject: ${renderer.srcObject?.id}');
    } else if (stream.type == StreamType.audio) {
      // For audio streams, create a dedicated audio renderer
      // The renderer needs to be attached to an RTCVideoView (even invisible) for playback on web
      final audioRenderer = RTCVideoRenderer();
      await audioRenderer.initialize();
      audioRenderer.srcObject = stream.stream;
      // Store in renderers so it doesn't get garbage collected and audio keeps playing
      updatedRenderers[stream.id] = audioRenderer;

      debugPrint(
          'Created audio renderer for stream ${stream.id}, srcObject: ${stream.stream?.id}, audioTracks: ${stream.stream?.getAudioTracks().length}');
    }

    _remoteParticipants[participantId] = participant.copyWith(
      streams: updatedStreams,
      renderers: updatedRenderers,
    );
  }

  Future<void> _onStreamRemoved(String participantId, String streamId) async {
    final participant = _remoteParticipants[participantId];
    if (participant == null) return;

    final updatedStreams = Map<String, RemoteStream>.from(participant.streams);
    final updatedRenderers =
        Map<String, RTCVideoRenderer>.from(participant.renderers);

    updatedStreams.remove(streamId);
    final renderer = updatedRenderers.remove(streamId);
    await renderer?.dispose();

    _remoteParticipants[participantId] = participant.copyWith(
      streams: updatedStreams,
      renderers: updatedRenderers,
    );

    notifyListeners();
  }

  /// Leave the conference
  Future<void> leaveConference() async {
    try {
      // Stop screen sharing if active
      if (_isScreenSharing) {
        await stopScreenShare();
      }
      await _rtc?.leave();
    } catch (e) {
      debugPrint('Error leaving: $e');
    }

    // Cleanup
    await _cleanup();

    _status = ConferenceStatus.initial;
    _conferenceId = null;
    _participantName = null;
    _errorMessage = null;
    _audioEnabled = true;
    _videoEnabled = true;
    _isScreenSharing = false;
    _isFullScreen = false;

    notifyListeners();
  }

  Future<void> _cleanup() async {
    _localStream?.dispose();
    await _screenShareMedia?.dispose();
    _socket?.disconnect();

    for (final participant in _remoteParticipants.values) {
      for (final renderer in participant.renderers.values) {
        await renderer.dispose();
      }
    }
    _remoteParticipants.clear();

    await _localRenderer?.dispose();
    await _screenShareRenderer?.dispose();
    _localRenderer = null;
    _screenShareRenderer = null;
    _localStream = null;
    _screenShareMedia = null;
    _localStreams.clear();
  }

  /// Toggle audio (mute/unmute)
  Future<void> toggleAudio() async {
    // Update state immediately for UI responsiveness
    _audioEnabled = !_audioEnabled;
    debugPrint('toggleAudio: audioEnabled now $_audioEnabled');
    notifyListeners();

    // Then update the actual tracks if available
    if (_localStream != null) {
      final audioTracks = _localStream!.getAudioTracks();
      for (final track in audioTracks) {
        track.enabled = _audioEnabled;
      }

      try {
        final audioStream = _localStreams.values
            .where((s) => s.type == StreamType.audio)
            .firstOrNull;

        if (audioStream != null) {
          if (_audioEnabled) {
            await audioStream.resume();
          } else {
            await audioStream.pause();
          }
        }
      } catch (e) {
        debugPrint('toggleAudio: error pausing/resuming stream: $e');
      }
    }
  }

  /// Toggle video (on/off)
  Future<void> toggleVideo() async {
    // Update state immediately for UI responsiveness
    _videoEnabled = !_videoEnabled;
    debugPrint('toggleVideo: videoEnabled now $_videoEnabled');
    notifyListeners();

    // Then update the actual tracks if available
    if (_localStream != null) {
      final videoTracks = _localStream!.getVideoTracks();
      for (final track in videoTracks) {
        track.enabled = _videoEnabled;
      }

      try {
        final videoStream = _localStreams.values
            .where((s) => s.type == StreamType.video)
            .firstOrNull;

        if (videoStream != null) {
          if (_videoEnabled) {
            await videoStream.resume();
          } else {
            await videoStream.pause();
          }
        }
      } catch (e) {
        debugPrint('toggleVideo: error pausing/resuming stream: $e');
      }
    }
  }

  /// Toggle screen sharing
  Future<void> toggleScreenShare() async {
    if (!isConnected || _rtc == null) return;

    if (_isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }

  Future<void> startScreenShare() async {
    try {
      // Get screen share media using QuickRTC's static method
      _screenShareMedia = await QuickRTC.getLocalMedia(
        MediaConfig.screenShareOnly(
          config: ScreenShareConfig.defaultConfig,
        ),
      );

      if (_screenShareMedia?.screenshareTrack == null) {
        throw Exception('Failed to get screen share track');
      }

      // Set up renderer for local preview
      if (_screenShareMedia?.screenshareStream != null) {
        _screenShareRenderer!.srcObject = _screenShareMedia!.screenshareStream;
      }

      // Produce the screen share track with explicit screenshare type
      final localStreams = await _rtc!.produce(
        ProduceInput.fromTrack(
          _screenShareMedia!.screenshareTrack!,
          type: StreamType.screenshare,
        ),
      );

      // Store the produced streams
      for (final stream in localStreams) {
        _localStreams[stream.id] = stream;
      }

      // Listen for when the user stops sharing via system UI
      _screenShareMedia!.screenshareTrack!.onEnded = () {
        debugPrint('Screen share ended externally');
        stopScreenShare();
      };

      _isScreenSharing = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Error starting screen share: $e');
      rethrow;
    }
  }

  Future<void> stopScreenShare() async {
    try {
      // Find and stop screen share streams
      final screenShareStreams = _localStreams.entries
          .where((e) => e.value.type == StreamType.screenshare)
          .toList();

      for (final entry in screenShareStreams) {
        await entry.value.stop();
        _localStreams.remove(entry.key);
      }

      // Clear the renderer
      _screenShareRenderer?.srcObject = null;

      // Dispose screen share media
      await _screenShareMedia?.dispose();
      _screenShareMedia = null;

      _isScreenSharing = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Error stopping screen share: $e');
    }
  }

  /// Toggle fullscreen mode
  void toggleFullScreen() {
    _isFullScreen = !_isFullScreen;
    notifyListeners();
  }

  @override
  void dispose() {
    _cleanup();
    super.dispose();
  }
}
