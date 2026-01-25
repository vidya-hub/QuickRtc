import 'package:flutter/material.dart';

/// Theme data for QuickRTC widgets
///
/// Provides consistent styling across all QuickRTC widgets including
/// renderers, indicators, and overlays.
///
/// Example:
/// ```dart
/// QuickRTCTheme(
///   data: QuickRTCThemeData(
///     containerBackgroundColor: Colors.grey[900]!,
///     audioOffColor: Colors.red,
///   ),
///   child: MyApp(),
/// )
/// ```
class QuickRTCThemeData {
  // ============================================================================
  // CONTAINER STYLING
  // ============================================================================

  /// Background color for renderer containers
  final Color containerBackgroundColor;

  /// Border radius for renderer containers
  final BorderRadius containerBorderRadius;

  /// Optional custom decoration for containers (overrides backgroundColor)
  final BoxDecoration? containerDecoration;

  // ============================================================================
  // PLACEHOLDER/AVATAR
  // ============================================================================

  /// Background color for avatar placeholder
  final Color placeholderBackgroundColor;

  /// Icon/text color for placeholder
  final Color placeholderIconColor;

  /// Radius for circular avatar placeholder
  final double placeholderAvatarRadius;

  /// Text style for placeholder initials
  final TextStyle placeholderTextStyle;

  // ============================================================================
  // AUDIO INDICATOR
  // ============================================================================

  /// Icon for audio enabled (unmuted)
  final IconData audioOnIcon;

  /// Icon for audio disabled (muted)
  final IconData audioOffIcon;

  /// Color when audio is enabled
  final Color audioOnColor;

  /// Color when audio is disabled
  final Color audioOffColor;

  // ============================================================================
  // VIDEO INDICATOR
  // ============================================================================

  /// Icon for video enabled
  final IconData videoOnIcon;

  /// Icon for video disabled
  final IconData videoOffIcon;

  /// Color when video is enabled
  final Color videoOnColor;

  /// Color when video is disabled
  final Color videoOffColor;

  // ============================================================================
  // INDICATOR COMMON STYLING
  // ============================================================================

  /// Icon size for indicators
  final double indicatorIconSize;

  /// Padding inside indicator containers
  final EdgeInsets indicatorPadding;

  /// Border radius for indicator containers
  final BorderRadius indicatorBorderRadius;

  /// Opacity for indicator background
  final double indicatorBackgroundOpacity;

  // ============================================================================
  // NAME OVERLAY
  // ============================================================================

  /// Text style for participant name
  final TextStyle nameTextStyle;

  /// Padding for name overlay
  final EdgeInsets namePadding;

  /// Gradient for name overlay background (null = default gradient)
  final Gradient? nameBackgroundGradient;

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  /// Custom loading widget (null = default CircularProgressIndicator)
  final Widget? loadingWidget;

  /// Color for default loading indicator
  final Color loadingIndicatorColor;

  // ============================================================================
  // DEFAULT POSITIONS
  // ============================================================================

  /// Default position for audio indicator
  final OverlayPosition defaultAudioPosition;

  /// Default position for video indicator
  final OverlayPosition defaultVideoPosition;

  /// Default position for name overlay
  final OverlayPosition defaultNamePosition;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  const QuickRTCThemeData({
    // Container
    this.containerBackgroundColor = const Color(0xFF2D2D2D),
    this.containerBorderRadius = const BorderRadius.all(Radius.circular(12)),
    this.containerDecoration,
    // Placeholder
    this.placeholderBackgroundColor = const Color(0xFF424242),
    this.placeholderIconColor = Colors.white,
    this.placeholderAvatarRadius = 40,
    this.placeholderTextStyle = const TextStyle(
      fontSize: 32,
      color: Colors.white,
      fontWeight: FontWeight.w500,
    ),
    // Audio indicator
    this.audioOnIcon = Icons.mic,
    this.audioOffIcon = Icons.mic_off,
    this.audioOnColor = Colors.green,
    this.audioOffColor = Colors.red,
    // Video indicator
    this.videoOnIcon = Icons.videocam,
    this.videoOffIcon = Icons.videocam_off,
    this.videoOnColor = Colors.green,
    this.videoOffColor = Colors.red,
    // Indicator common
    this.indicatorIconSize = 14,
    this.indicatorPadding = const EdgeInsets.all(4),
    this.indicatorBorderRadius = const BorderRadius.all(Radius.circular(4)),
    this.indicatorBackgroundOpacity = 0.8,
    // Name overlay
    this.nameTextStyle = const TextStyle(
      color: Colors.white,
      fontWeight: FontWeight.w500,
      fontSize: 14,
    ),
    this.namePadding = const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    this.nameBackgroundGradient,
    // Loading
    this.loadingWidget,
    this.loadingIndicatorColor = Colors.white,
    // Default positions
    this.defaultAudioPosition = OverlayPosition.bottomRight,
    this.defaultVideoPosition = OverlayPosition.topRight,
    this.defaultNamePosition = OverlayPosition.bottomLeft,
  });

  // ============================================================================
  // PRESETS
  // ============================================================================

  /// Dark theme preset (default)
  static const QuickRTCThemeData dark = QuickRTCThemeData();

  /// Light theme preset
  static const QuickRTCThemeData light = QuickRTCThemeData(
    containerBackgroundColor: Color(0xFFE0E0E0),
    placeholderBackgroundColor: Color(0xFFBDBDBD),
    placeholderIconColor: Colors.black54,
    placeholderTextStyle: TextStyle(
      fontSize: 32,
      color: Colors.black54,
      fontWeight: FontWeight.w500,
    ),
    nameTextStyle: TextStyle(
      color: Colors.black87,
      fontWeight: FontWeight.w500,
      fontSize: 14,
    ),
    loadingIndicatorColor: Colors.black54,
  );

  // ============================================================================
  // COPY WITH
  // ============================================================================

  /// Create a copy with modified values
  QuickRTCThemeData copyWith({
    Color? containerBackgroundColor,
    BorderRadius? containerBorderRadius,
    BoxDecoration? containerDecoration,
    Color? placeholderBackgroundColor,
    Color? placeholderIconColor,
    double? placeholderAvatarRadius,
    TextStyle? placeholderTextStyle,
    IconData? audioOnIcon,
    IconData? audioOffIcon,
    Color? audioOnColor,
    Color? audioOffColor,
    IconData? videoOnIcon,
    IconData? videoOffIcon,
    Color? videoOnColor,
    Color? videoOffColor,
    double? indicatorIconSize,
    EdgeInsets? indicatorPadding,
    BorderRadius? indicatorBorderRadius,
    double? indicatorBackgroundOpacity,
    TextStyle? nameTextStyle,
    EdgeInsets? namePadding,
    Gradient? nameBackgroundGradient,
    Widget? loadingWidget,
    Color? loadingIndicatorColor,
    OverlayPosition? defaultAudioPosition,
    OverlayPosition? defaultVideoPosition,
    OverlayPosition? defaultNamePosition,
  }) {
    return QuickRTCThemeData(
      containerBackgroundColor:
          containerBackgroundColor ?? this.containerBackgroundColor,
      containerBorderRadius:
          containerBorderRadius ?? this.containerBorderRadius,
      containerDecoration: containerDecoration ?? this.containerDecoration,
      placeholderBackgroundColor:
          placeholderBackgroundColor ?? this.placeholderBackgroundColor,
      placeholderIconColor: placeholderIconColor ?? this.placeholderIconColor,
      placeholderAvatarRadius:
          placeholderAvatarRadius ?? this.placeholderAvatarRadius,
      placeholderTextStyle: placeholderTextStyle ?? this.placeholderTextStyle,
      audioOnIcon: audioOnIcon ?? this.audioOnIcon,
      audioOffIcon: audioOffIcon ?? this.audioOffIcon,
      audioOnColor: audioOnColor ?? this.audioOnColor,
      audioOffColor: audioOffColor ?? this.audioOffColor,
      videoOnIcon: videoOnIcon ?? this.videoOnIcon,
      videoOffIcon: videoOffIcon ?? this.videoOffIcon,
      videoOnColor: videoOnColor ?? this.videoOnColor,
      videoOffColor: videoOffColor ?? this.videoOffColor,
      indicatorIconSize: indicatorIconSize ?? this.indicatorIconSize,
      indicatorPadding: indicatorPadding ?? this.indicatorPadding,
      indicatorBorderRadius:
          indicatorBorderRadius ?? this.indicatorBorderRadius,
      indicatorBackgroundOpacity:
          indicatorBackgroundOpacity ?? this.indicatorBackgroundOpacity,
      nameTextStyle: nameTextStyle ?? this.nameTextStyle,
      namePadding: namePadding ?? this.namePadding,
      nameBackgroundGradient:
          nameBackgroundGradient ?? this.nameBackgroundGradient,
      loadingWidget: loadingWidget ?? this.loadingWidget,
      loadingIndicatorColor:
          loadingIndicatorColor ?? this.loadingIndicatorColor,
      defaultAudioPosition: defaultAudioPosition ?? this.defaultAudioPosition,
      defaultVideoPosition: defaultVideoPosition ?? this.defaultVideoPosition,
      defaultNamePosition: defaultNamePosition ?? this.defaultNamePosition,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is QuickRTCThemeData &&
        other.containerBackgroundColor == containerBackgroundColor &&
        other.containerBorderRadius == containerBorderRadius &&
        other.placeholderBackgroundColor == placeholderBackgroundColor &&
        other.audioOffColor == audioOffColor &&
        other.videoOffColor == videoOffColor;
  }

  @override
  int get hashCode => Object.hash(
        containerBackgroundColor,
        containerBorderRadius,
        placeholderBackgroundColor,
        audioOffColor,
        videoOffColor,
      );
}

// ============================================================================
// OVERLAY POSITION
// ============================================================================

/// Position options for overlay elements
enum OverlayPosition {
  topLeft,
  topCenter,
  topRight,
  centerLeft,
  center,
  centerRight,
  bottomLeft,
  bottomCenter,
  bottomRight,
}

/// Custom position for fine-grained control
///
/// Use this when [OverlayPosition] presets don't meet your needs.
class CustomPosition {
  final double? top;
  final double? bottom;
  final double? left;
  final double? right;

  const CustomPosition({
    this.top,
    this.bottom,
    this.left,
    this.right,
  });

  /// Create a position anchored to the top-left with offsets
  const CustomPosition.topLeft({double topOffset = 0, double leftOffset = 0})
      : top = topOffset,
        left = leftOffset,
        bottom = null,
        right = null;

  /// Create a position anchored to the top-right with offsets
  const CustomPosition.topRight({double topOffset = 0, double rightOffset = 0})
      : top = topOffset,
        right = rightOffset,
        bottom = null,
        left = null;

  /// Create a position anchored to the bottom-left with offsets
  const CustomPosition.bottomLeft(
      {double bottomOffset = 0, double leftOffset = 0,})
      : bottom = bottomOffset,
        left = leftOffset,
        top = null,
        right = null;

  /// Create a position anchored to the bottom-right with offsets
  const CustomPosition.bottomRight(
      {double bottomOffset = 0, double rightOffset = 0,})
      : bottom = bottomOffset,
        right = rightOffset,
        top = null,
        left = null;
}

// ============================================================================
// INHERITED WIDGET
// ============================================================================

/// InheritedWidget to provide [QuickRTCThemeData] to the widget tree
///
/// Wrap your app or conference screen with this widget to provide
/// consistent theming to all QuickRTC widgets.
///
/// Example:
/// ```dart
/// QuickRTCTheme(
///   data: QuickRTCThemeData.dark.copyWith(
///     audioOffColor: Colors.orange,
///   ),
///   child: ConferenceScreen(),
/// )
/// ```
class QuickRTCTheme extends InheritedWidget {
  /// The theme data to provide
  final QuickRTCThemeData data;

  const QuickRTCTheme({
    super.key,
    required this.data,
    required super.child,
  });

  /// Get the [QuickRTCThemeData] from the nearest ancestor [QuickRTCTheme]
  ///
  /// Returns [QuickRTCThemeData.dark] if no theme is found in the tree.
  static QuickRTCThemeData of(BuildContext context) {
    final theme = context.dependOnInheritedWidgetOfExactType<QuickRTCTheme>();
    return theme?.data ?? QuickRTCThemeData.dark;
  }

  /// Get the [QuickRTCThemeData] if available, otherwise null
  static QuickRTCThemeData? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<QuickRTCTheme>()?.data;
  }

  @override
  bool updateShouldNotify(QuickRTCTheme oldWidget) => data != oldWidget.data;
}
