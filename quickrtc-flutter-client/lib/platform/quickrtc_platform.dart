import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Platform-specific screen capture service handler.
///
/// On Android, this starts/stops a foreground service required for
/// MediaProjection API (screen capture) on Android 10+.
///
/// On iOS/macOS, this is a no-op as those platforms handle screen capture
/// permissions differently (ReplayKit/ScreenCaptureKit).
class QuickRTCPlatform {
  static const MethodChannel _channel =
      MethodChannel('quickrtc_flutter_client');

  /// Whether the screen capture foreground service is running (Android only)
  static bool _isServiceRunning = false;

  /// Check if the screen capture service is running
  static bool get isScreenCaptureServiceRunning => _isServiceRunning;

  /// Start the screen capture foreground service.
  ///
  /// This MUST be called before starting screen capture on Android 10+.
  /// On other platforms, this is a no-op but still returns true.
  ///
  /// Returns true if the service started successfully.
  static Future<bool> startScreenCaptureService() async {
    if (kIsWeb) {
      // Web doesn't need a foreground service
      return true;
    }

    try {
      final result =
          await _channel.invokeMethod<bool>('startScreenCaptureService');
      _isServiceRunning = result ?? false;
      return _isServiceRunning;
    } on PlatformException catch (e) {
      debugPrint('Failed to start screen capture service: ${e.message}');
      return false;
    } on MissingPluginException {
      // Plugin not registered (e.g., on unsupported platform)
      debugPrint('QuickRTC platform plugin not available');
      return true; // Return true to not block on unsupported platforms
    }
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
