import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/types.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_theme.dart';

/// State data exposed by the renderer
///
/// Can be used to build custom overlays based on renderer state.
class QuickRTCMediaRendererState {
  /// Whether video is enabled (from track or explicit override)
  final bool isVideoEnabled;

  /// Whether audio is enabled (from track or explicit override)
  final bool isAudioEnabled;

  /// Whether video tracks are present in the stream
  final bool hasVideoTracks;

  /// Whether the renderer is still initializing
  final bool isLoading;

  /// Whether a stream is attached
  final bool hasStream;

  const QuickRTCMediaRendererState({
    required this.isVideoEnabled,
    required this.isAudioEnabled,
    required this.hasVideoTracks,
    required this.isLoading,
    required this.hasStream,
  });

  /// Whether video should be displayed (enabled and has tracks)
  bool get shouldShowVideo => isVideoEnabled && hasVideoTracks && !isLoading;
}

/// All-in-one media renderer widget with customizable overlays
///
/// Handles:
/// - Video rendering with automatic RTCVideoRenderer lifecycle
/// - Audio state tracking and display
/// - Android track timing (onAddTrack listener)
/// - Customizable overlays (audio/video indicators, name, etc.)
/// - Theme integration via [QuickRTCTheme]
///
/// ## Basic Usage
///
/// ```dart
/// QuickRTCMediaRenderer(
///   stream: localStream,
///   mirror: true,
///   participantName: 'You',
///   isAudioEnabled: !state.isLocalAudioPaused,
///   isVideoEnabled: !state.isLocalVideoPaused,
/// )
/// ```
///
/// ## Using with RemoteStream
///
/// ```dart
/// QuickRTCMediaRenderer(
///   remoteStream: participant.videoStream,
///   participantName: participant.name,
///   isAudioEnabled: participant.hasAudio,
///   isVideoEnabled: participant.hasVideo,
/// )
/// ```
///
/// ## Full Customization
///
/// ```dart
/// QuickRTCMediaRenderer(
///   stream: stream,
///   participantName: 'John',
///   isLocal: false,
///   showAudioIndicator: true,
///   showVideoIndicator: true,
///   showName: true,
///   audioIndicatorPosition: OverlayPosition.topRight,
///   namePosition: OverlayPosition.bottomLeft,
///   audioIndicatorBuilder: (context, enabled) => MyCustomIndicator(enabled),
///   placeholderBuilder: (context, name) => MyAvatar(name),
///   overlayBuilder: (context, state) => MyCustomOverlay(state),
///   onTap: () => _focusParticipant(),
/// )
/// ```
class QuickRTCMediaRenderer extends StatefulWidget {
  // ============================================================================
  // STREAM INPUT (use one of these)
  // ============================================================================

  /// Direct MediaStream to render
  final MediaStream? stream;

  /// LocalStream from state (convenience accessor)
  final LocalStream? localStream;

  /// RemoteStream from participant (convenience accessor)
  final RemoteStream? remoteStream;

  // ============================================================================
  // VIDEO OPTIONS
  // ============================================================================

  /// Mirror the video (typically true for local/front camera)
  final bool mirror;

  /// How to fit the video in the container
  final RTCVideoViewObjectFit objectFit;

  // ============================================================================
  // STATE (null = derive from stream/tracks)
  // ============================================================================

  /// Audio enabled state override (null = derive from track.enabled)
  final bool? isAudioEnabled;

  /// Video enabled state override (null = derive from track.enabled)
  final bool? isVideoEnabled;

  // ============================================================================
  // PARTICIPANT INFO
  // ============================================================================

  /// Participant/user name for display
  final String? participantName;

  /// Whether this is the local user (affects name display)
  final bool isLocal;

  // ============================================================================
  // OVERLAY VISIBILITY
  // ============================================================================

  /// Show audio mute/unmute indicator
  final bool showAudioIndicator;

  /// Show video on/off indicator (shown only when video is off)
  final bool showVideoIndicator;

  /// Show participant name overlay
  final bool showName;

  /// Show "(You)" label for local participant
  final bool showLocalLabel;

  // ============================================================================
  // OVERLAY POSITIONS
  // ============================================================================

  /// Position for audio indicator (null = use theme default)
  final OverlayPosition? audioIndicatorPosition;

  /// Position for video indicator (null = use theme default)
  final OverlayPosition? videoIndicatorPosition;

  /// Position for name overlay (null = use theme default)
  final OverlayPosition? namePosition;

  /// Custom position for audio indicator (overrides audioIndicatorPosition)
  final CustomPosition? audioCustomPosition;

  /// Custom position for video indicator (overrides videoIndicatorPosition)
  final CustomPosition? videoCustomPosition;

  /// Custom position for name overlay (overrides namePosition)
  final CustomPosition? nameCustomPosition;

  // ============================================================================
  // CUSTOM BUILDERS
  // ============================================================================

  /// Custom audio indicator builder
  ///
  /// ```dart
  /// audioIndicatorBuilder: (context, isEnabled) => Container(
  ///   padding: EdgeInsets.all(4),
  ///   decoration: BoxDecoration(
  ///     color: isEnabled ? Colors.green : Colors.red,
  ///     borderRadius: BorderRadius.circular(4),
  ///   ),
  ///   child: Icon(isEnabled ? Icons.mic : Icons.mic_off, size: 14),
  /// )
  /// ```
  final Widget Function(BuildContext context, bool isEnabled)?
      audioIndicatorBuilder;

  /// Custom video indicator builder
  final Widget Function(BuildContext context, bool isEnabled)?
      videoIndicatorBuilder;

  /// Custom name overlay builder
  ///
  /// ```dart
  /// nameOverlayBuilder: (context, name, isLocal) => Text(
  ///   isLocal ? '$name (You)' : name,
  ///   style: TextStyle(color: Colors.white),
  /// )
  /// ```
  final Widget Function(BuildContext context, String name, bool isLocal)?
      nameOverlayBuilder;

  /// Custom placeholder builder (shown when no video)
  ///
  /// ```dart
  /// placeholderBuilder: (context, name) => CircleAvatar(
  ///   child: Text(name?[0] ?? '?'),
  /// )
  /// ```
  final Widget Function(BuildContext context, String? name)? placeholderBuilder;

  /// Custom loading builder (shown while initializing)
  final Widget Function(BuildContext context)? loadingBuilder;

  /// Builder for additional custom overlays
  ///
  /// Use this to add any custom overlay based on the renderer state.
  /// ```dart
  /// overlayBuilder: (context, state) => state.isLoading
  ///   ? Positioned(top: 8, right: 8, child: LoadingSpinner())
  ///   : SizedBox.shrink()
  /// ```
  final Widget Function(BuildContext context, QuickRTCMediaRendererState state)?
      overlayBuilder;

  // ============================================================================
  // STYLING
  // ============================================================================

  /// Container decoration (overrides theme)
  final BoxDecoration? containerDecoration;

  /// Border radius (overrides theme)
  final BorderRadius? borderRadius;

  /// Padding for overlay elements
  final EdgeInsets overlayPadding;

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  /// Called when the renderer is tapped
  final VoidCallback? onTap;

  /// Called when the renderer is double-tapped
  final VoidCallback? onDoubleTap;

  /// Called when the renderer is long-pressed
  final VoidCallback? onLongPress;

  /// Called when renderer state changes (video tracks added, etc.)
  final void Function(QuickRTCMediaRendererState state)? onStateChanged;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  const QuickRTCMediaRenderer({
    super.key,
    // Stream input
    this.stream,
    this.localStream,
    this.remoteStream,
    // Video options
    this.mirror = false,
    this.objectFit = RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
    // State
    this.isAudioEnabled,
    this.isVideoEnabled,
    // Participant info
    this.participantName,
    this.isLocal = false,
    // Overlay visibility
    this.showAudioIndicator = true,
    this.showVideoIndicator = false,
    this.showName = true,
    this.showLocalLabel = true,
    // Positions
    this.audioIndicatorPosition,
    this.videoIndicatorPosition,
    this.namePosition,
    this.audioCustomPosition,
    this.videoCustomPosition,
    this.nameCustomPosition,
    // Custom builders
    this.audioIndicatorBuilder,
    this.videoIndicatorBuilder,
    this.nameOverlayBuilder,
    this.placeholderBuilder,
    this.loadingBuilder,
    this.overlayBuilder,
    // Styling
    this.containerDecoration,
    this.borderRadius,
    this.overlayPadding = const EdgeInsets.all(8),
    // Callbacks
    this.onTap,
    this.onDoubleTap,
    this.onLongPress,
    this.onStateChanged,
  });

  @override
  State<QuickRTCMediaRenderer> createState() => _QuickRTCMediaRendererState();
}

class _QuickRTCMediaRendererState extends State<QuickRTCMediaRenderer> {
  final RTCVideoRenderer _renderer = RTCVideoRenderer();
  bool _initialized = false;
  bool _hasVideoTracks = false;

  // ============================================================================
  // DERIVED PROPERTIES
  // ============================================================================

  MediaStream? get _stream =>
      widget.stream ??
      widget.localStream?.stream ??
      widget.remoteStream?.stream;

  bool get _isAudioEnabled {
    if (widget.isAudioEnabled != null) return widget.isAudioEnabled!;
    // Try to derive from track
    final stream = _stream;
    if (stream == null) return false;
    final audioTracks = stream.getAudioTracks();
    return audioTracks.isNotEmpty && audioTracks.first.enabled;
  }

  bool get _isVideoEnabled {
    if (widget.isVideoEnabled != null) return widget.isVideoEnabled!;
    // Try to derive from track
    final stream = _stream;
    if (stream == null) return false;
    final videoTracks = stream.getVideoTracks();
    return videoTracks.isNotEmpty && videoTracks.first.enabled;
  }

  QuickRTCMediaRendererState get _rendererState => QuickRTCMediaRendererState(
        isVideoEnabled: _isVideoEnabled,
        isAudioEnabled: _isAudioEnabled,
        hasVideoTracks: _hasVideoTracks,
        isLoading: !_initialized,
        hasStream: _stream != null,
      );

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  @override
  void initState() {
    super.initState();
    _initRenderer();
  }

  @override
  void didUpdateWidget(QuickRTCMediaRenderer oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Check if stream changed
    final oldStream = oldWidget.stream ??
        oldWidget.localStream?.stream ??
        oldWidget.remoteStream?.stream;

    if (_stream != oldStream) {
      _updateStream();
    }
  }

  @override
  void dispose() {
    // Clear srcObject before disposal to prevent errors on Android
    _renderer.srcObject = null;
    _renderer.dispose();
    super.dispose();
  }

  Future<void> _initRenderer() async {
    try {
      await _renderer.initialize();
      if (mounted) {
        setState(() => _initialized = true);
        _updateStream();
      }
    } catch (e) {
      debugPrint('QuickRTCMediaRenderer: Failed to initialize renderer: $e');
    }
  }

  void _updateStream() {
    if (!_initialized) return;

    final stream = _stream;
    if (stream == null) {
      _renderer.srcObject = null;
      if (mounted) setState(() => _hasVideoTracks = false);
      _notifyStateChanged();
      return;
    }

    _renderer.srcObject = stream;
    _hasVideoTracks = stream.getVideoTracks().isNotEmpty;

    // Android: listen for track additions (tracks may arrive after stream)
    stream.onAddTrack = (track) {
      if (mounted && track.kind == 'video') {
        setState(() => _hasVideoTracks = true);
        _notifyStateChanged();
      }
    };

    stream.onRemoveTrack = (track) {
      if (mounted && track.kind == 'video') {
        setState(() {
          _hasVideoTracks = _stream?.getVideoTracks().isNotEmpty ?? false;
        });
        _notifyStateChanged();
      }
    };

    if (mounted) {
      setState(() {});
      _notifyStateChanged();
    }
  }

  void _notifyStateChanged() {
    widget.onStateChanged?.call(_rendererState);
  }

  // ============================================================================
  // BUILD
  // ============================================================================

  @override
  Widget build(BuildContext context) {
    final theme = QuickRTCTheme.of(context);

    return GestureDetector(
      onTap: widget.onTap,
      onDoubleTap: widget.onDoubleTap,
      onLongPress: widget.onLongPress,
      child: ClipRRect(
        borderRadius: widget.borderRadius ?? theme.containerBorderRadius,
        child: Container(
          decoration: widget.containerDecoration ??
              theme.containerDecoration ??
              BoxDecoration(color: theme.containerBackgroundColor),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Video or placeholder
              _buildVideoOrPlaceholder(context, theme),

              // Name overlay (at the bottom with gradient)
              if (widget.showName && widget.participantName != null)
                _buildNameOverlay(context, theme),

              // Audio indicator
              if (widget.showAudioIndicator)
                _buildAudioIndicator(context, theme),

              // Video indicator (only when video is off)
              if (widget.showVideoIndicator && !_isVideoEnabled)
                _buildVideoIndicator(context, theme),

              // Custom overlay
              if (widget.overlayBuilder != null)
                widget.overlayBuilder!(context, _rendererState),
            ],
          ),
        ),
      ),
    );
  }

  // ============================================================================
  // VIDEO/PLACEHOLDER
  // ============================================================================

  Widget _buildVideoOrPlaceholder(
      BuildContext context, QuickRTCThemeData theme,) {
    // Show loading
    if (!_initialized) {
      if (widget.loadingBuilder != null) {
        return widget.loadingBuilder!(context);
      }
      return Center(
        child: theme.loadingWidget ??
            CircularProgressIndicator(color: theme.loadingIndicatorColor),
      );
    }

    // Show video if available and enabled
    final showVideo = _stream != null && _hasVideoTracks && _isVideoEnabled;

    if (showVideo) {
      return RTCVideoView(
        _renderer,
        mirror: widget.mirror,
        objectFit: widget.objectFit,
      );
    }

    // Show placeholder
    if (widget.placeholderBuilder != null) {
      return widget.placeholderBuilder!(context, widget.participantName);
    }

    return _defaultPlaceholder(context, theme);
  }

  Widget _defaultPlaceholder(BuildContext context, QuickRTCThemeData theme) {
    final name = widget.participantName;
    return Center(
      child: CircleAvatar(
        radius: theme.placeholderAvatarRadius,
        backgroundColor: theme.placeholderBackgroundColor,
        child: Text(
          name != null && name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: theme.placeholderTextStyle,
        ),
      ),
    );
  }

  // ============================================================================
  // NAME OVERLAY
  // ============================================================================

  Widget _buildNameOverlay(BuildContext context, QuickRTCThemeData theme) {
    final name = widget.participantName!;
    final displayName =
        widget.isLocal && widget.showLocalLabel ? '$name (You)' : name;

    Widget nameWidget;
    if (widget.nameOverlayBuilder != null) {
      nameWidget =
          widget.nameOverlayBuilder!(context, displayName, widget.isLocal);
    } else {
      nameWidget = _defaultNameOverlay(displayName, theme);
    }

    final position = widget.namePosition ?? theme.defaultNamePosition;

    // Name overlay typically spans the bottom with a gradient
    if (position == OverlayPosition.bottomLeft ||
        position == OverlayPosition.bottomCenter ||
        position == OverlayPosition.bottomRight) {
      return Positioned(
        bottom: 0,
        left: 0,
        right: 0,
        child: nameWidget,
      );
    }

    return _positionedOverlay(
      position,
      widget.nameCustomPosition,
      nameWidget,
    );
  }

  Widget _defaultNameOverlay(String name, QuickRTCThemeData theme) {
    return Container(
      padding: theme.namePadding,
      decoration: BoxDecoration(
        gradient: theme.nameBackgroundGradient ??
            LinearGradient(
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
              style: theme.nameTextStyle,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================================
  // AUDIO INDICATOR
  // ============================================================================

  Widget _buildAudioIndicator(BuildContext context, QuickRTCThemeData theme) {
    // By default, only show indicator when muted (common UX pattern)
    if (_isAudioEnabled && widget.audioIndicatorBuilder == null) {
      return const SizedBox.shrink();
    }

    Widget indicator;
    if (widget.audioIndicatorBuilder != null) {
      indicator = widget.audioIndicatorBuilder!(context, _isAudioEnabled);
    } else {
      indicator = _defaultAudioIndicator(theme);
    }

    final position =
        widget.audioIndicatorPosition ?? theme.defaultAudioPosition;

    return _positionedOverlay(
      position,
      widget.audioCustomPosition,
      indicator,
    );
  }

  Widget _defaultAudioIndicator(QuickRTCThemeData theme) {
    return Container(
      padding: theme.indicatorPadding,
      decoration: BoxDecoration(
        color: (_isAudioEnabled ? theme.audioOnColor : theme.audioOffColor)
            .withValues(alpha: theme.indicatorBackgroundOpacity),
        borderRadius: theme.indicatorBorderRadius,
      ),
      child: Icon(
        _isAudioEnabled ? theme.audioOnIcon : theme.audioOffIcon,
        size: theme.indicatorIconSize,
        color: Colors.white,
      ),
    );
  }

  // ============================================================================
  // VIDEO INDICATOR
  // ============================================================================

  Widget _buildVideoIndicator(BuildContext context, QuickRTCThemeData theme) {
    Widget indicator;
    if (widget.videoIndicatorBuilder != null) {
      indicator = widget.videoIndicatorBuilder!(context, _isVideoEnabled);
    } else {
      indicator = Container(
        padding: theme.indicatorPadding,
        decoration: BoxDecoration(
          color:
              theme.videoOffColor.withValues(alpha: theme.indicatorBackgroundOpacity),
          borderRadius: theme.indicatorBorderRadius,
        ),
        child: Icon(
          theme.videoOffIcon,
          size: theme.indicatorIconSize,
          color: Colors.white,
        ),
      );
    }

    final position =
        widget.videoIndicatorPosition ?? theme.defaultVideoPosition;

    return _positionedOverlay(
      position,
      widget.videoCustomPosition,
      indicator,
    );
  }

  // ============================================================================
  // POSITIONING HELPER
  // ============================================================================

  Widget _positionedOverlay(
    OverlayPosition position,
    CustomPosition? custom,
    Widget child,
  ) {
    if (custom != null) {
      return Positioned(
        top: custom.top,
        bottom: custom.bottom,
        left: custom.left,
        right: custom.right,
        child: Padding(padding: widget.overlayPadding, child: child),
      );
    }

    final padding = widget.overlayPadding;

    switch (position) {
      case OverlayPosition.topLeft:
        return Positioned(
          top: padding.top,
          left: padding.left,
          child: child,
        );
      case OverlayPosition.topCenter:
        return Positioned(
          top: padding.top,
          left: 0,
          right: 0,
          child: Center(child: child),
        );
      case OverlayPosition.topRight:
        return Positioned(
          top: padding.top,
          right: padding.right,
          child: child,
        );
      case OverlayPosition.centerLeft:
        return Positioned(
          top: 0,
          bottom: 0,
          left: padding.left,
          child: Center(child: child),
        );
      case OverlayPosition.center:
        return Positioned.fill(child: Center(child: child));
      case OverlayPosition.centerRight:
        return Positioned(
          top: 0,
          bottom: 0,
          right: padding.right,
          child: Center(child: child),
        );
      case OverlayPosition.bottomLeft:
        return Positioned(
          bottom: padding.bottom,
          left: padding.left,
          child: child,
        );
      case OverlayPosition.bottomCenter:
        return Positioned(
          bottom: padding.bottom,
          left: 0,
          right: 0,
          child: Center(child: child),
        );
      case OverlayPosition.bottomRight:
        return Positioned(
          bottom: padding.bottom,
          right: padding.right,
          child: child,
        );
    }
  }
}
