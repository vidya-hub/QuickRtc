import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Platform-specific screen capture service handler.
///
/// On Android, this starts/stops a foreground service required for
/// MediaProjection API (screen capture) on Android 10+.
///
/// On iOS/macOS, this handles screen capture permissions differently:
/// - macOS: Uses CGRequestScreenCaptureAccess for permission
/// - iOS: Uses ReplayKit
class QuickRTCPlatform {
  static const MethodChannel _channel =
      MethodChannel('quickrtc_flutter_client');

  /// Whether the screen capture foreground service is running (Android only)
  static bool _isServiceRunning = false;

  /// Cached Android SDK version
  static int? _androidSdkVersion;

  /// Check if the screen capture service is running
  static bool get isScreenCaptureServiceRunning => _isServiceRunning;

  /// Get Android SDK version
  static Future<int> getAndroidSdkVersion() async {
    if (kIsWeb || !Platform.isAndroid) {
      return 0;
    }

    if (_androidSdkVersion != null) {
      return _androidSdkVersion!;
    }

    try {
      final result = await _channel.invokeMethod<int>('getAndroidSdkVersion');
      _androidSdkVersion = result ?? 0;
      return _androidSdkVersion!;
    } on PlatformException {
      return 0;
    } on MissingPluginException {
      return 0;
    }
  }

  /// Prepare for screen capture on Android 14+ (SDK 34+).
  ///
  /// On Android 14+, this sets up monitoring to automatically start the
  /// foreground service when flutter_webrtc's permission dialog is completed.
  ///
  /// Call this BEFORE calling flutter_webrtc's getDisplayMedia().
  ///
  /// On Android 10-13, this is a no-op (use [startScreenCaptureService] instead).
  /// On other platforms, this returns true immediately.
  ///
  /// Returns true if preparation was successful.
  static Future<bool> prepareScreenCapture() async {
    if (kIsWeb || !Platform.isAndroid) {
      return true;
    }

    try {
      debugPrint('QuickRTC: Preparing screen capture');
      final result = await _channel.invokeMethod<bool>('prepareScreenCapture');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('Failed to prepare screen capture: ${e.message}');
      return false;
    } on MissingPluginException {
      debugPrint('QuickRTC platform plugin not available');
      return true;
    }
  }

  /// Start the screen capture foreground service.
  ///
  /// On Android 10+: Call this to start the foreground service.
  /// On Android 14+: Call this AFTER the user has granted MediaProjection
  ///                 permission (via Helper.requestCapturePermission()).
  ///
  /// This method starts the service and waits for it to be fully ready
  /// before returning. On Android 14+, the service must call startForeground()
  /// with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION before MediaProjection
  /// can be created.
  ///
  /// On other platforms, this is a no-op but still returns true.
  ///
  /// Returns true if the service started successfully and is ready.
  static Future<bool> startScreenCaptureService() async {
    if (kIsWeb) {
      // Web doesn't need a foreground service
      return true;
    }

    if (!Platform.isAndroid) {
      return true;
    }

    try {
      debugPrint('QuickRTC: Starting screen capture foreground service');

      // Start the service (returns immediately)
      final result =
          await _channel.invokeMethod<bool>('startScreenCaptureService');

      if (result != true) {
        debugPrint('QuickRTC: Failed to start service');
        return false;
      }

      // Wait for the service to be fully ready (following GetStream's pattern)
      // Poll every 50ms for up to 3 seconds
      final isReady = await _waitForServiceReady();

      _isServiceRunning = isReady;
      debugPrint('QuickRTC: Service ready: $isReady');
      return isReady;
    } on PlatformException catch (e) {
      debugPrint('Failed to start screen capture service: ${e.message}');
      return false;
    } on MissingPluginException {
      // Plugin not registered (e.g., on unsupported platform)
      debugPrint('QuickRTC platform plugin not available');
      return true; // Return true to not block on unsupported platforms
    }
  }

  /// Wait for the screen capture service to be fully ready.
  /// Polls every 50ms for up to 3 seconds.
  /// Returns true if ready, false if timeout.
  static Future<bool> _waitForServiceReady() async {
    const timeout = Duration(seconds: 3);
    const interval = Duration(milliseconds: 50);
    final stopwatch = Stopwatch()..start();

    while (stopwatch.elapsed < timeout) {
      final isRunning = await checkScreenCaptureServiceRunning();

      if (isRunning) {
        debugPrint(
            'QuickRTC: Screen capture service ready after ${stopwatch.elapsedMilliseconds}ms',);
        return true;
      }

      await Future<void>.delayed(interval);
    }

    debugPrint(
        'QuickRTC: Timeout waiting for screen capture service to be ready',);
    return false;
  }

  /// Stop the screen capture foreground service.
  ///
  /// Call this when screen sharing is stopped.
  /// On non-Android platforms, this is a no-op.
  ///
  /// Returns true if the service stopped successfully.
  static Future<bool> stopScreenCaptureService() async {
    if (kIsWeb) {
      return true;
    }

    try {
      final result =
          await _channel.invokeMethod<bool>('stopScreenCaptureService');
      _isServiceRunning = !(result ?? true);
      return result ?? true;
    } on PlatformException catch (e) {
      debugPrint('Failed to stop screen capture service: ${e.message}');
      return false;
    } on MissingPluginException {
      debugPrint('QuickRTC platform plugin not available');
      return true;
    }
  }

  /// Check if the screen capture service is currently running.
  ///
  /// This queries the native side for the current state.
  static Future<bool> checkScreenCaptureServiceRunning() async {
    if (kIsWeb) {
      return true;
    }

    try {
      final result =
          await _channel.invokeMethod<bool>('isScreenCaptureServiceRunning');
      _isServiceRunning = result ?? false;
      return _isServiceRunning;
    } on PlatformException catch (e) {
      debugPrint('Failed to check screen capture service: ${e.message}');
      return false;
    } on MissingPluginException {
      return true;
    }
  }

  /// Check if screen capture permission is granted (macOS only).
  ///
  /// On macOS 10.15+, this uses CGPreflightScreenCaptureAccess.
  /// On other platforms, returns true.
  static Future<bool> checkScreenCapturePermission() async {
    if (kIsWeb) {
      return true;
    }

    // Only macOS has this specific permission check
    if (!Platform.isMacOS) {
      return true;
    }

    try {
      final result =
          await _channel.invokeMethod<bool>('checkScreenCapturePermission');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('Failed to check screen capture permission: ${e.message}');
      return false;
    } on MissingPluginException {
      debugPrint('QuickRTC platform plugin not available');
      return true;
    }
  }

  /// Request screen capture permission (macOS only).
  ///
  /// On macOS 10.15+, this uses CGRequestScreenCaptureAccess which shows
  /// the system permission dialog. Note that this dialog only appears once
  /// per app install. If the user denies permission, they must manually
  /// enable it in System Preferences > Security & Privacy > Screen Recording.
  ///
  /// On other platforms, returns true.
  static Future<bool> requestScreenCapturePermission() async {
    if (kIsWeb) {
      return true;
    }

    // Only macOS has this specific permission request
    if (!Platform.isMacOS) {
      return true;
    }

    try {
      final result =
          await _channel.invokeMethod<bool>('requestScreenCapturePermission');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('Failed to request screen capture permission: ${e.message}');
      return false;
    } on MissingPluginException {
      debugPrint('QuickRTC platform plugin not available');
      return true;
    }
  }

  /// Open System Preferences to Screen Recording settings (macOS only).
  ///
  /// This is useful when the user has denied permission and needs to
  /// manually enable it.
  static Future<void> openScreenCaptureSettings() async {
    if (kIsWeb || !Platform.isMacOS) {
      return;
    }

    try {
      await _channel.invokeMethod<void>('openScreenCaptureSettings');
    } on PlatformException catch (e) {
      debugPrint('Failed to open screen capture settings: ${e.message}');
    } on MissingPluginException {
      debugPrint('QuickRTC platform plugin not available');
    }
  }

  /// Get the platform version string
  static Future<String?> getPlatformVersion() async {
    if (kIsWeb) {
      return 'Web';
    }

    try {
      return await _channel.invokeMethod<String>('getPlatformVersion');
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }
}
