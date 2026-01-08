import 'package:flutter/widgets.dart';
import 'package:quickrtc_flutter_client/src/controller/quickrtc_controller.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_builder.dart';
import 'package:quickrtc_flutter_client/widgets/quick_rtc_listener.dart';

/// A widget that combines [QuickRTCListener] and [QuickRTCBuilder] into one widget.
///
/// [QuickRTCConsumer] should be used when you need to both rebuild the UI and
/// execute side effects in response to state changes.
///
/// Using [QuickRTCConsumer] is functionally equivalent to nesting a
/// [QuickRTCListener] inside a [QuickRTCBuilder].
///
/// The [listener] callback receives the CONTROLLER (for actions and state access).
/// The [builder] callback receives STATE only (for building UI).
///
/// Example:
/// ```dart
/// QuickRTCConsumer(
///   listenWhen: (previous, current) => previous.error != current.error,
///   listener: (context, controller) {
///     if (controller.state.error != null) {
///       ScaffoldMessenger.of(context).showSnackBar(
///         SnackBar(content: Text(controller.state.error!)),
///       );
///       controller.clearError();
///     }
///   },
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
class QuickRTCConsumer extends StatelessWidget {
  /// Creates a [QuickRTCConsumer].
  ///
  /// The [builder] and [listener] parameters must not be null.
  const QuickRTCConsumer({
    super.key,
    this.buildWhen,
    required this.builder,
    this.listenWhen,
    required this.listener,
    this.onError,
  });

  /// An optional function that determines when the widget should rebuild.
  ///
  /// If null, the widget will rebuild on every state change.
  final QuickRTCBuildWhen? buildWhen;

  /// The builder function that returns the widget tree.
  /// Receives (context, state) - STATE only.
  final QuickRTCWidgetBuilder builder;

  /// An optional function that determines when the listener should be called.
  ///
  /// If null, the listener will be called on every state change.
  final QuickRTCListenWhen? listenWhen;

  /// The callback to invoke when the state changes.
  /// Receives (context, controller) - CONTROLLER for actions and state access.
  final QuickRTCWidgetListener listener;

  /// Optional error builder.
  ///
  /// If provided and the state has an error, this builder will be called
  /// instead of the main builder.
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
