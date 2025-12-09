import 'dart:io';

import 'package:flutter/material.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'screens/conference_screen.dart';
import 'screens/home_screen.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  HttpOverrides.global = MyHttpOverrides();

  // Add error handling for Flutter framework errors
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('🔴 Flutter Error: ${details.exception}');
    debugPrint('🔴 Stack trace: ${details.stack}');
  };

  debugPrint('🔵 Starting app...');

  try {
    runApp(const MyApp());
  } catch (e, stackTrace) {
    debugPrint('🔴 Error in main: $e');
    debugPrint('🔴 Stack trace: $stackTrace');
  }
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    try {
      return QuickRTCProviderWidget(
        child: MaterialApp(
          title: 'QuickRTC Flutter Example',
          theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
          home: const HomeScreen(),
          routes: {
            '/conference': (context) => const ConferenceScreen(),
          },
        ),
      );
    } catch (e, stackTrace) {
      debugPrint('🔴 Error in MyApp.build: $e');
      debugPrint('🔴 Stack trace: $stackTrace');
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Text('Error: $e'),
          ),
        ),
      );
    }
  }
}
