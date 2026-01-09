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

  /// Show native screen picker dialog (macOS only).
  ///
  /// Displays a native macOS window with preview thumbnails of available
  /// screens and windows. The user can select which source to share.
  ///
  /// Returns a map with the selected source info:
  /// - `id`: The source ID (display ID for screens, window ID for windows)
  /// - `name`: Human-readable name of the source
  /// - `type`: Either "screen" or "window"
  /// - `displayId`: (optional) CGDirectDisplayID for screen sources
  /// - `windowId`: (optional) CGWindowID for window sources
  ///
  /// Returns null if the user cancels or closes the picker.
  ///
  /// On non-macOS platforms, returns null.
  static Future<Map<String, dynamic>?> showScreenPicker() async {
    if (kIsWeb || !Platform.isMacOS) {
      return null;
    }

    try {
      final result = await _channel.invokeMethod<Map>('showScreenPicker');
      if (result == null) {
        return null;
      }
      return Map<String, dynamic>.from(result);
    } on PlatformException catch (e) {
      debugPrint('Failed to show screen picker: ${e.message}');
      return null;
    } on MissingPluginException {
      debugPrint('QuickRTC platform plugin not available');
      return null;
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
