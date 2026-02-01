import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_audio_renderer.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_provider.dart';

/// Signature for the builder function which takes [BuildContext],
/// [QuickRTCState], and [QuickRTCController] and returns a widget.
typedef QuickRTCConferenceBuilder = Widget Function(
  BuildContext context,
  QuickRTCState state,
  QuickRTCController controller,
);

/// Signature for the loading builder function.
typedef QuickRTCLoadingBuilder = Widget Function(BuildContext context);

/// Signature for the error builder function.
typedef QuickRTCConferenceErrorBuilder = Widget Function(
  BuildContext context,
  Object error,
  VoidCallback retry,
);

/// A batteries-included widget for joining and managing a WebRTC conference.
///
/// This widget handles the complete lifecycle of a conference:
/// - Connects to the server
/// - Joins the specified conference
/// - Manages the controller lifecycle
/// - Automatically renders remote audio (via [QuickRTCAudioRenderers])
/// - Provides error handling and retry functionality
/// - Cleans up resources on dispose
///
/// ## Basic Usage
///
/// ```dart
/// QuickRTCConference(
///   serverUrl: 'https://your-server.com',
///   conferenceId: 'room-123',
///   participantName: 'Alice',
///   builder: (context, state, controller) {
///     return VideoGrid(
///       participants: state.participantList,
///       localVideoStream: state.localVideoStream,
///     );
///   },
/// )
/// ```
///
/// ## With Custom Loading and Error Handling
///
/// ```dart
/// QuickRTCConference(
///   serverUrl: 'https://your-server.com',
///   conferenceId: 'room-123',
///   participantName: 'Alice',
///   loadingBuilder: (context) => Center(
///     child: CircularProgressIndicator(),
///   ),
///   errorBuilder: (context, error, retry) => Center(
///     child: Column(
///       mainAxisSize: MainAxisSize.min,
///       children: [
///         Text('Failed to connect: $error'),
///         ElevatedButton(onPressed: retry, child: Text('Retry')),
///       ],
///     ),
///   ),
///   onJoined: (controller) {
///     // Called when successfully joined
///     controller.enableMedia();
///   },
///   onLeft: () {
///     // Called when left the conference
///     Navigator.of(context).pop();
///   },
///   builder: (context, state, controller) {
///     return YourConferenceUI(state: state, controller: controller);
///   },
/// )
/// ```
///
/// ## Features
///
/// - **Auto-connect**: Automatically connects to server and joins conference
/// - **Auto-audio**: Includes [QuickRTCAudioRenderers] for remote audio playback
/// - **Lifecycle management**: Creates and disposes controller automatically
/// - **Error handling**: Built-in error states with retry capability
/// - **Provider included**: Wraps children in [QuickRTCProvider] for easy access
class QuickRTCConference extends StatefulWidget {
  /// The WebRTC server URL to connect to.
  final String serverUrl;

  /// The conference/room ID to join.
  final String conferenceId;

  /// The local participant's display name.
  final String participantName;

  /// Optional conference display name.
  final String? conferenceName;

  /// Optional custom participant ID (generated if not provided).
  final String? participantId;

  /// Optional additional participant information.
  final Map<String, dynamic>? participantInfo;

  /// Builder function that returns the main conference UI.
  ///
  /// Receives the current [QuickRTCState] and [QuickRTCController].
  final QuickRTCConferenceBuilder builder;

  /// Optional builder for the loading state.
  ///
  /// If not provided, shows a centered [CircularProgressIndicator].
  final QuickRTCLoadingBuilder? loadingBuilder;

  /// Optional builder for error states.
  ///
  /// If not provided, shows a simple error message with retry button.
  /// The [retry] callback can be called to attempt reconnection.
  final QuickRTCConferenceErrorBuilder? errorBuilder;

  /// Called when successfully joined the conference.
  ///
  /// Useful for enabling media or other setup after joining.
  final void Function(QuickRTCController controller)? onJoined;

  /// Called when the conference is left (either intentionally or due to error).
  final VoidCallback? onLeft;

  /// Called when an error occurs.
  final void Function(Object error)? onError;

  /// Enable debug logging in the controller.
  final bool debug;

  /// Maximum participants allowed (0 = unlimited).
  final int maxParticipants;

  /// Timeout for initial connection.
  final Duration connectionTimeout;

  /// Timeout for socket operations.
  final Duration socketTimeout;

  /// Timeout for producer/consumer operations.
  final Duration operationTimeout;

  /// Extra headers to include in the socket connection.
  final Map<String, String>? extraHeaders;

  /// Query parameters to include in the socket connection.
  final Map<String, dynamic>? query;

  /// Whether to automatically include [QuickRTCAudioRenderers].
  ///
  /// If true (default), remote audio will be rendered automatically.
  /// Set to false if you want to handle audio rendering yourself.
  final bool autoRenderAudio;

  /// Creates a QuickRTCConference widget.
  const QuickRTCConference({
    super.key,
    required this.serverUrl,
    required this.conferenceId,
    required this.participantName,
    this.conferenceName,
    this.participantId,
    this.participantInfo,
    required this.builder,
    this.loadingBuilder,
    this.errorBuilder,
    this.onJoined,
    this.onLeft,
    this.onError,
    this.debug = false,
    this.maxParticipants = 0,
    this.connectionTimeout = const Duration(seconds: 10),
    this.socketTimeout = const Duration(seconds: 30),
    this.operationTimeout = const Duration(seconds: 30),
    this.extraHeaders,
    this.query,
    this.autoRenderAudio = true,
  });

  @override
  State<QuickRTCConference> createState() => _QuickRTCConferenceState();
}

class _QuickRTCConferenceState extends State<QuickRTCConference> {
  QuickRTCController? _controller;
  Object? _error;
  bool _isConnecting = true;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  @override
  void didUpdateWidget(QuickRTCConference oldWidget) {
    super.didUpdateWidget(oldWidget);

    // If key connection parameters changed, reconnect
    if (widget.serverUrl != oldWidget.serverUrl ||
        widget.conferenceId != oldWidget.conferenceId ||
        widget.participantId != oldWidget.participantId) {
      _disconnect();
      _connect();
    }
  }

  @override
  void dispose() {
    _disconnect();
    super.dispose();
  }

  Future<void> _connect() async {
    setState(() {
      _isConnecting = true;
      _error = null;
    });

    try {
      final controller = await QuickRTCController.connect(
        serverUrl: widget.serverUrl,
        conferenceId: widget.conferenceId,
        participantName: widget.participantName,
        conferenceName: widget.conferenceName,
        participantId: widget.participantId,
        participantInfo: widget.participantInfo,
        debug: widget.debug,
        maxParticipants: widget.maxParticipants,
        connectionTimeout: widget.connectionTimeout,
        socketTimeout: widget.socketTimeout,
        operationTimeout: widget.operationTimeout,
        extraHeaders: widget.extraHeaders,
        query: widget.query,
      );

      if (!mounted) {
        controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _isConnecting = false;
      });

      // Add listener for state changes
      controller.addListener(_onControllerStateChange);

      // Notify callback
      widget.onJoined?.call(controller);
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e;
        _isConnecting = false;
      });

      widget.onError?.call(e);
    }
  }

  void _disconnect() {
    final controller = _controller;
    if (controller != null) {
      controller.removeListener(_onControllerStateChange);
      controller.dispose();
      _controller = null;
      widget.onLeft?.call();
    }
  }

  void _onControllerStateChange() {
    final controller = _controller;
    if (controller == null) return;

    // Check for errors in state
    if (controller.state.hasError && controller.state.error != null) {
      widget.onError?.call(controller.state.error!);
    }

    // Trigger rebuild
    if (mounted) {
      setState(() {});
    }
  }

  void _retry() {
    _disconnect();
    _connect();
  }

  @override
  Widget build(BuildContext context) {
    // Loading state
    if (_isConnecting) {
      return widget.loadingBuilder?.call(context) ??
          const Center(child: CircularProgressIndicator());
    }

    // Error state
    if (_error != null) {
      return widget.errorBuilder?.call(context, _error!, _retry) ??
          _buildDefaultError(context);
    }

    // Connected state
    final controller = _controller;
    if (controller == null) {
      // Should not happen, but handle gracefully
      return widget.loadingBuilder?.call(context) ??
          const Center(child: CircularProgressIndicator());
    }

    // Warn in debug mode if audio renderers might be missing
    if (kDebugMode && !widget.autoRenderAudio) {
      _warnAboutMissingAudioRenderers(controller.state);
    }

    // Build the main content with provider
    Widget content = QuickRTCProvider(
      controller: controller,
      child: widget.builder(context, controller.state, controller),
    );

    // Add audio renderers if enabled
    if (widget.autoRenderAudio) {
      content = Stack(
        children: [
          content,
          // Audio renderers (invisible, positioned at bottom)
          Positioned(
            bottom: 0,
            left: 0,
            child: QuickRTCAudioRenderers(
              participants: controller.state.participantList,
            ),
          ),
        ],
      );
    }

    return content;
  }

  Widget _buildDefaultError(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to join conference',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _error.toString(),
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _retry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  void _warnAboutMissingAudioRenderers(QuickRTCState state) {
    final hasRemoteAudio = state.participantList.any(
      (p) => p.audioStream != null,
    );
    if (hasRemoteAudio) {
      debugPrint(
        'QuickRTCConference: Remote audio streams exist but autoRenderAudio is false. '
        'Make sure to include QuickRTCAudioRenderers in your widget tree to hear remote participants.',
      );
    }
  }
}
