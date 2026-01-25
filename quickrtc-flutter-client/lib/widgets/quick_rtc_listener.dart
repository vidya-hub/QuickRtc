import 'package:flutter/widgets.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_provider.dart';

/// Signature for the `listenWhen` function which takes the previous and current
/// [QuickRTCState] and returns a boolean indicating whether the listener should be called.
typedef QuickRTCListenWhen = bool Function(
  QuickRTCState previous,
  QuickRTCState current,
);

/// Signature for the `listener` function which takes the [BuildContext] and
/// [QuickRTCController].
///
/// The listener receives the CONTROLLER so it can access both state and actions.
typedef QuickRTCWidgetListener = void Function(
  BuildContext context,
  QuickRTCController controller,
);

/// A widget that invokes a callback in response to [QuickRTCState] changes.
///
/// [QuickRTCListener] should be used for side effects (navigation, showing
/// dialogs, SnackBars, etc.). The listener receives the CONTROLLER so it can
/// access both state (via controller.state) and call actions.
///
/// For rebuilding the widget tree based on state changes, use [QuickRTCBuilder].
///
/// Example:
/// ```dart
/// QuickRTCListener(
///   listenWhen: (previous, current) => previous.error != current.error,
///   listener: (context, controller) {
///     if (controller.state.error != null) {
///       ScaffoldMessenger.of(context).showSnackBar(
///         SnackBar(content: Text(controller.state.error!)),
///       );
///       controller.clearError();
///     }
///   },
///   child: MyWidget(),
/// )
/// ```
class QuickRTCListener extends StatefulWidget {
  /// Creates a [QuickRTCListener].
  ///
  /// The [listener] and [child] parameters must not be null.
  const QuickRTCListener({
    super.key,
    this.listenWhen,
    required this.listener,
    required this.child,
  });

  /// An optional function that determines when the listener should be called.
  ///
  /// If null, the listener will be called on every state change.
  /// Return `true` to call the listener, `false` to skip.
  final QuickRTCListenWhen? listenWhen;

  /// The callback to invoke when the state changes (subject to [listenWhen]).
  /// Receives (context, controller).
  final QuickRTCWidgetListener listener;

  /// The widget below this widget in the tree.
  final Widget child;

  @override
  State<QuickRTCListener> createState() => _QuickRTCListenerState();
}

class _QuickRTCListenerState extends State<QuickRTCListener> {
  late QuickRTCController _controller;
  late QuickRTCState _previousState;

  @override
  void initState() {
    super.initState();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller = QuickRTCProvider.of(context);
    _previousState = _controller.state;
    _controller.addListener(_onStateChange);
  }

  @override
  void dispose() {
    _controller.removeListener(_onStateChange);
    super.dispose();
  }

  void _onStateChange() {
    final currentState = _controller.state;
    final shouldNotify =
        widget.listenWhen?.call(_previousState, currentState) ?? true;

    if (shouldNotify) {
      widget.listener(context, _controller);
    }

    _previousState = currentState;
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
