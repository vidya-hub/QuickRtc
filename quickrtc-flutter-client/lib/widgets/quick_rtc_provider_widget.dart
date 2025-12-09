import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:quickrtc_flutter_client/providers/conference_provider.dart';

/// Provider widget for QuickRTC
///
/// Wrap your app with this widget to provide conference state management
/// to all descendant widgets.
///
/// Example:
/// ```dart
/// QuickRTCProviderWidget(
///   child: MyApp(),
/// )
/// ```
class QuickRTCProviderWidget extends StatelessWidget {
  final Widget child;
  final ConferenceProvider? conferenceProvider;

  const QuickRTCProviderWidget({
    Key? key,
    required this.child,
    this.conferenceProvider,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<ConferenceProvider>(
      create: (_) => conferenceProvider ?? ConferenceProvider(),
      child: child,
    );
  }
}
