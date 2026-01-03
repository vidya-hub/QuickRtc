import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../utils/responsive.dart';

class ConferenceScreen extends StatefulWidget {
  const ConferenceScreen({super.key});

  @override
  State<ConferenceScreen> createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  // QuickRTC instance
  QuickRTC? _rtc;
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
  bool _isConnected = false;
  String? _error;
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _isFullScreen = false;
  String? _conferenceId;
  String? _participantName;

  // Local streams from QuickRTC
  final Map<String, LocalStream> _localStreams = {};

  // Remote participants and their streams
  final Map<String, _RemoteParticipant> _remoteParticipants = {};

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

      setState(() => _isConnected = true);

      // Get local media using the new API
      final localMedia = await QuickRTC.getLocalMedia(MediaConfig.audioVideo(
        videoConfig: VideoConfig.frontCamera,
      ));
      _localStream = localMedia.stream;
      _localRenderer.srcObject = _localStream;

      // Produce media using tracks with types
      final localStreams = await _rtc!.produce(
        ProduceInput.fromTracksWithTypes(localMedia.tracksWithTypes),
      );

      for (final stream in localStreams) {
        _localStreams[stream.id] = stream;
      }

      setState(() {});
    } catch (e, stackTrace) {
      debugPrint('Error joining conference: $e');
      debugPrint('Stack trace: $stackTrace');
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isJoining = false);
    }
  }

  void _setupEventListeners() {
    _rtc!.on<NewParticipantEvent>('newParticipant', (event) {
      setState(() {
        final participant = _remoteParticipants.putIfAbsent(
          event.participantId,
          () => _RemoteParticipant(
            id: event.participantId,
            name: event.participantName,
          ),
        );

        for (final stream in event.streams) {
          participant.addStream(stream);
        }
      });
    });

    _rtc!.on<ParticipantLeftEvent>('participantLeft', (event) {
      setState(() {
        final participant = _remoteParticipants.remove(event.participantId);
        participant?.dispose();
      });
    });

    _rtc!.on<StreamAddedEvent>('streamAdded', (event) {
      setState(() {
        final participant = _remoteParticipants[event.participantId];
        participant?.addStream(event);
      });
    });

    _rtc!.on<StreamRemovedEvent>('streamRemoved', (event) {
      setState(() {
        final participant = _remoteParticipants[event.participantId];
        participant?.removeStream(event.streamId);
      });
    });

    _rtc!.on<StreamPausedEvent>('streamPaused', (event) {
      setState(() {
        final participant = _remoteParticipants[event.participantId];
        if (participant != null) {
          if (event.type == StreamType.audio) {
            participant.audioEnabled = false;
          } else if (event.type == StreamType.video) {
            participant.videoEnabled = false;
          }
        }
      });
    });

    _rtc!.on<StreamResumedEvent>('streamResumed', (event) {
      setState(() {
        final participant = _remoteParticipants[event.participantId];
        if (participant != null) {
          if (event.type == StreamType.audio) {
            participant.audioEnabled = true;
          } else if (event.type == StreamType.video) {
            participant.videoEnabled = true;
          }
        }
      });
    });

    _rtc!.on<DisconnectedEvent>('disconnected', (event) {
      setState(() {
        _isConnected = false;
        _error = 'Disconnected: ${event.reason}';
      });
    });

    _rtc!.on<ErrorEvent>('error', (event) {
      setState(() {
        _error = event.message;
      });
    });
  }

  Future<void> _toggleAudio() async {
    if (_localStream == null) return;

    final audioTracks = _localStream!.getAudioTracks();
    if (audioTracks.isEmpty) return;

    setState(() => _audioEnabled = !_audioEnabled);

    for (final track in audioTracks) {
      track.enabled = _audioEnabled;
    }

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
  }

  Future<void> _toggleVideo() async {
    if (_localStream == null) return;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isEmpty) return;

    setState(() => _videoEnabled = !_videoEnabled);

    for (final track in videoTracks) {
      track.enabled = _videoEnabled;
    }

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
  }

  Future<void> _toggleScreenShare() async {
    if (!_isConnected) return;

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
      // Get screen share media
      _screenShareMedia = await QuickRTC.getLocalMedia(
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
      final screenStreams = await _rtc!.produce(
        ProduceInput.fromTrack(
          _screenShareMedia!.screenshareTrack!,
          type: StreamType.screenshare,
        ),
      );

      for (final stream in screenStreams) {
        _localStreams[stream.id] = stream;
      }

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
      final screenShareStreams = _localStreams.entries
          .where((e) => e.value.type == StreamType.screenshare)
          .toList();

      for (final entry in screenShareStreams) {
        await entry.value.stop();
        _localStreams.remove(entry.key);
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
      await _rtc?.leave();
    } catch (e) {
      debugPrint('Error leaving: $e');
    }

    _localStream?.dispose();
    _socket?.disconnect();

    for (final participant in _remoteParticipants.values) {
      participant.dispose();
    }

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
        return Scaffold(
          backgroundColor: Colors.black,
          appBar: _isFullScreen
              ? null
              : AppBar(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  title: _buildAppBarTitle(),
                  actions: _buildAppBarActions(responsive),
                ),
          body: SafeArea(
            child: _buildBody(responsive),
          ),
        );
      },
    );
  }

  Widget _buildAppBarTitle() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _isConnected ? Colors.green : Colors.orange,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _isConnected ? Icons.circle : Icons.circle_outlined,
                size: 8,
                color: Colors.white,
              ),
              const SizedBox(width: 4),
              Text(
                _isConnected ? 'Live' : 'Connecting',
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

  Widget _buildBody(Responsive responsive) {
    if (_isJoining) {
      return _buildLoadingState();
    }

    if (_error != null) {
      return _buildErrorState(responsive);
    }

    if (!_isConnected) {
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
    final totalParticipants = _remoteParticipants.length + 1; // +1 for local

    // Choose layout based on screen size and participant count
    if (responsive.isMobile || (responsive.isTablet && responsive.isPortrait)) {
      return _buildMobileLayout(responsive, totalParticipants);
    } else {
      return _buildDesktopLayout(responsive, totalParticipants);
    }
  }

  Widget _buildMobileLayout(Responsive responsive, int totalParticipants) {
    return Column(
      children: [
        // Video grid
        Expanded(
          child: _buildVideoGrid(responsive, totalParticipants),
        ),
        // Controls
        _buildControlsBar(responsive),
      ],
    );
  }

  Widget _buildDesktopLayout(Responsive responsive, int totalParticipants) {
    return Row(
      children: [
        // Main video area
        Expanded(
          child: Column(
            children: [
              Expanded(
                child: _buildVideoGrid(responsive, totalParticipants),
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
            child: _buildSidePanel(),
          ),
      ],
    );
  }

  Widget _buildVideoGrid(Responsive responsive, int totalParticipants) {
    final participants = [
      _LocalParticipantWrapper(
        renderer: _localRenderer,
        name: _participantName ?? 'You',
        audioEnabled: _audioEnabled,
        videoEnabled: _videoEnabled,
      ),
      ..._remoteParticipants.values,
    ];

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
        itemCount: participants.length,
        itemBuilder: (context, index) {
          final participant = participants[index];
          if (participant is _LocalParticipantWrapper) {
            return _LocalVideoTile(
              renderer: participant.renderer,
              name: participant.name,
              audioEnabled: participant.audioEnabled,
              videoEnabled: participant.videoEnabled,
            );
          } else if (participant is _RemoteParticipant) {
            return _RemoteParticipantTile(participant: participant);
          }
          return const SizedBox();
        },
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

  Widget _buildSidePanel() {
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
                'Participants (${_remoteParticipants.length + 1})',
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
              ..._remoteParticipants.values.map(
                (p) => _ParticipantListItem(
                  name: p.name,
                  isLocal: false,
                  audioEnabled: p.audioEnabled,
                  videoEnabled: p.videoEnabled,
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
    _localRenderer.dispose();
    _screenShareRenderer.dispose();
    _localStream?.dispose();
    _screenShareMedia?.dispose();
    _socket?.disconnect();

    for (final participant in _remoteParticipants.values) {
      participant.dispose();
    }

    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }
}

// Helper wrapper for local participant in grid
class _LocalParticipantWrapper {
  final RTCVideoRenderer renderer;
  final String name;
  final bool audioEnabled;
  final bool videoEnabled;

  _LocalParticipantWrapper({
    required this.renderer,
    required this.name,
    required this.audioEnabled,
    required this.videoEnabled,
  });
}

/// Remote participant state manager
class _RemoteParticipant {
  final String id;
  final String name;
  final Map<String, RemoteStream> streams = {};
  final Map<String, RTCVideoRenderer> renderers = {};

  /// Whether audio is enabled (not muted/paused)
  bool audioEnabled = true;

  /// Whether video is enabled (not muted/paused)
  bool videoEnabled = true;

  MediaStream? get videoStream {
    final videoStreamEntry = streams.entries
        .where((e) =>
            e.value.type == StreamType.video ||
            e.value.type == StreamType.screenshare)
        .firstOrNull;
    return videoStreamEntry?.value.stream;
  }

  bool get hasAudio => streams.values.any((s) => s.type == StreamType.audio);
  bool get hasVideo => streams.values.any((s) => s.type == StreamType.video);

  _RemoteParticipant({required this.id, required this.name});

  Future<void> addStream(RemoteStream stream) async {
    streams[stream.id] = stream;

    // When a stream is added, mark it as enabled
    if (stream.type == StreamType.audio) {
      audioEnabled = true;
    } else if (stream.type == StreamType.video ||
        stream.type == StreamType.screenshare) {
      videoEnabled = true;
      final renderer = RTCVideoRenderer();
      await renderer.initialize();
      renderer.srcObject = stream.stream;
      renderers[stream.id] = renderer;
    }
  }

  void removeStream(String streamId) {
    final stream = streams.remove(streamId);
    final renderer = renderers.remove(streamId);
    renderer?.dispose();

    // When a stream is removed, check if any streams of that type remain
    if (stream != null) {
      if (stream.type == StreamType.audio) {
        audioEnabled = hasAudio;
      } else if (stream.type == StreamType.video ||
          stream.type == StreamType.screenshare) {
        videoEnabled = hasVideo;
      }
    }
  }

  void dispose() {
    for (final renderer in renderers.values) {
      renderer.dispose();
    }
    renderers.clear();
    streams.clear();
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
  final _RemoteParticipant participant;

  const _RemoteParticipantTile({required this.participant});

  @override
  Widget build(BuildContext context) {
    final videoRenderer = participant.renderers.values.firstOrNull;
    // Show video only if we have a renderer AND video is enabled (not paused)
    final showVideo = videoRenderer != null && participant.videoEnabled;

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
                    // Show mic off icon if audio is disabled (muted/paused)
                    if (!participant.audioEnabled)
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
