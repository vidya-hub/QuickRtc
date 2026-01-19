import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class ConferenceScreen extends StatefulWidget {
  const ConferenceScreen({super.key});

  @override
  State<ConferenceScreen> createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  // Resources (not reactive - managed by lifecycle)
  io.Socket? _socket;
  QuickRTCController? _controller;
  MediaStream? _localStream;

  // Local UI state (reactive via setState) - only for loading/error states
  bool _isLoading = true;
  String? _error;
  String _meetingId = '';
  String _userName = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_isLoading && _controller == null) _init();
  }

  Future<void> _init() async {
    try {
      final args =
          ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      _meetingId = args['conferenceId'] as String;
      _userName = args['participantName'] as String;
      final serverUrl = args['serverUrl'] as String;

      // Connect socket
      _socket = io.io(
          serverUrl,
          io.OptionBuilder()
              .setTransports(['websocket'])
              .disableAutoConnect()
              .disableReconnection()
              .build());

      final connected = await _connectSocket();
      if (!connected) throw Exception('Connection failed');

      // Setup controller and join
      _controller = QuickRTCController(socket: _socket!, debug: true);
      await _controller!
          .joinMeeting(conferenceId: _meetingId, participantName: _userName);

      // Don't start camera/mic initially - user can enable via buttons
      // Camera and microphone will be enabled when user clicks the respective buttons

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<bool> _connectSocket() async {
    final completer = Completer<bool>();
    _socket!.onConnect(
        (_) => completer.isCompleted ? null : completer.complete(true));
    _socket!.onConnectError(
        (_) => completer.isCompleted ? null : completer.complete(false));
    _socket!.connect();
    return completer.future
        .timeout(const Duration(seconds: 10), onTimeout: () => false);
  }

  Future<void> _leave() async {
    await _controller?.leaveMeeting();
    _cleanup();
    if (mounted) Navigator.pop(context);
  }

  void _cleanup() {
    _localStream?.dispose();
    _localStream = null;
    _controller?.dispose();
    _controller = null;
    _socket?.disconnect();
    _socket = null;
  }

  @override
  void dispose() {
    _cleanup();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return _buildLoading();
    if (_error != null) return _buildError();
    return _buildConference();
  }

  Widget _buildLoading() {
    return const Scaffold(
      backgroundColor: Colors.black,
      body: Center(child: CircularProgressIndicator(color: Colors.white)),
    );
  }

  Widget _buildError() {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: Colors.white)),
            const SizedBox(height: 16),
            ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back')),
          ],
        ),
      ),
    );
  }

  Widget _buildConference() {
    // Guard against controller being disposed during navigation
    if (_controller == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    // Use ListenableBuilder to listen to controller state changes
    // This rebuilds automatically when controller.notifyListeners() is called
    return ListenableBuilder(
      listenable: _controller!,
      builder: (context, _) {
        // Double-check controller is still valid
        if (_controller == null) {
          return const SizedBox.shrink();
        }

        final state = _controller!.state;

        // Show error snackbar if there's an error
        if (state.hasError) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _controller != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                    content: Text(state.error!), backgroundColor: Colors.red),
              );
              _controller!.clearError();
            }
          });
        }

        return Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            title: _buildConnectionStatus(state),
            actions: [
              IconButton(
                icon: const Icon(Icons.copy, size: 20),
                onPressed: _copyMeetingId,
              ),
            ],
          ),
          body: Stack(
            children: [
              _buildVideoGrid(state),
              QuickRTCAudioRenderers(participants: state.participantList),
            ],
          ),
          bottomNavigationBar: _buildControls(state),
        );
      },
    );
  }

  Widget _buildConnectionStatus(QuickRTCState state) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: state.isConnected ? Colors.green : Colors.orange,
          ),
        ),
        const SizedBox(width: 8),
        Text(_meetingId, style: const TextStyle(fontSize: 14)),
      ],
    );
  }

  void _copyMeetingId() {
    Clipboard.setData(ClipboardData(text: _meetingId));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Meeting ID copied'), duration: Duration(seconds: 1)),
    );
  }

  Widget _buildVideoGrid(QuickRTCState state) {
    // Use the stream from state - it gets updated when track is replaced on resume
    final localVideoStream = state.localVideoStream?.stream ?? _localStream;

    // Determine audio/video status from controller state
    final isAudioEnabled = state.hasLocalAudio && !state.isLocalAudioPaused;
    final isVideoEnabled = state.hasLocalVideo && !state.isLocalVideoPaused;

    final tiles = <Widget>[
      // Local video
      QuickRTCMediaRenderer(
        key: const ValueKey('local'),
        stream: localVideoStream,
        mirror: true,
        isLocal: true,
        participantName: _userName,
        isAudioEnabled: isAudioEnabled,
        isVideoEnabled: isVideoEnabled,
        showAudioIndicator: true,
        showName: true,
        showLocalLabel: true,
      ),
    ];

    // Remote videos
    for (final p in state.participantList) {
      if (p.videoStream != null) {
        tiles.add(QuickRTCMediaRenderer(
          key: ValueKey('video_${p.id}'),
          remoteStream: p.videoStream,
          participantName: p.name,
          isAudioEnabled: p.hasAudio && !p.isAudioMuted,
          isVideoEnabled: p.hasVideo && !p.isVideoMuted,
          showAudioIndicator: true,
          showName: true,
        ));
      }
      if (p.screenshareStream != null) {
        tiles.add(QuickRTCMediaRenderer(
          key: ValueKey('screen_${p.id}'),
          remoteStream: p.screenshareStream,
          participantName: '${p.name} (Screen)',
          objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain,
        ));
      }
    }

    final columns = tiles.length <= 2 ? 1 : (tiles.length <= 4 ? 2 : 3);

    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        childAspectRatio: 16 / 9,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: tiles.length,
      itemBuilder: (_, i) => ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: tiles[i],
      ),
    );
  }

  Widget _buildControls(QuickRTCState state) {
    // Determine audio/video active state from controller state
    final isAudioActive = state.hasLocalAudio && !state.isLocalAudioPaused;
    final isVideoActive = state.hasLocalVideo && !state.isLocalVideoPaused;

    return Container(
      color: const Color(0xFF1A1A1A),
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _ControlBtn(
              icon: isAudioActive ? Icons.mic : Icons.mic_off,
              active: isAudioActive,
              onTap: _toggleAudio,
            ),
            _ControlBtn(
              icon: isVideoActive ? Icons.videocam : Icons.videocam_off,
              active: isVideoActive,
              onTap: _toggleVideo,
            ),
            _ControlBtn(
              icon: state.hasLocalScreenshare
                  ? Icons.stop_screen_share
                  : Icons.screen_share,
              active: state.hasLocalScreenshare,
              onTap: () => _toggleScreenShare(state),
            ),
            _ControlBtn(
              icon: Icons.call_end,
              active: false,
              destructive: true,
              onTap: _leave,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleAudio() async {
    if (_controller == null) return;

    final state = _controller!.state;

    // If no audio stream exists yet, start it for the first time
    if (!state.hasLocalAudio) {
      try {
        final media =
            await QuickRTCStatic.getLocalMedia(MediaConfig.audioOnly());
        await _controller!.produce(
          ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
        );
        // Controller will notify listeners, triggering rebuild
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('Failed to start audio: $e'),
                backgroundColor: Colors.red),
          );
        }
      }
      return;
    }

    // Toggle existing audio - controller will notify listeners
    await _controller?.toggleMicrophoneMute();
  }

  Future<void> _toggleVideo() async {
    if (_controller == null) return;

    final state = _controller!.state;

    // If no video stream exists yet, start it for the first time
    if (!state.hasLocalVideo) {
      try {
        final media = await QuickRTCStatic.getLocalMedia(
          MediaConfig.videoOnly(config: VideoConfig.frontCamera),
        );
        _localStream = media.stream;
        await _controller!.produce(
          ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
        );
        // Controller will notify listeners, triggering rebuild
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('Failed to start video: $e'),
                backgroundColor: Colors.red),
          );
        }
      }
      return;
    }

    // Toggle existing video - controller will notify listeners
    await _controller?.toggleCameraPause();
  }

  Future<void> _toggleScreenShare(QuickRTCState state) async {
    try {
      if (state.hasLocalScreenshare) {
        await state.localScreenshareStream?.stop();
      } else {
        final media = WebRTC.platformIsDesktop
            ? await QuickRTCStatic.getScreenShareWithPicker(context)
            : await QuickRTCStatic.getLocalMedia(MediaConfig.screenShareOnly());

        if (media.screenshareTrack != null) {
          await _controller!.produce(ProduceInput.fromTrack(
              media.screenshareTrack!,
              type: StreamType.screenshare));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Screen share error: $e'),
              backgroundColor: Colors.red),
        );
      }
    }
  }
}

class _ControlBtn extends StatelessWidget {
  final IconData icon;
  final bool active;
  final bool destructive;
  final VoidCallback onTap;

  const _ControlBtn({
    required this.icon,
    required this.active,
    this.destructive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: destructive
              ? Colors.red
              : (active ? Colors.white24 : Colors.white12),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }
}
