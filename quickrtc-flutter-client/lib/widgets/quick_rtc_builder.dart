import 'package:flutter/widgets.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_provider.dart';

/// Signature for the `buildWhen` function which takes the previous and current
/// [QuickRTCState] and returns a boolean indicating whether the builder should be called.
typedef QuickRTCBuildWhen = bool Function(
  QuickRTCState previous,
  QuickRTCState current,
);

/// Signature for the `builder` function which takes the [BuildContext] and
/// [QuickRTCState] and returns a widget.
typedef QuickRTCWidgetBuilder = Widget Function(
  BuildContext context,
  QuickRTCState state,
);

/// Signature for the `onError` builder which takes the [BuildContext] and
/// error message and returns a widget.
typedef QuickRTCErrorBuilder = Widget Function(
  BuildContext context,
  String error,
);

/// A widget that rebuilds when the [QuickRTCState] changes.
///
/// [QuickRTCBuilder] handles building a widget in response to new states.
/// It receives STATE only in the builder callback.
///
/// Please refer to [QuickRTCListener] if you want to "do" anything in response
/// to state changes (navigation, showing dialogs, etc.).
///
/// Example:
/// ```dart
/// QuickRTCBuilder(
///   buildWhen: (previous, current) => previous.participants != current.participants,
///   builder: (context, state) {
///     return ParticipantGrid(
///       participants: state.participantList,
///     );
///   },
///   onError: (context, error) {
///     return ErrorView(message: error);
///   },
/// )
/// ```
class QuickRTCBuilder extends StatefulWidget {
  /// Creates a [QuickRTCBuilder].
  ///
  /// The [builder] parameter must not be null.
  const QuickRTCBuilder({
    super.key,
    this.buildWhen,
    required this.builder,
    this.onError,
  });

  /// An optional function that determines when the widget should rebuild.
  ///
  /// If null, the widget will rebuild on every state change.
  /// Return `true` to rebuild, `false` to skip the rebuild.
  final QuickRTCBuildWhen? buildWhen;

  /// The builder function that returns the widget tree.
  ///
  /// Called initially and whenever the state changes (subject to [buildWhen]).
  /// Receives (context, state).
  final QuickRTCWidgetBuilder builder;

  /// Optional error builder.
  ///
  /// If provided and the state has an error, this builder will be called
  /// instead of the main builder.
  final QuickRTCErrorBuilder? onError;

  @override
  State<QuickRTCBuilder> createState() => _QuickRTCBuilderState();
}

class _QuickRTCBuilderState extends State<QuickRTCBuilder> {
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
    final shouldRebuild =
        widget.buildWhen?.call(_previousState, currentState) ?? true;

    if (shouldRebuild) {
      setState(() {});
    }

    _previousState = currentState;
  }

  @override
  Widget build(BuildContext context) {
    final state = _controller.state;

    // If error AND onError provided, show error widget
    if (state.hasError && widget.onError != null) {
      return widget.onError!(context, state.error!);
    }

    return widget.builder(context, state);
  }
}
