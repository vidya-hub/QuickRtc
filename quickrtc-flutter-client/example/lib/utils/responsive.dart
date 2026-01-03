import 'package:flutter/material.dart';

/// Breakpoints for responsive design
class Breakpoints {
  static const double mobile = 600;
  static const double tablet = 900;
  static const double desktop = 1200;
  static const double largeDesktop = 1800;
}

/// Device type enum
enum DeviceType { mobile, tablet, desktop }

/// Responsive utility class
class Responsive {
  final BuildContext context;

  Responsive(this.context);

  /// Get screen width
  double get width => MediaQuery.of(context).size.width;

  /// Get screen height
  double get height => MediaQuery.of(context).size.height;

  /// Get device type based on width
  DeviceType get deviceType {
    if (width < Breakpoints.mobile) return DeviceType.mobile;
    if (width < Breakpoints.desktop) return DeviceType.tablet;
    return DeviceType.desktop;
  }

  /// Check if mobile
  bool get isMobile => deviceType == DeviceType.mobile;

  /// Check if tablet
  bool get isTablet => deviceType == DeviceType.tablet;

  /// Check if desktop
  bool get isDesktop => deviceType == DeviceType.desktop;

  /// Check if landscape orientation
  bool get isLandscape =>
      MediaQuery.of(context).orientation == Orientation.landscape;

  /// Check if portrait orientation
  bool get isPortrait =>
      MediaQuery.of(context).orientation == Orientation.portrait;

  /// Get safe area padding
  EdgeInsets get safeArea => MediaQuery.of(context).padding;

  /// Get content max width based on screen size
  double get contentMaxWidth {
    if (isMobile) return width;
    if (isTablet) return 600;
    return 800;
  }

  /// Get number of columns for grid based on screen size
  int get gridColumns {
    if (width < Breakpoints.mobile) return 1;
    if (width < Breakpoints.tablet) return 2;
    if (width < Breakpoints.desktop) return 3;
    if (width < Breakpoints.largeDesktop) return 4;
    return 5;
  }

  /// Get responsive value based on device type
  T value<T>({
    required T mobile,
    T? tablet,
    T? desktop,
  }) {
    switch (deviceType) {
      case DeviceType.mobile:
        return mobile;
      case DeviceType.tablet:
        return tablet ?? mobile;
      case DeviceType.desktop:
        return desktop ?? tablet ?? mobile;
    }
  }

  /// Get responsive padding
  EdgeInsets get screenPadding {
    return value(
      mobile: const EdgeInsets.all(16),
      tablet: const EdgeInsets.all(24),
      desktop: const EdgeInsets.all(32),
    );
  }

  /// Get responsive spacing
  double get spacing {
    return value(mobile: 16.0, tablet: 20.0, desktop: 24.0);
  }
}

/// Extension for easy access
extension ResponsiveExtension on BuildContext {
  Responsive get responsive => Responsive(this);
}

/// Responsive builder widget
class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, Responsive responsive) builder;

  const ResponsiveBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return builder(context, Responsive(context));
      },
    );
  }
}

/// Responsive layout widget that shows different layouts based on screen size
class ResponsiveLayout extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;

  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.tablet,
    this.desktop,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, responsive) {
        if (responsive.isDesktop && desktop != null) {
          return desktop!;
        }
        if (responsive.isTablet && tablet != null) {
          return tablet!;
        }
        return mobile;
      },
    );
  }
}

/// Centered content with max width constraint
class CenteredContent extends StatelessWidget {
  final Widget child;
  final double? maxWidth;
  final EdgeInsets? padding;

  const CenteredContent({
    super.key,
    required this.child,
    this.maxWidth,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final responsive = Responsive(context);
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: maxWidth ?? responsive.contentMaxWidth,
        ),
        child: Padding(
          padding: padding ?? responsive.screenPadding,
          child: child,
        ),
      ),
    );
  }
}
