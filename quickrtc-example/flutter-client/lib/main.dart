import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'screens/home_screen.dart';
import 'screens/conference_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Allow self-signed certificates (development only)
  if (!kIsWeb) {
    HttpOverrides.global = _DevHttpOverrides();
  }

  runApp(const QuickRTCApp());
}

class QuickRTCApp extends StatelessWidget {
  const QuickRTCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickRTC',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        brightness: Brightness.dark,
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (_) => const HomeScreen(),
        '/conference': (_) => const ConferenceScreen(),
      },
    );
  }
}

class _DevHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (_, __, ___) => true;
  }
}
