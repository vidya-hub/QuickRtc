import 'dart:async';
import 'package:flutter/material.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
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
  final Map<String, RTCVideoRenderer> videoRenderers;
  final Map<String, RTCVideoRenderer> audioRenderers;
  final bool hasAudio;
  final bool hasVideo;

  RemoteParticipantState({
    required this.id,
    required this.name,
    Map<String, RTCVideoRenderer>? videoRenderers,
    Map<String, RTCVideoRenderer>? audioRenderers,
    this.hasAudio = false,
    this.hasVideo = false,
  })  : videoRenderers = videoRenderers ?? {},
        audioRenderers = audioRenderers ?? {};

  RemoteParticipantState copyWith({
    String? id,
    String? name,
    Map<String, RTCVideoRenderer>? videoRenderers,
    Map<String, RTCVideoRenderer>? audioRenderers,
    bool? hasAudio,
    bool? hasVideo,
  }) {
    return RemoteParticipantState(
      id: id ?? this.id,
      name: name ?? this.name,
      videoRenderers: videoRenderers ?? this.videoRenderers,
      audioRenderers: audioRenderers ?? this.audioRenderers,
      hasAudio: hasAudio ?? this.hasAudio,
      hasVideo: hasVideo ?? this.hasVideo,
    );
  }
}

/// Conference provider using the QuickRTCController API
class ConferenceProvider extends ChangeNotifier {
  // Connection state
  ConferenceStatus _status = ConferenceStatus.initial;
  String? _errorMessage;
  String? _conferenceId;
  String? _participantName;

  // Media state
  bool _audioEnabled = false;
  bool _videoEnabled = false;
  bool _isScreenSharing = false;
  bool _isFullScreen = false;

  // Renderers
  RTCVideoRenderer? _localRenderer;
  RTCVideoRenderer? _screenShareRenderer;

  // Remote participants
  final Map<String, RemoteParticipantState> _remoteParticipants = {};

  // QuickRTC controller
  QuickRTCController? _controller;
  io.Socket? _socket;

  // Local media stream
  MediaStream? _localStream;

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
      final socketConnected = await _waitForSocketConnection();
      if (!socketConnected) {
        throw Exception('Failed to connect to server');
      }

      // Create QuickRTC controller
      _controller = QuickRTCController(
        socket: _socket!,
        debug: true,
      );

      // Set up state listener
      _controller!.addListener(_onControllerStateChanged);

      // Join the room
      await _controller!.joinMeeting(
        conferenceId: conferenceId,
        participantName: participantName,
      );

      // Get local media and produce
      final localMedia = await QuickRTCStatic.getLocalMedia(
        MediaConfig.audioVideo(videoConfig: VideoConfig.frontCamera),
      );
      _localStream = localMedia.stream;
      _localRenderer!.srcObject = _localStream;

      // Produce media
      await _controller!.produce(
        ProduceInput.fromTracksWithTypes(localMedia.tracksWithTypes),
      );

      _audioEnabled = true;
      _videoEnabled = true;
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

  Future<bool> _waitForSocketConnection() async {
    final completer = Completer<bool>();

    _socket!.onConnect((_) {
      debugPrint('Socket connected!');
      if (!completer.isCompleted) completer.complete(true);
    });

    _socket!.onConnectError((data) {
      debugPrint('Socket connect error: $data');
      if (!completer.isCompleted) completer.complete(false);
    });

    _socket!.onError((data) {
      debugPrint('Socket error: $data');
    });

    _socket!.connect();

    return completer.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () => false,
    );
  }

  void _onControllerStateChanged() {
    if (_controller == null) return;

    final state = _controller!.state;

    // Handle errors
    if (state.hasError && state.error != _errorMessage) {
      _errorMessage = state.error;
      notifyListeners();
    }

    // Handle disconnection
    if (state.isDisconnected && _status == ConferenceStatus.connected) {
      _status = ConferenceStatus.disconnected;
      _errorMessage = 'Disconnected from conference';
      notifyListeners();
    }

    // Update remote participants from state
    _updateRemoteParticipants(state);
  }

  Future<void> _updateRemoteParticipants(QuickRTCState state) async {
    final currentParticipantIds = <String>{};

    for (final participant in state.participantList) {
      currentParticipantIds.add(participant.id);

      var localParticipant = _remoteParticipants[participant.id];
      if (localParticipant == null) {
        // New participant
        localParticipant = RemoteParticipantState(
          id: participant.id,
          name: participant.name,
        );
        _remoteParticipants[participant.id] = localParticipant;
      }

      // Update streams
      for (final stream in participant.streams) {
        final currentLocal = _remoteParticipants[participant.id];
        if (currentLocal == null) continue;

        if (stream.type == StreamType.audio) {
          if (!currentLocal.audioRenderers.containsKey(stream.id)) {
            final renderer = RTCVideoRenderer();
            await renderer.initialize();
            renderer.srcObject = stream.stream;

            final updatedAudioRenderers =
                Map<String, RTCVideoRenderer>.from(currentLocal.audioRenderers);
            updatedAudioRenderers[stream.id] = renderer;

            _remoteParticipants[participant.id] = currentLocal.copyWith(
              audioRenderers: updatedAudioRenderers,
              hasAudio: true,
            );
          }
        } else {
          // Video or screenshare
          if (!currentLocal.videoRenderers.containsKey(stream.id)) {
            final renderer = RTCVideoRenderer();
            await renderer.initialize();
            renderer.srcObject = stream.stream;

            final updatedVideoRenderers =
                Map<String, RTCVideoRenderer>.from(currentLocal.videoRenderers);
            updatedVideoRenderers[stream.id] = renderer;

            _remoteParticipants[participant.id] = currentLocal.copyWith(
              videoRenderers: updatedVideoRenderers,
              hasVideo: true,
            );
          }
        }
      }
    }

    // Remove participants that left
    final toRemove = <String>[];
    for (final id in _remoteParticipants.keys) {
      if (!currentParticipantIds.contains(id)) {
        toRemove.add(id);
      }
    }

    for (final id in toRemove) {
      final participant = _remoteParticipants.remove(id);
      if (participant != null) {
        for (final renderer in participant.videoRenderers.values) {
          renderer.dispose();
        }
        for (final renderer in participant.audioRenderers.values) {
          renderer.dispose();
        }
      }
    }

    notifyListeners();
  }

  /// Leave the conference
  Future<void> leaveConference() async {
    try {
      _controller?.removeListener(_onControllerStateChanged);
      await _controller?.leaveMeeting();
    } catch (e) {
      debugPrint('Error leaving: $e');
    }

    // Cleanup
    await _cleanup();

    _status = ConferenceStatus.initial;
    _conferenceId = null;
    _participantName = null;
    _errorMessage = null;
    _audioEnabled = false;
    _videoEnabled = false;
    _isScreenSharing = false;
    _isFullScreen = false;

    notifyListeners();
  }

  Future<void> _cleanup() async {
    _controller?.dispose();
    _controller = null;

    _socket?.disconnect();
    _socket = null;

    _localStream?.dispose();
    _localStream = null;

    for (final participant in _remoteParticipants.values) {
      for (final renderer in participant.videoRenderers.values) {
        await renderer.dispose();
      }
      for (final renderer in participant.audioRenderers.values) {
        await renderer.dispose();
      }
    }
    _remoteParticipants.clear();

    await _localRenderer?.dispose();
    await _screenShareRenderer?.dispose();
    _localRenderer = null;
    _screenShareRenderer = null;
  }

  /// Toggle audio (mute/unmute)
  Future<void> toggleAudio() async {
    if (_localStream == null) return;

    try {
      final audioTracks = _localStream!.getAudioTracks();
      if (audioTracks.isEmpty) return;

      _audioEnabled = !_audioEnabled;

      for (final track in audioTracks) {
        track.enabled = _audioEnabled;
      }

      // Also pause/resume the producer on the server
      final audioStream = _controller?.state.localAudioStream;
      if (audioStream != null) {
        if (_audioEnabled) {
          await audioStream.resume();
        } else {
          await audioStream.pause();
        }
      }

      notifyListeners();
    } catch (e) {
      debugPrint('toggleAudio error: $e');
    }
  }

  /// Toggle video (on/off)
  Future<void> toggleVideo() async {
    if (_localStream == null) return;

    try {
      final videoTracks = _localStream!.getVideoTracks();
      if (videoTracks.isEmpty) return;

      _videoEnabled = !_videoEnabled;

      for (final track in videoTracks) {
        track.enabled = _videoEnabled;
      }

      // Also pause/resume the producer on the server
      final videoStream = _controller?.state.localVideoStream;
      if (videoStream != null) {
        if (_videoEnabled) {
          await videoStream.resume();
        } else {
          await videoStream.pause();
        }
      }

      notifyListeners();
    } catch (e) {
      debugPrint('toggleVideo error: $e');
    }
  }

  /// Toggle screen sharing
  ///
  /// On desktop platforms, pass [context] to show a picker dialog.
  /// Without context, it will auto-select the first screen.
  Future<void> toggleScreenShare([BuildContext? context]) async {
    if (_controller == null || !_controller!.state.isConnected) return;

    try {
      if (_isScreenSharing) {
        // Stop screen sharing
        final screenshareStream = _controller?.state.localScreenshareStream;
        if (screenshareStream != null) {
          await screenshareStream.stop();
        }
        _screenShareRenderer?.srcObject = null;
        _isScreenSharing = false;
      } else {
        // Start screen sharing
        LocalMedia screenMedia;

        // On desktop, use picker if context is provided
        if (context != null && WebRTC.platformIsDesktop) {
          screenMedia = await QuickRTCStatic.getScreenShareWithPicker(
            context,
            config: ScreenShareConfig.defaultConfig,
          );
        } else {
          // Auto-select on mobile or when no context
          screenMedia = await QuickRTCStatic.getLocalMedia(
            MediaConfig.screenShareOnly(
                config: ScreenShareConfig.defaultConfig),
          );
        }

        if (screenMedia.screenshareTrack != null) {
          _screenShareRenderer?.srcObject = screenMedia.screenshareStream;

          await _controller!.produce(
            ProduceInput.fromTrack(
              screenMedia.screenshareTrack!,
              type: StreamType.screenshare,
            ),
          );

          _isScreenSharing = true;
        }
      }
      notifyListeners();
    } on ScreenCapturePermissionException catch (e) {
      debugPrint('Screen capture permission error: $e');
      _errorMessage = e.message;
      notifyListeners();
    } catch (e) {
      debugPrint('toggleScreenShare error: $e');
      _errorMessage = 'Failed to share screen: $e';
      notifyListeners();
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
