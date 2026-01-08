import 'package:flutter/widgets.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';

/// Provides a [QuickRTCController] instance to the widget tree.
///
/// This widget uses [InheritedWidget] to efficiently propagate
/// the controller and its state changes to descendant widgets.
///
/// Example:
/// ```dart
/// QuickRTCProvider(
///   controller: QuickRTCController(socket: socket),
///   child: MyApp(),
/// )
/// ```
///
/// Access the controller:
/// ```dart
/// // For actions (doesn't listen to changes)
/// final controller = QuickRTCProvider.read(context);
/// await controller.joinMeeting(...);
///
/// // For state (use inside Builder/Listener/Consumer instead)
/// final state = QuickRTCProvider.stateOf(context);
/// ```
class QuickRTCProvider extends InheritedWidget {
  /// The QuickRTCController instance to provide.
  final QuickRTCController controller;

  /// Creates a QuickRTCProvider.
  ///
  /// The [controller] parameter is the QuickRTCController instance to provide.
  /// The [child] parameter is the widget tree that will have access to the controller.
  const QuickRTCProvider({
    super.key,
    required this.controller,
    required super.child,
  });

  /// Gets the [QuickRTCController] instance without listening for changes.
  ///
  /// Use this when you need to call methods on the controller
  /// but don't need to rebuild when state changes.
  ///
  /// Example:
  /// ```dart
  /// final controller = QuickRTCProvider.read(context);
  /// await controller.joinMeeting(...);
  /// ```
  static QuickRTCController read(BuildContext context) {
    final provider = context.getInheritedWidgetOfExactType<QuickRTCProvider>();
    if (provider == null) {
      throw FlutterError(
        'QuickRTCProvider.read() called with a context that does not contain a QuickRTCProvider.\n'
        'Make sure to wrap your widget tree with QuickRTCProvider.',
      );
    }
    return provider.controller;
  }

  /// Gets the [QuickRTCController] instance and listens for changes.
  ///
  /// The widget calling this will rebuild whenever the controller's state changes.
  /// Prefer using [QuickRTCBuilder] or [QuickRTCConsumer] for more control.
  ///
  /// Example:
  /// ```dart
  /// final controller = QuickRTCProvider.of(context);
  /// ```
  static QuickRTCController of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<QuickRTCProvider>();
    if (provider == null) {
      throw FlutterError(
        'QuickRTCProvider.of() called with a context that does not contain a QuickRTCProvider.\n'
        'Make sure to wrap your widget tree with QuickRTCProvider.',
      );
    }
    return provider.controller;
  }

  /// Gets the current [QuickRTCState] and listens for changes.
  ///
  /// Shorthand for `QuickRTCProvider.of(context).state`.
  ///
  /// Example:
  /// ```dart
  /// final state = QuickRTCProvider.stateOf(context);
  /// if (state.isConnected) {
  ///   // ...
  /// }
  /// ```
  static QuickRTCState stateOf(BuildContext context) {
    return of(context).state;
  }

  /// Checks if a [QuickRTCProvider] exists in the widget tree.
  ///
  /// Returns the [QuickRTCController] instance if found, null otherwise.
  static QuickRTCController? maybeOf(BuildContext context) {
    return context
        .getInheritedWidgetOfExactType<QuickRTCProvider>()
        ?.controller;
  }

  @override
  bool updateShouldNotify(QuickRTCProvider oldWidget) {
    return controller != oldWidget.controller;
  }
}
