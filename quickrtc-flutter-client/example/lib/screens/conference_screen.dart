import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:quickrtc_flutter_client_example/utils/responsive.dart';

class ConferenceScreen extends StatefulWidget {
  const ConferenceScreen({super.key});

  @override
  State<ConferenceScreen> createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  // QuickRTC controller
  QuickRTCController? _controller;
  io.Socket? _socket;

  // Local media
  MediaStream? _localStream;
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();

  // Screen share
  LocalMedia? _screenShareMedia;
  final RTCVideoRenderer _screenShareRenderer = RTCVideoRenderer();
  bool _isScreenSharing = false;

  // State
  bool _isJoining = false;
  String? _error;
  bool _audioEnabled = false;
  bool _videoEnabled = false;
  bool _isFullScreen = false;
  String? _conferenceId;
  String? _participantName;

  // Remote participant renderers
  final Map<String, RTCVideoRenderer> _remoteRenderers = {};

  @override
  void initState() {
    super.initState();
    _initRenderers();
  }

  Future<void> _initRenderers() async {
    await _localRenderer.initialize();
    await _screenShareRenderer.initialize();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _joinConference();
    });
  }

  Future<void> _joinConference() async {
    if (_isJoining) return;
    setState(() {
      _isJoining = true;
      _error = null;
    });

    try {
      final args =
          ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      final conferenceId = args['conferenceId'] as String;
      final participantName = args['participantName'] as String;
      final serverUrl = args['serverUrl'] as String;

      _conferenceId = conferenceId;
      _participantName = participantName;

      debugPrint('Joining conference: $conferenceId as $participantName');
      debugPrint('Server URL: $serverUrl');

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

      // Create QuickRTC controller
      _controller = QuickRTCController(
        socket: _socket!,
        debug: true,
      );

      // Listen to state changes for handling errors and disconnection
      _controller!.addListener(_onStateChanged);

      // Join meeting using high-level API
      await _controller!.joinMeeting(
        conferenceId: conferenceId,
        participantName: participantName,
      );

      // Don't start camera initially - user can enable it manually
      // Camera and microphone will be enabled when user clicks the respective buttons

      setState(() {});
    } catch (e, stackTrace) {
      debugPrint('Error joining conference: $e');
      debugPrint('Stack trace: $stackTrace');
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isJoining = false);
    }
  }

  void _onStateChanged() {
    if (!mounted || _controller == null) return;

    final state = _controller!.state;

    // Handle errors
    if (state.hasError && state.error != _error) {
      setState(() => _error = state.error);
    }

    // Handle disconnection
    if (state.isDisconnected && _error == null) {
      setState(() => _error = 'Disconnected from conference');
    }

    // Update remote renderers when participants change
    _updateRemoteRenderers(state);

    // Trigger rebuild to update UI
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _updateRemoteRenderers(QuickRTCState state) async {
    // Get all current remote video streams
    final currentStreamIds = <String>{};

    for (final participant in state.participantList) {
      for (final stream in participant.streams) {
        if (stream.type == StreamType.video ||
            stream.type == StreamType.screenshare) {
          currentStreamIds.add(stream.id);

          // Create renderer if not exists
          if (!_remoteRenderers.containsKey(stream.id)) {
            final renderer = RTCVideoRenderer();
            await renderer.initialize();
            renderer.srcObject = stream.stream;
            _remoteRenderers[stream.id] = renderer;
            debugPrint('Created renderer for stream ${stream.id}');
          } else {
            // IMPORTANT: On Android, the srcObject may need to be re-assigned
            // if the stream has changed (e.g., after reconnection)
            final existingRenderer = _remoteRenderers[stream.id]!;
            if (existingRenderer.srcObject?.id != stream.stream.id) {
              existingRenderer.srcObject = stream.stream;
              debugPrint('Updated renderer srcObject for stream ${stream.id}');
            }
          }
        }
      }
    }

    // Remove renderers for streams that no longer exist
    final toRemove = <String>[];
    for (final streamId in _remoteRenderers.keys) {
      if (!currentStreamIds.contains(streamId)) {
        toRemove.add(streamId);
      }
    }

    for (final streamId in toRemove) {
      final renderer = _remoteRenderers.remove(streamId);
      renderer?.srcObject = null;
      renderer?.dispose();
      debugPrint('Removed renderer for stream $streamId');
    }
  }

  Future<void> _toggleAudio() async {
    if (_controller == null || !_controller!.state.isConnected) return;

    final audioStream = _controller?.state.localAudioStream;

    // If no audio stream exists yet, we need to start it for the first time
    if (audioStream == null) {
      try {
        // Get audio-only media
        final localMedia = await QuickRTCStatic.getLocalMedia(
          MediaConfig.audioOnly(),
        );

        // Produce audio track
        await _controller!.produce(
          ProduceInput.fromTracksWithTypes(localMedia.tracksWithTypes),
        );

        setState(() => _audioEnabled = true);
      } catch (e) {
        debugPrint('Error starting audio: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to start audio: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
      return;
    }

    setState(() => _audioEnabled = !_audioEnabled);

    if (_audioEnabled) {
      await audioStream.resume();
    } else {
      await audioStream.pause();
    }
  }

  Future<void> _toggleVideo() async {
    if (_controller == null || !_controller!.state.isConnected) return;

    final videoStream = _controller?.state.localVideoStream;

    // If no video stream exists yet, we need to start it for the first time
    if (videoStream == null) {
      try {
        // Get video-only media
        final localMedia = await QuickRTCStatic.getLocalMedia(
          MediaConfig.videoOnly(config: VideoConfig.frontCamera),
        );
        _localStream = localMedia.stream;
        _localRenderer.srcObject = _localStream;

        // Produce video track
        await _controller!.produce(
          ProduceInput.fromTracksWithTypes(localMedia.tracksWithTypes),
        );

        setState(() => _videoEnabled = true);
      } catch (e) {
        debugPrint('Error starting video: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to start video: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
      return;
    }

    setState(() => _videoEnabled = !_videoEnabled);

    if (_videoEnabled) {
      // Resume video - re-acquire camera
      await videoStream.resume();

      // Update renderer with new stream from state (after resume, stream is refreshed)
      // Give a brief delay for the new stream to be ready
      await Future.delayed(const Duration(milliseconds: 100));
      final updatedVideoStream = _controller?.state.localVideoStream;
      if (updatedVideoStream != null) {
        _localStream = updatedVideoStream.stream;
        _localRenderer.srcObject = _localStream;
      }
    } else {
      // Pause video - release camera
      // Clear the renderer first to release the reference
      _localRenderer.srcObject = null;

      // The library will handle stream disposal when pausing.
      // We just clear our local reference to allow GC.
      _localStream = null;

      // Now pause the producer (this will stop the track and dispose stream if needed)
      await videoStream.pause();
    }
  }

  Future<void> _toggleScreenShare() async {
    if (_controller == null || !_controller!.state.isConnected) return;

    if (_isScreenSharing) {
      // Stop screen sharing
      await _stopScreenShare();
    } else {
      // Start screen sharing
      await _startScreenShare();
    }
  }

  Future<void> _startScreenShare() async {
    try {
      // Get screen share media using static API
      _screenShareMedia = await QuickRTCStatic.getLocalMedia(
        MediaConfig.screenShareOnly(
          config: ScreenShareConfig.defaultConfig,
        ),
      );

      if (_screenShareMedia?.screenshareTrack == null) {
        throw Exception('Failed to get screen share track');
      }

      // Set up renderer for local preview (optional)
      if (_screenShareMedia!.screenshareStream != null) {
        _screenShareRenderer.srcObject = _screenShareMedia!.screenshareStream;
      }

      // Produce the screen share track
      await _controller!.produce(
        ProduceInput.fromTrack(
          _screenShareMedia!.screenshareTrack!,
          type: StreamType.screenshare,
        ),
      );

      // Listen for screen share ended (e.g., user clicked "Stop sharing" in browser)
      _screenShareMedia!.screenshareTrack!.onEnded = () {
        debugPrint('Screen share ended externally');
        _stopScreenShare();
      };

      setState(() => _isScreenSharing = true);
    } catch (e) {
      debugPrint('Error starting screen share: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start screen share: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _stopScreenShare() async {
    try {
      // Find and stop screen share streams
      final screenshareStream = _controller?.state.localScreenshareStream;
      if (screenshareStream != null) {
        await screenshareStream.stop();
      }

      // Dispose screen share media
      await _screenShareMedia?.dispose();
      _screenShareMedia = null;
      _screenShareRenderer.srcObject = null;

      setState(() => _isScreenSharing = false);
    } catch (e) {
      debugPrint('Error stopping screen share: $e');
    }
  }

  void _toggleFullScreen() {
    setState(() => _isFullScreen = !_isFullScreen);
    if (_isFullScreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
  }

  Future<void> _leaveConference() async {
    try {
      _controller?.removeListener(_onStateChanged);
      await _controller?.leaveMeeting();
    } catch (e) {
      debugPrint('Error leaving: $e');
    }

    _localStream?.dispose();
    _socket?.disconnect();

    // Dispose all remote renderers
    for (final renderer in _remoteRenderers.values) {
      renderer.dispose();
    }
    _remoteRenderers.clear();

    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

    if (mounted) {
      Navigator.pop(context);
    }
  }

  void _copyMeetingId() {
    if (_conferenceId != null) {
      Clipboard.setData(ClipboardData(text: _conferenceId!));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Meeting ID copied to clipboard'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, responsive) {
        final isConnected = _controller?.state.isConnected ?? false;

        return Scaffold(
          backgroundColor: Colors.black,
          appBar: _isFullScreen
              ? null
              : AppBar(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  title: _buildAppBarTitle(isConnected),
                  actions: _buildAppBarActions(responsive),
                ),
          body: SafeArea(
            child: _buildBody(responsive, isConnected),
          ),
        );
      },
    );
  }

  Widget _buildAppBarTitle(bool isConnected) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: isConnected ? Colors.green : Colors.orange,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isConnected ? Icons.circle : Icons.circle_outlined,
                size: 8,
                color: Colors.white,
              ),
              const SizedBox(width: 4),
              Text(
                isConnected ? 'Live' : 'Connecting',
                style: const TextStyle(fontSize: 12, color: Colors.white),
              ),
            ],
          ),
        ),
        if (_conferenceId != null) ...[
          const SizedBox(width: 12),
          GestureDetector(
            onTap: _copyMeetingId,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _conferenceId!,
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.copy, size: 14),
              ],
            ),
          ),
        ],
      ],
    );
  }

  List<Widget> _buildAppBarActions(Responsive responsive) {
    return [
      IconButton(
        icon: Icon(_isFullScreen ? Icons.fullscreen_exit : Icons.fullscreen),
        onPressed: _toggleFullScreen,
        tooltip: _isFullScreen ? 'Exit fullscreen' : 'Fullscreen',
      ),
      IconButton(
        icon: const Icon(Icons.call_end),
        onPressed: _leaveConference,
        color: Colors.red,
        tooltip: 'Leave meeting',
      ),
    ];
  }

  Widget _buildBody(Responsive responsive, bool isConnected) {
    if (_isJoining) {
      return _buildLoadingState();
    }

    if (_error != null) {
      return _buildErrorState(responsive);
    }

    if (!isConnected) {
      return _buildNotConnectedState();
    }

    return _buildConferenceView(responsive);
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(color: Colors.white),
          const SizedBox(height: 24),
          const Text(
            'Joining meeting...',
            style: TextStyle(fontSize: 20, color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text(
            'Setting up your audio and video',
            style: TextStyle(fontSize: 14, color: Colors.grey[400]),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(Responsive responsive) {
    return Center(
      child: Padding(
        padding: responsive.screenPadding,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: const Icon(
                  Icons.error_outline,
                  size: 48,
                  color: Colors.red,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Connection Failed',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey[400]),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white24),
                    ),
                    child: const Text('Go Back'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _joinConference,
                    child: const Text('Try Again'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNotConnectedState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'Not connected',
            style: TextStyle(fontSize: 18, color: Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildConferenceView(Responsive responsive) {
    final state = _controller!.state;
    final totalParticipants = state.participantCount + 1; // +1 for local

    // Choose layout based on screen size and participant count
    if (responsive.isMobile || (responsive.isTablet && responsive.isPortrait)) {
      return _buildMobileLayout(responsive, totalParticipants, state);
    } else {
      return _buildDesktopLayout(responsive, totalParticipants, state);
    }
  }

  Widget _buildMobileLayout(
    Responsive responsive,
    int totalParticipants,
    QuickRTCState state,
  ) {
    return Column(
      children: [
        // Video grid
        Expanded(
          child: _buildVideoGrid(responsive, totalParticipants, state),
        ),
        // Controls
        _buildControlsBar(responsive),
      ],
    );
  }

  Widget _buildDesktopLayout(
    Responsive responsive,
    int totalParticipants,
    QuickRTCState state,
  ) {
    return Row(
      children: [
        // Main video area
        Expanded(
          child: Column(
            children: [
              Expanded(
                child: _buildVideoGrid(responsive, totalParticipants, state),
              ),
              _buildControlsBar(responsive),
            ],
          ),
        ),
        // Side panel for chat/participants (optional)
        if (responsive.width > 1200)
          Container(
            width: 300,
            color: const Color(0xFF1E1E1E),
            child: _buildSidePanel(state),
          ),
      ],
    );
  }

  Widget _buildVideoGrid(
    Responsive responsive,
    int totalParticipants,
    QuickRTCState state,
  ) {
    // Build list of participants for the grid
    final participantWidgets = <Widget>[
      // Local participant first
      _LocalVideoTile(
        renderer: _localRenderer,
        name: _participantName ?? 'You',
        audioEnabled: _audioEnabled,
        videoEnabled: _videoEnabled,
      ),
    ];

    // Add remote participants
    for (final participant in state.participantList) {
      participantWidgets.add(
        _RemoteParticipantTile(
          participant: participant,
          renderers: _remoteRenderers,
        ),
      );
    }

    // Calculate grid dimensions
    final crossAxisCount = _calculateGridColumns(
      responsive,
      totalParticipants,
    );

    return Padding(
      padding: EdgeInsets.all(responsive.value(mobile: 4.0, tablet: 8.0)),
      child: GridView.builder(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          childAspectRatio: 16 / 9,
          crossAxisSpacing: responsive.value(mobile: 4.0, tablet: 8.0),
          mainAxisSpacing: responsive.value(mobile: 4.0, tablet: 8.0),
        ),
        itemCount: participantWidgets.length,
        itemBuilder: (context, index) => participantWidgets[index],
      ),
    );
  }

  int _calculateGridColumns(Responsive responsive, int count) {
    if (count == 1) return 1;
    if (count == 2) {
      return responsive.isPortrait ? 1 : 2;
    }
    if (count <= 4) return 2;
    if (count <= 9) return responsive.value(mobile: 2, tablet: 3, desktop: 3);
    return responsive.value(mobile: 2, tablet: 3, desktop: 4);
  }

  Widget _buildControlsBar(Responsive responsive) {
    final isCompact = responsive.isMobile;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: responsive.spacing,
        vertical: responsive.value(mobile: 12.0, tablet: 16.0),
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF1A1A1A),
        border: Border(
          top: BorderSide(color: Colors.white10),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _ControlButton(
              icon: _audioEnabled ? Icons.mic : Icons.mic_off,
              label: isCompact ? null : (_audioEnabled ? 'Mute' : 'Unmute'),
              isActive: _audioEnabled,
              onPressed: _toggleAudio,
            ),
            SizedBox(width: responsive.value(mobile: 8.0, tablet: 16.0)),
            _ControlButton(
              icon: _videoEnabled ? Icons.videocam : Icons.videocam_off,
              label: isCompact
                  ? null
                  : (_videoEnabled ? 'Stop Video' : 'Start Video'),
              isActive: _videoEnabled,
              onPressed: _toggleVideo,
            ),
            SizedBox(width: responsive.value(mobile: 8.0, tablet: 16.0)),
            _ControlButton(
              icon: _isScreenSharing
                  ? Icons.stop_screen_share
                  : Icons.screen_share,
              label: isCompact
                  ? null
                  : (_isScreenSharing ? 'Stop Share' : 'Share'),
              isActive: _isScreenSharing,
              onPressed: _toggleScreenShare,
            ),
            SizedBox(width: responsive.value(mobile: 8.0, tablet: 16.0)),
            _ControlButton(
              icon: Icons.chat_bubble_outline,
              label: isCompact ? null : 'Chat',
              isActive: false,
              onPressed: () {
                // TODO: Implement chat
              },
            ),
            SizedBox(width: responsive.value(mobile: 16.0, tablet: 32.0)),
            _ControlButton(
              icon: Icons.call_end,
              label: isCompact ? null : 'Leave',
              isActive: false,
              isDestructive: true,
              onPressed: _leaveConference,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSidePanel(QuickRTCState state) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Colors.white10),
            ),
          ),
          child: Row(
            children: [
              const Icon(Icons.people, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                'Participants (${state.participantCount + 1})',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(8),
            children: [
              _ParticipantListItem(
                name: _participantName ?? 'You',
                isLocal: true,
                audioEnabled: _audioEnabled,
                videoEnabled: _videoEnabled,
              ),
              ...state.participantList.map(
                (p) => _ParticipantListItem(
                  name: p.name,
                  isLocal: false,
                  audioEnabled: p.hasAudio,
                  videoEnabled: p.hasVideo,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _controller?.removeListener(_onStateChanged);
    _localRenderer.dispose();
    _screenShareRenderer.dispose();
    _localStream?.dispose();
    _screenShareMedia?.dispose();
    _socket?.disconnect();

    for (final renderer in _remoteRenderers.values) {
      renderer.dispose();
    }

    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }
}

/// Local video tile widget
class _LocalVideoTile extends StatelessWidget {
  final RTCVideoRenderer renderer;
  final String name;
  final bool audioEnabled;
  final bool videoEnabled;

  const _LocalVideoTile({
    required this.renderer,
    required this.name,
    required this.audioEnabled,
    required this.videoEnabled,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        color: const Color(0xFF2D2D2D),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (videoEnabled)
              RTCVideoView(
                renderer,
                mirror: true,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              )
            else
              Center(
                child: CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.grey[700],
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(fontSize: 32, color: Colors.white),
                  ),
                ),
              ),
            // Name and status overlay
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '$name (You)',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (!audioEnabled)
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Icon(
                          Icons.mic_off,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Remote participant video tile
class _RemoteParticipantTile extends StatelessWidget {
  final RemoteParticipant participant;
  final Map<String, RTCVideoRenderer> renderers;

  const _RemoteParticipantTile({
    required this.participant,
    required this.renderers,
  });

  @override
  Widget build(BuildContext context) {
    // Find the video or screenshare stream renderer
    RTCVideoRenderer? videoRenderer;
    for (final stream in participant.streams) {
      if (stream.type == StreamType.video ||
          stream.type == StreamType.screenshare) {
        videoRenderer = renderers[stream.id];
        if (videoRenderer != null) break;
      }
    }

    final showVideo = videoRenderer != null && participant.hasVideo;

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        color: const Color(0xFF2D2D2D),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (showVideo)
              RTCVideoView(
                videoRenderer,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              )
            else
              Center(
                child: CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.grey[700],
                  child: Text(
                    participant.name.isNotEmpty
                        ? participant.name[0].toUpperCase()
                        : '?',
                    style: const TextStyle(fontSize: 32, color: Colors.white),
                  ),
                ),
              ),
            // Name and status overlay
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        participant.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Show mic off icon if audio is not available
                    if (!participant.hasAudio)
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Icon(
                          Icons.mic_off,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Control button widget
class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String? label;
  final bool isActive;
  final bool isDestructive;
  final VoidCallback onPressed;

  const _ControlButton({
    required this.icon,
    this.label,
    required this.isActive,
    this.isDestructive = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDestructive
        ? Colors.red
        : isActive
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.white.withValues(alpha: 0.2);

    final iconColor = isDestructive
        ? Colors.white
        : isActive
            ? Colors.white
            : Colors.white70;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            onTap: onPressed,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(12),
              child: Icon(icon, color: iconColor, size: 24),
            ),
          ),
        ),
        if (label != null) ...[
          const SizedBox(height: 4),
          Text(
            label!,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey[400],
            ),
          ),
        ],
      ],
    );
  }
}

/// Participant list item for side panel
class _ParticipantListItem extends StatelessWidget {
  final String name;
  final bool isLocal;
  final bool audioEnabled;
  final bool videoEnabled;

  const _ParticipantListItem({
    required this.name,
    required this.isLocal,
    required this.audioEnabled,
    required this.videoEnabled,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: Colors.grey[700],
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: const TextStyle(fontSize: 14, color: Colors.white),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                if (isLocal)
                  Text(
                    'You',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                    ),
                  ),
              ],
            ),
          ),
          Icon(
            audioEnabled ? Icons.mic : Icons.mic_off,
            size: 18,
            color: audioEnabled ? Colors.grey[400] : Colors.red,
          ),
          const SizedBox(width: 8),
          Icon(
            videoEnabled ? Icons.videocam : Icons.videocam_off,
            size: 18,
            color: videoEnabled ? Colors.grey[400] : Colors.red,
          ),
        ],
      ),
    );
  }
}
