import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../providers/conference_provider.dart';
import '../utils/responsive.dart';

class ConferenceScreen extends StatefulWidget {
  const ConferenceScreen({super.key});

  @override
  State<ConferenceScreen> createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  late ConferenceProvider _provider;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _provider = ConferenceProvider();

      final args =
          ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      final conferenceId = args['conferenceId'] as String;
      final participantName = args['participantName'] as String;
      final serverUrl = args['serverUrl'] as String;

      // Join conference after the widget is built
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _provider.joinConference(
          conferenceId: conferenceId,
          participantName: participantName,
          serverUrl: serverUrl,
        );
      });
    }
  }

  @override
  void dispose() {
    _provider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Use ListenableBuilder directly to ensure rebuilds happen
    return ListenableBuilder(
      listenable: _provider,
      builder: (context, child) {
        debugPrint(
            'ListenableBuilder rebuild - audio: ${_provider.audioEnabled}, video: ${_provider.videoEnabled}');
        return _ConferenceView(provider: _provider);
      },
    );
  }
}

class _ConferenceView extends StatelessWidget {
  final ConferenceProvider provider;

  const _ConferenceView({required this.provider});

  @override
  Widget build(BuildContext context) {
    debugPrint(
        '_ConferenceView build - audioEnabled: ${provider.audioEnabled}, videoEnabled: ${provider.videoEnabled}');

    // Handle fullscreen changes
    if (provider.isFullScreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }

    return ResponsiveBuilder(
      builder: (context, responsive) {
        return Scaffold(
          backgroundColor: Colors.black,
          appBar: provider.isFullScreen
              ? null
              : AppBar(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  title: _buildAppBarTitle(context, provider),
                  actions: _buildAppBarActions(context, provider),
                ),
          body: SafeArea(
            child: _buildBody(context, provider, responsive),
          ),
        );
      },
    );
  }

  Widget _buildAppBarTitle(BuildContext context, ConferenceProvider provider) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: provider.isConnected ? Colors.green : Colors.orange,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                provider.isConnected ? Icons.circle : Icons.circle_outlined,
                size: 8,
                color: Colors.white,
              ),
              const SizedBox(width: 4),
              Text(
                provider.isConnected ? 'Live' : 'Connecting',
                style: const TextStyle(fontSize: 12, color: Colors.white),
              ),
            ],
          ),
        ),
        if (provider.conferenceId != null) ...[
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => _copyMeetingId(context, provider.conferenceId!),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  provider.conferenceId!,
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

  void _copyMeetingId(BuildContext context, String conferenceId) {
    Clipboard.setData(ClipboardData(text: conferenceId));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Meeting ID copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  List<Widget> _buildAppBarActions(
    BuildContext context,
    ConferenceProvider provider,
  ) {
    return [
      IconButton(
        icon: Icon(
            provider.isFullScreen ? Icons.fullscreen_exit : Icons.fullscreen),
        onPressed: () => provider.toggleFullScreen(),
        tooltip: provider.isFullScreen ? 'Exit fullscreen' : 'Fullscreen',
      ),
      IconButton(
        icon: const Icon(Icons.call_end),
        onPressed: () => _leaveConference(context, provider),
        color: Colors.red,
        tooltip: 'Leave meeting',
      ),
    ];
  }

  void _leaveConference(BuildContext context, ConferenceProvider provider) {
    provider.leaveConference();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    Navigator.pop(context);
  }

  Widget _buildBody(
    BuildContext context,
    ConferenceProvider provider,
    Responsive responsive,
  ) {
    if (provider.isJoining) {
      return _buildLoadingState();
    }

    if (provider.hasError) {
      return _buildErrorState(context, provider, responsive);
    }

    if (!provider.isConnected) {
      return _buildNotConnectedState();
    }

    return _buildConferenceView(context, provider, responsive);
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

  Widget _buildErrorState(
    BuildContext context,
    ConferenceProvider provider,
    Responsive responsive,
  ) {
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
                provider.errorMessage ?? 'Unknown error',
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
                    onPressed: () {
                      // Re-join with the same parameters
                      final args = ModalRoute.of(context)!.settings.arguments
                          as Map<String, dynamic>;
                      provider.joinConference(
                        conferenceId: args['conferenceId'] as String,
                        participantName: args['participantName'] as String,
                        serverUrl: args['serverUrl'] as String,
                      );
                    },
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

  Widget _buildConferenceView(
    BuildContext context,
    ConferenceProvider provider,
    Responsive responsive,
  ) {
    final totalParticipants = provider.remoteParticipants.length + 1;

    if (responsive.isMobile || (responsive.isTablet && responsive.isPortrait)) {
      return _buildMobileLayout(
          context, provider, responsive, totalParticipants);
    } else {
      return _buildDesktopLayout(
          context, provider, responsive, totalParticipants);
    }
  }

  Widget _buildMobileLayout(
    BuildContext context,
    ConferenceProvider provider,
    Responsive responsive,
    int totalParticipants,
  ) {
    return Column(
      children: [
        Expanded(
          child:
              _buildVideoGrid(context, provider, responsive, totalParticipants),
        ),
        _buildControlsBar(context, provider, responsive),
      ],
    );
  }

  Widget _buildDesktopLayout(
    BuildContext context,
    ConferenceProvider provider,
    Responsive responsive,
    int totalParticipants,
  ) {
    return Row(
      children: [
        Expanded(
          child: Column(
            children: [
              Expanded(
                child: _buildVideoGrid(
                    context, provider, responsive, totalParticipants),
              ),
              _buildControlsBar(context, provider, responsive),
            ],
          ),
        ),
        if (responsive.width > 1200)
          Container(
            width: 300,
            color: const Color(0xFF1E1E1E),
            child: _buildSidePanel(provider),
          ),
      ],
    );
  }

  Widget _buildVideoGrid(
    BuildContext context,
    ConferenceProvider provider,
    Responsive responsive,
    int totalParticipants,
  ) {
    final tiles = <Widget>[];

    debugPrint(
        '_buildVideoGrid - localRenderer: ${provider.localRenderer != null}, srcObject: ${provider.localRenderer?.srcObject?.id}');

    // Add local camera tile
    if (provider.localRenderer != null) {
      tiles.add(_LocalVideoTile(
        renderer: provider.localRenderer!,
        name: provider.participantName ?? 'You',
        audioEnabled: provider.audioEnabled,
        videoEnabled: provider.videoEnabled,
      ));
    }

    // Add local screen share tile if active
    if (provider.isScreenSharing && provider.screenShareRenderer != null) {
      tiles.add(_LocalScreenShareTile(
        renderer: provider.screenShareRenderer!,
        name: '${provider.participantName ?? 'You'} (Screen)',
      ));
    }

    // Add remote participants' tiles
    for (final participant in provider.remoteParticipants.values) {
      // Add video tiles
      for (final entry in participant.videoRenderers.entries) {
        // Check if this looks like a screenshare (based on stream id containing 'screen')
        final isScreenShare = entry.key.toLowerCase().contains('screen');
        tiles.add(_RemoteVideoTile(
          renderer: entry.value,
          name:
              isScreenShare ? '${participant.name} (Screen)' : participant.name,
          hasAudio: participant.hasAudio,
          isScreenShare: isScreenShare,
        ));
      }
      // Show avatar if participant has no video tiles
      if (participant.videoRenderers.isEmpty) {
        tiles.add(_RemoteAvatarTile(
          name: participant.name,
          hasAudio: participant.hasAudio,
        ));
      }
    }

    final crossAxisCount = _calculateGridColumns(responsive, tiles.length);

    // Collect audio renderers that need to be in the widget tree for playback
    final audioRenderers = <RTCVideoRenderer>[];
    for (final participant in provider.remoteParticipants.values) {
      audioRenderers.addAll(participant.audioRenderers.values);
    }

    return Stack(
      children: [
        // Main video grid
        Padding(
          padding: EdgeInsets.all(responsive.value(mobile: 4.0, tablet: 8.0)),
          child: GridView.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              childAspectRatio: 16 / 9,
              crossAxisSpacing: responsive.value(mobile: 4.0, tablet: 8.0),
              mainAxisSpacing: responsive.value(mobile: 4.0, tablet: 8.0),
            ),
            itemCount: tiles.length,
            itemBuilder: (context, index) => tiles[index],
          ),
        ),
        // Hidden audio players - must be in widget tree for web audio playback
        ...audioRenderers.map((renderer) => Positioned(
              left: -1000, // Off-screen
              child: SizedBox(
                width: 1,
                height: 1,
                child: RTCVideoView(renderer),
              ),
            )),
      ],
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

  Widget _buildControlsBar(
    BuildContext context,
    ConferenceProvider provider,
    Responsive responsive,
  ) {
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
              icon: provider.audioEnabled ? Icons.mic : Icons.mic_off,
              label: isCompact
                  ? null
                  : (provider.audioEnabled ? 'Mute' : 'Unmute'),
              isActive: provider.audioEnabled,
              onPressed: () => provider.toggleAudio(),
            ),
            SizedBox(width: responsive.value(mobile: 8.0, tablet: 16.0)),
            _ControlButton(
              icon: provider.videoEnabled ? Icons.videocam : Icons.videocam_off,
              label: isCompact
                  ? null
                  : (provider.videoEnabled ? 'Stop Video' : 'Start Video'),
              isActive: provider.videoEnabled,
              onPressed: () => provider.toggleVideo(),
            ),
            SizedBox(width: responsive.value(mobile: 8.0, tablet: 16.0)),
            _ControlButton(
              icon: provider.isScreenSharing
                  ? Icons.stop_screen_share
                  : Icons.screen_share,
              label: isCompact
                  ? null
                  : (provider.isScreenSharing ? 'Stop Share' : 'Share'),
              isActive: provider.isScreenSharing,
              onPressed: () => provider.toggleScreenShare(),
            ),
            SizedBox(width: responsive.value(mobile: 16.0, tablet: 32.0)),
            _ControlButton(
              icon: Icons.call_end,
              label: isCompact ? null : 'Leave',
              isActive: false,
              isDestructive: true,
              onPressed: () => _leaveConference(context, provider),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSidePanel(ConferenceProvider provider) {
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
                'Participants (${provider.remoteParticipants.length + 1})',
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
                name: provider.participantName ?? 'You',
                isLocal: true,
                audioEnabled: provider.audioEnabled,
                videoEnabled: provider.videoEnabled,
              ),
              ...provider.remoteParticipants.values.map(
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
    final hasVideoSource = renderer.srcObject != null;

    debugPrint(
        '_LocalVideoTile build - videoEnabled: $videoEnabled, hasVideoSource: $hasVideoSource, srcObject: ${renderer.srcObject?.id}');

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        color: const Color(0xFF2D2D2D),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (hasVideoSource && videoEnabled)
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

/// Local screen share tile widget
class _LocalScreenShareTile extends StatelessWidget {
  final RTCVideoRenderer renderer;
  final String name;

  const _LocalScreenShareTile({
    required this.renderer,
    required this.name,
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
            RTCVideoView(
              renderer,
              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain,
            ),
            Positioned(
              top: 8,
              left: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.screen_share, size: 14, color: Colors.white),
                    SizedBox(width: 4),
                    Text(
                      'Screen',
                      style: TextStyle(fontSize: 12, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
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
                child: Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Remote video tile widget
class _RemoteVideoTile extends StatelessWidget {
  final RTCVideoRenderer renderer;
  final String name;
  final bool hasAudio;
  final bool isScreenShare;

  const _RemoteVideoTile({
    required this.renderer,
    required this.name,
    required this.hasAudio,
    this.isScreenShare = false,
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
            RTCVideoView(
              renderer,
              objectFit: isScreenShare
                  ? RTCVideoViewObjectFit.RTCVideoViewObjectFitContain
                  : RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
            ),
            if (isScreenShare)
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.screen_share, size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Screen',
                        style: TextStyle(fontSize: 12, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
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
                        name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (!hasAudio && !isScreenShare)
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

/// Remote avatar tile widget
class _RemoteAvatarTile extends StatelessWidget {
  final String name;
  final bool hasAudio;

  const _RemoteAvatarTile({
    required this.name,
    required this.hasAudio,
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
                        name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (!hasAudio)
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

/// Participant list item
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
