import 'package:flutter/widgets.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_builder.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_listener.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_provider.dart';

/// Signature for the consumer builder - receives context, state, AND controller
typedef QuickRTCConsumerWidgetBuilder = Widget Function(
  BuildContext context,
  QuickRTCState state,
  QuickRTCController controller,
);

/// Signature for consumer listener - receives context and controller
typedef QuickRTCConsumerWidgetListener = void Function(
  BuildContext context,
  QuickRTCController controller,
);

/// A comprehensive wrapper widget that combines Provider, Listener, and Builder.
///
/// [QuickRTCConsumer] is the recommended way to wrap your entire conference UI.
/// It provides:
/// - **Provider**: Makes controller accessible to all descendants via context
/// - **Listener**: Handles side effects (errors, navigation, snackbars)
/// - **Builder**: Rebuilds UI reactively when state changes
///
/// The builder receives BOTH state AND controller, giving you full access
/// to read state and invoke actions.
///
/// ## Basic Usage
///
/// ```dart
/// QuickRTCConsumer(
///   controller: _controller,
///   builder: (context, state, controller) {
///     return VideoGrid(
///       participants: state.participantList,
///       onLeave: () => controller.leaveMeeting(),
///     );
///   },
/// )
/// ```
///
/// ## With Error Handling
///
/// ```dart
/// QuickRTCConsumer(
///   controller: _controller,
///   listenWhen: (prev, curr) => prev.error != curr.error,
///   listener: (context, controller) {
///     if (controller.state.hasError) {
///       ScaffoldMessenger.of(context).showSnackBar(
///         SnackBar(content: Text(controller.state.error!)),
///       );
///     }
///   },
///   buildWhen: (prev, curr) => prev.participantCount != curr.participantCount,
///   builder: (context, state, controller) {
///     return ConferenceView(state: state);
///   },
///   onError: (context, error) => ErrorScreen(message: error),
/// )
/// ```
///
/// ## Accessing Controller in Descendants
///
/// Inside the builder's widget tree, you can access the controller:
/// ```dart
/// // For actions (doesn't subscribe to changes)
/// final controller = QuickRTCProvider.read(context);
/// await controller.leaveMeeting();
///
/// // For state (subscribes to changes - use in build methods)
/// final state = QuickRTCProvider.stateOf(context);
/// ```
class QuickRTCConsumer extends StatefulWidget {
  /// Creates a [QuickRTCConsumer].
  ///
  /// The [controller] and [builder] parameters are required.
  /// Optionally provide [listener] for side effects.
  const QuickRTCConsumer({
    super.key,
    required this.controller,
    this.listenWhen,
    this.listener,
    this.buildWhen,
    required this.builder,
    this.onError,
  });

  /// The QuickRTCController instance to provide and observe
  final QuickRTCController controller;

  /// Optional condition for when to call the listener.
  ///
  /// Return `true` to call the listener, `false` to skip.
  /// If null, the listener is called on every state change.
  final QuickRTCListenWhen? listenWhen;

  /// Callback for side effects (errors, navigation, snackbars, etc.)
  ///
  /// Receives (context, controller) so you can access state via
  /// `controller.state` and invoke actions.
  final QuickRTCConsumerWidgetListener? listener;

  /// Optional condition for when to rebuild the widget.
  ///
  /// Return `true` to rebuild, `false` to skip.
  /// If null, rebuilds on every state change.
  final QuickRTCBuildWhen? buildWhen;

  /// The builder function that returns the widget tree.
  ///
  /// Receives (context, state, controller) giving you full access to:
  /// - Read current state
  /// - Call actions on the controller
  final QuickRTCConsumerWidgetBuilder builder;

  /// Optional error builder.
  ///
  /// If provided and `state.hasError` is true, this builder is called
  /// instead of the main builder.
  final QuickRTCErrorBuilder? onError;

  @override
  State<QuickRTCConsumer> createState() => _QuickRTCConsumerState();
}

class _QuickRTCConsumerState extends State<QuickRTCConsumer> {
  late QuickRTCState _previousState;

  @override
  void initState() {
    super.initState();
    _previousState = widget.controller.state;
    widget.controller.addListener(_onStateChange);
  }

  @override
  void didUpdateWidget(QuickRTCConsumer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onStateChange);
      _previousState = widget.controller.state;
      widget.controller.addListener(_onStateChange);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onStateChange);
    super.dispose();
  }

  void _onStateChange() {
    final currentState = widget.controller.state;

    // Call listener if conditions are met
    if (widget.listener != null) {
      final shouldNotify =
          widget.listenWhen?.call(_previousState, currentState) ?? true;
      if (shouldNotify) {
        widget.listener!(context, widget.controller);
      }
    }

    // Rebuild if conditions are met
    final shouldRebuild =
        widget.buildWhen?.call(_previousState, currentState) ?? true;
    if (shouldRebuild) {
      setState(() {});
    }

    _previousState = currentState;
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.controller.state;

    // Wrap with provider so descendants can access controller
    return QuickRTCProvider(
      controller: widget.controller,
      child: Builder(
        builder: (context) {
          // Handle error state if onError is provided
          if (state.hasError && widget.onError != null) {
            return widget.onError!(context, state.error!);
          }

          return widget.builder(context, state, widget.controller);
        },
      ),
    );
  }
}

/// A simpler consumer that doesn't include a Provider.
///
/// Use this when you already have a [QuickRTCProvider] ancestor in the tree
/// and just need listener + builder functionality.
///
/// For most cases, prefer using [QuickRTCConsumer] which includes the provider.
///
/// Example:
/// ```dart
/// // Already inside a QuickRTCProvider...
/// QuickRTCConsumerLite(
///   listenWhen: (prev, curr) => prev.error != curr.error,
///   listener: (context, controller) {
///     // Handle errors
///   },
///   builder: (context, state) {
///     return MyWidget(participants: state.participantList);
///   },
/// )
/// ```
class QuickRTCConsumerLite extends StatelessWidget {
  /// Creates a [QuickRTCConsumerLite].
  const QuickRTCConsumerLite({
    super.key,
    this.buildWhen,
    required this.builder,
    this.listenWhen,
    required this.listener,
    this.onError,
  });

  /// Optional condition for when to rebuild
  final QuickRTCBuildWhen? buildWhen;

  /// Builder that receives (context, state)
  final QuickRTCWidgetBuilder builder;

  /// Optional condition for when to call listener
  final QuickRTCListenWhen? listenWhen;

  /// Listener that receives (context, controller)
  final QuickRTCWidgetListener listener;

  /// Optional error builder
  final QuickRTCErrorBuilder? onError;

  @override
  Widget build(BuildContext context) {
    return QuickRTCListener(
      listenWhen: listenWhen,
      listener: listener,
      child: QuickRTCBuilder(
        buildWhen: buildWhen,
        builder: builder,
        onError: onError,
      ),
    );
  }
}
