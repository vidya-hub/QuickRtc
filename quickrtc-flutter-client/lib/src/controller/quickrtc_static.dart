import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/platform/quickrtc_platform.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Exception thrown when screen capture permission is not granted
class ScreenCapturePermissionException implements Exception {
  final String message;
  final bool canRequestPermission;

  const ScreenCapturePermissionException({
    required this.message,
    this.canRequestPermission = true,
  });

  @override
  String toString() => 'ScreenCapturePermissionException: $message';
}

/// Static utility methods for QuickRTC
///
/// These methods can be called without creating a QuickRTCController instance.
/// Useful for getting local media before joining a conference or for
/// managing media devices independently.
abstract class QuickRTCStatic {
  /// Get local media (camera, microphone, screen share)
  ///
  /// Example:
  /// ```dart
  /// // Get audio and video
  /// final media = await QuickRTCStatic.getLocalMedia(MediaConfig.audioVideo());
  ///
  /// // Get screen share only
  /// final screen = await QuickRTCStatic.getLocalMedia(MediaConfig.screenShareOnly());
  ///
  /// // Get with custom config
  /// final media = await QuickRTCStatic.getLocalMedia(MediaConfig(
  ///   audio: true,
  ///   video: true,
  ///   audioConfig: AudioConfig(echoCancellation: true),
  ///   videoConfig: VideoConfig.hd,
  /// ));
  /// ```
  static Future<LocalMedia> getLocalMedia(MediaConfig config) async {
    MediaStream? cameraStream;
    MediaStream? screenStream;
    MediaStreamTrack? audioTrack;
    MediaStreamTrack? videoTrack;
    MediaStreamTrack? screenshareTrack;
    MediaStreamTrack? screenshareAudioTrack;
    final capturedTypes = <MediaType>{};

    try {
      // Get camera/microphone media
      if (config.audio || config.video) {
        final constraints = <String, dynamic>{};

        if (config.audio) {
          constraints['audio'] = config.audioConfig?.toConstraints() ?? true;
        }

        if (config.video) {
          constraints['video'] = config.videoConfig?.toConstraints() ??
              {
                'facingMode': 'user',
                'width': 1280,
                'height': 720,
              };
        }

        // IMPORTANT: Keep the original stream from getUserMedia.
        // On macOS, the camera is only released when this specific stream is disposed.
        // Do NOT create a new stream and copy tracks - use the original stream directly.
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (config.audio) {
          final audioTracks = cameraStream.getAudioTracks();
          if (audioTracks.isNotEmpty) {
            audioTrack = audioTracks.first;
            capturedTypes.add(MediaType.audio);
          }
        }

        if (config.video) {
          final videoTracks = cameraStream.getVideoTracks();
          if (videoTracks.isNotEmpty) {
            videoTrack = videoTracks.first;
            capturedTypes.add(MediaType.video);
          }
        }
      }

      // Get screen share media
      if (config.screenshare) {
        screenStream = await _getScreenShareStream(config.screenshareConfig);

        final videoTracks = screenStream.getVideoTracks();
        if (videoTracks.isNotEmpty) {
          screenshareTrack = videoTracks.first;
          capturedTypes.add(MediaType.screenshare);
        }

        // Check for system audio (if captured)
        final audioTracks = screenStream.getAudioTracks();
        if (audioTracks.isNotEmpty) {
          screenshareAudioTrack = audioTracks.first;
        }
      }

      // IMPORTANT: Use the original cameraStream from getUserMedia directly.
      // On macOS, the camera hardware is only released when the original stream
      // from getUserMedia is disposed. Creating a new stream and copying tracks
      // would leave the original stream undisposed and the camera LED on.
      //
      // If we only have screen share (no camera/mic), create an empty stream.
      final mainStream =
          cameraStream ?? await createLocalMediaStream('quickrtc_local_media');

      return LocalMedia(
        stream: mainStream,
        audioTrack: audioTrack,
        videoTrack: videoTrack,
        screenshareTrack: screenshareTrack,
        screenshareAudioTrack: screenshareAudioTrack,
        screenshareStream: screenStream,
        capturedTypes: capturedTypes,
      );
    } catch (e) {
      // Cleanup on error
      cameraStream?.dispose();
      screenStream?.dispose();
      rethrow;
    }
  }

  /// Get screen share stream with platform-specific handling
  static Future<MediaStream> _getScreenShareStream(
      ScreenShareConfig? config,) async {
    final effectiveConfig = config ?? ScreenShareConfig.defaultConfig;

    // Build constraints based on platform
    final constraints = <String, dynamic>{
      'video': {
        ...effectiveConfig.toConstraints(),
        'cursor': 'always',
      },
    };

    // Add audio constraints for system audio capture
    if (effectiveConfig.includeSystemAudio) {
      constraints['audio'] = {
        'mandatory': {
          'chromeMediaSource': 'desktop',
        },
      };
    }

    // Platform-specific screen capture
    if (WebRTC.platformIsDesktop) {
      return await _getDesktopScreenShare(effectiveConfig);
    } else if (WebRTC.platformIsWeb) {
      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } else if (WebRTC.platformIsMobile) {
      return await _getMobileScreenShare(effectiveConfig);
    } else {
      return await navigator.mediaDevices.getDisplayMedia(constraints);
    }
  }

  /// Get screen share on desktop platforms (macOS, Windows, Linux)
  ///
  /// Uses flutter_webrtc's getDisplayMedia API without custom dialogs.
  static Future<MediaStream> _getDesktopScreenShare(ScreenShareConfig config,
      [BuildContext? context,]) async {
    // On macOS, check/request TCC permission first
    if (!kIsWeb && Platform.isMacOS) {
      final hasPermission =
          await QuickRTCPlatform.checkScreenCapturePermission();
      if (!hasPermission) {
        debugPrint(
            'QuickRTC: Screen capture permission not granted, requesting...',);
        final granted = await QuickRTCPlatform.requestScreenCapturePermission();
        if (!granted) {
          throw const ScreenCapturePermissionException(
            message: 'Screen recording permission denied. '
                'Please enable it in System Preferences > Privacy & Security > Screen Recording, '
                'then restart the app.',
            canRequestPermission: false,
          );
        }
      }
    }

    // Create basic constraints without pre-selecting a source
    // This allows flutter_webrtc to use its native picker behavior
    final constraints = <String, dynamic>{
      'video': {
        'mandatory': <String, dynamic>{
          'frameRate': (config.frameRate ?? 30).toDouble(),
        },
      },
    };

    // Add resolution constraints if specified (must be doubles)
    if (config.width != null) {
      (constraints['video'] as Map)['mandatory']['minWidth'] =
          config.width!.toDouble();
      (constraints['video'] as Map)['mandatory']['maxWidth'] =
          config.width!.toDouble();
    }
    if (config.height != null) {
      (constraints['video'] as Map)['mandatory']['minHeight'] =
          config.height!.toDouble();
      (constraints['video'] as Map)['mandatory']['maxHeight'] =
          config.height!.toDouble();
    }

    debugPrint(
        'QuickRTC: Calling getDisplayMedia (flutter_webrtc native behavior)',);
    return await navigator.mediaDevices.getDisplayMedia(constraints);
  }

  /// Get screen share on mobile platforms
  ///
  /// On Android 14+ (SDK 34+), the flow is:
  /// 1. Call flutter_webrtc's Helper.requestCapturePermission() to get user permission
  ///    (flutter_webrtc stores the mediaProjectionData internally)
  /// 2. Start our foreground service (now allowed because permission was granted)
  ///    - The service calls startForeground() with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
  ///    - We poll until the service is fully ready
  /// 3. Call getDisplayMedia() - flutter_webrtc sees mediaProjectionData is not null,
  ///    so it skips the permission dialog and directly uses the stored data
  ///
  /// This implementation follows GetStream's proven pattern for Android 14+ compatibility.
  ///
  /// On Android 10-13, the flow is:
  /// 1. Start foreground service first
  /// 2. Then call flutter_webrtc's getDisplayMedia() (which shows its own dialog)
  static Future<MediaStream> _getMobileScreenShare(
      ScreenShareConfig config,) async {
    if (!kIsWeb && Platform.isAndroid) {
      // Get Android SDK version to determine the flow
      final sdkVersion = await QuickRTCPlatform.getAndroidSdkVersion();
      debugPrint('QuickRTC: Android SDK version: $sdkVersion');

      if (sdkVersion >= 34) {
        // Android 14+ (SDK 34+): Request permission first, then start service
        // This is the correct order required by Android 14+
        debugPrint(
            'QuickRTC: Android 14+ - requesting MediaProjection permission first',);

        // Step 1: Request permission using flutter_webrtc's built-in method
        // This shows ONE permission dialog and stores the result internally
        final permissionGranted = await Helper.requestCapturePermission();
        if (!permissionGranted) {
          throw const ScreenCapturePermissionException(
            message: 'Screen capture permission denied by user.',
            canRequestPermission: true,
          );
        }
        debugPrint('QuickRTC: MediaProjection permission granted');

        // Step 2: Start foreground service AFTER permission is granted
        // startScreenCaptureService() will poll until the service is ready
        debugPrint('QuickRTC: Starting foreground service');
        final serviceStarted =
            await QuickRTCPlatform.startScreenCaptureService();
        if (!serviceStarted) {
          throw Exception('Failed to start screen capture foreground service. '
              'Screen sharing requires a foreground service on Android 14+.');
        }
        debugPrint('QuickRTC: Foreground service started and ready');

        // Step 3: Now call getDisplayMedia - flutter_webrtc will skip the
        // permission dialog because mediaProjectionData is already stored
      } else if (sdkVersion >= 29) {
        // Android 10-13 (SDK 29-33): Start service first, then request permission
        debugPrint(
            'QuickRTC: Android 10-13 detected, starting foreground service first',);
        final serviceStarted =
            await QuickRTCPlatform.startScreenCaptureService();
        if (!serviceStarted) {
          throw Exception('Failed to start screen capture foreground service. '
              'Screen sharing requires a foreground service on Android 10+.');
        }
      }
      // Android < 10: No service needed
    }

    try {
      final constraints = <String, dynamic>{
        'video': {
          ...config.toConstraints(),
        },
      };

      if (config.includeSystemAudio) {
        constraints['audio'] = true;
      }

      debugPrint(
          'QuickRTC: Calling getDisplayMedia with constraints: $constraints',);
      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (e) {
      debugPrint('QuickRTC: getDisplayMedia failed: $e');
      if (!kIsWeb && Platform.isAndroid) {
        await QuickRTCPlatform.stopScreenCaptureService();
      }
      rethrow;
    }
  }

  /// Check if screen capture permission is granted (macOS only)
  ///
  /// On other platforms, returns true.
  static Future<bool> checkScreenCapturePermission() async {
    return await QuickRTCPlatform.checkScreenCapturePermission();
  }

  /// Request screen capture permission (macOS only)
  ///
  /// On macOS 10.15+, this will show the system permission dialog if not
  /// already granted. Note that this dialog only appears once per app install.
  /// If denied, the user must manually enable it in System Preferences.
  ///
  /// On other platforms, returns true.
  static Future<bool> requestScreenCapturePermission() async {
    return await QuickRTCPlatform.requestScreenCapturePermission();
  }

  /// Open System Preferences to Screen Recording settings (macOS only)
  ///
  /// Useful when permission has been denied and the user needs to
  /// manually enable it.
  static Future<void> openScreenCaptureSettings() async {
    await QuickRTCPlatform.openScreenCaptureSettings();
  }

  /// Get available screen share sources (desktop only)
  ///
  /// Returns a list of available screens and windows that can be shared.
  /// On macOS, requires screen recording permission to return results.
  static Future<List<DesktopCapturerSource>> getScreenShareSources({
    bool includeScreens = true,
    bool includeWindows = true,
  }) async {
    if (!WebRTC.platformIsDesktop) {
      return [];
    }

    // On macOS, check permission first
    if (!kIsWeb && Platform.isMacOS) {
      final hasPermission =
          await QuickRTCPlatform.checkScreenCapturePermission();
      if (!hasPermission) {
        debugPrint(
            'QuickRTC: Screen capture permission not granted for getSources',);
        return [];
      }
    }

    final types = <SourceType>[];
    if (includeScreens) types.add(SourceType.Screen);
    if (includeWindows) types.add(SourceType.Window);

    try {
      return await desktopCapturer.getSources(types: types);
    } catch (e) {
      debugPrint('QuickRTC: Error getting screen sources: $e');
      return [];
    }
  }

  /// Get screen share with a picker dialog (desktop only)
  ///
  /// Shows a Flutter dialog to select a screen or window to share.
  /// This is the recommended way to get screen share on desktop platforms
  /// as it allows the user to choose what to share.
  ///
  /// Returns a [LocalMedia] with the screen share stream and track.
  /// Throws if the user cancels or permission is denied.
  ///
  /// Example:
  /// ```dart
  /// final media = await QuickRTCStatic.getScreenShareWithPicker(context);
  /// // Use media.screenshareTrack for producing
  /// await controller.produce(ProduceInput.fromTracksWithTypes(media.tracksWithTypes));
  /// ```
  static Future<LocalMedia> getScreenShareWithPicker(
    BuildContext context, {
    ScreenShareConfig? config,
  }) async {
    if (!WebRTC.platformIsDesktop) {
      throw Exception(
          'getScreenShareWithPicker is only available on desktop platforms',);
    }

    // Get the stream using flutter_webrtc's native behavior
    final effectiveConfig = config ?? ScreenShareConfig.defaultConfig;
    final stream = await _getDesktopScreenShare(effectiveConfig, context);

    // Build LocalMedia result
    final videoTracks = stream.getVideoTracks();
    final audioTracks = stream.getAudioTracks();

    return LocalMedia(
      stream: stream,
      screenshareStream: stream,
      screenshareTrack: videoTracks.isNotEmpty ? videoTracks.first : null,
      screenshareAudioTrack: audioTracks.isNotEmpty ? audioTracks.first : null,
      capturedTypes: {MediaType.screenshare},
    );
  }

  /// Get screen share from a specific source (desktop only)
  ///
  /// Use [getScreenShareSources] first to get available sources,
  /// or use [getScreenShareWithPicker] for a user-friendly picker dialog.
  static Future<MediaStream> getScreenShareFromSource(
    DesktopCapturerSource source, {
    ScreenShareConfig? config,
  }) async {
    // On macOS, verify permission
    if (!kIsWeb && Platform.isMacOS) {
      final hasPermission =
          await QuickRTCPlatform.checkScreenCapturePermission();
      if (!hasPermission) {
        throw const ScreenCapturePermissionException(
          message: 'Screen recording permission not granted.',
          canRequestPermission: true,
        );
      }
    }

    final effectiveConfig = config ?? ScreenShareConfig.defaultConfig;

    // Log detailed source information for debugging
    debugPrint('QuickRTC: === Screen Share Source Details ===');
    debugPrint('QuickRTC: Source ID: ${source.id}');
    debugPrint('QuickRTC: Source Name: ${source.name}');
    debugPrint('QuickRTC: Source Type: ${source.type}');
    debugPrint('QuickRTC: Has Thumbnail: ${source.thumbnail != null}');

    // IMPORTANT: Refresh the native source list before capturing to ensure
    // the source ID is available in the native _captureSources array.
    // This is necessary because the native getDisplayMedia looks up the source
    // by ID in this array, and it may have been cleared/modified since the picker
    // dialog was shown.
    final sourceTypes = source.type == SourceType.Screen
        ? [SourceType.Screen]
        : [SourceType.Window];
    debugPrint(
        'QuickRTC: Refreshing native source list for types: $sourceTypes',);
    final refreshedSources =
        await desktopCapturer.getSources(types: sourceTypes);
    debugPrint(
        'QuickRTC: Native source list refreshed, found ${refreshedSources.length} sources',);

    // Verify our source ID is in the refreshed list
    final matchingSource =
        refreshedSources.where((s) => s.id == source.id).toList();
    if (matchingSource.isEmpty) {
      debugPrint(
          'QuickRTC: WARNING - Source ID ${source.id} not found in refreshed list!',);
      debugPrint('QuickRTC: Available source IDs:');
      for (final s in refreshedSources) {
        debugPrint('QuickRTC:   - ${s.id} (${s.name}) [${s.type}]');
      }
    } else {
      debugPrint(
          'QuickRTC: Source ID ${source.id} confirmed in refreshed list',);
    }

    // IMPORTANT: Use getDisplayMedia for desktop screen capture, NOT getUserMedia
    // The deviceId format with 'exact' is required for getDisplayMedia on desktop
    // All numeric values must be doubles for flutter_webrtc
    final constraints = <String, dynamic>{
      'video': {
        'deviceId': {'exact': source.id},
        'mandatory': <String, dynamic>{
          'frameRate': (effectiveConfig.frameRate ?? 30).toDouble(),
        },
      },
    };

    // Add resolution constraints if specified (must be doubles)
    if (effectiveConfig.width != null) {
      (constraints['video'] as Map)['mandatory']['minWidth'] =
          effectiveConfig.width!.toDouble();
      (constraints['video'] as Map)['mandatory']['maxWidth'] =
          effectiveConfig.width!.toDouble();
    }
    if (effectiveConfig.height != null) {
      (constraints['video'] as Map)['mandatory']['minHeight'] =
          effectiveConfig.height!.toDouble();
      (constraints['video'] as Map)['mandatory']['maxHeight'] =
          effectiveConfig.height!.toDouble();
    }

    debugPrint('QuickRTC: Constraints: $constraints');

    // Use getDisplayMedia for screen capture on desktop
    try {
      final stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      debugPrint('QuickRTC: Stream created successfully');
      debugPrint('QuickRTC: Video tracks: ${stream.getVideoTracks().length}');
      if (stream.getVideoTracks().isNotEmpty) {
        final track = stream.getVideoTracks().first;
        debugPrint('QuickRTC: Track ID: ${track.id}');
        debugPrint('QuickRTC: Track Label: ${track.label}');
        debugPrint('QuickRTC: Track Enabled: ${track.enabled}');
        debugPrint('QuickRTC: Track Muted: ${track.muted}');
      }
      return stream;
    } catch (e, stackTrace) {
      debugPrint('QuickRTC: getDisplayMedia failed: $e');
      debugPrint('QuickRTC: Stack trace: $stackTrace');
      rethrow;
    }
  }

  /// Switch camera between front and back (mobile only)
  static Future<MediaStreamTrack?> switchCamera(
      MediaStreamTrack currentTrack,) async {
    if (!WebRTC.platformIsMobile) {
      throw Exception('switchCamera is only available on mobile platforms');
    }

    try {
      await Helper.switchCamera(currentTrack);
      return currentTrack;
    } catch (e) {
      rethrow;
    }
  }

  /// Get available media devices
  static Future<List<MediaDeviceInfo>> getMediaDevices() async {
    return await navigator.mediaDevices.enumerateDevices();
  }

  /// Get available audio input devices (microphones)
  static Future<List<MediaDeviceInfo>> getAudioInputDevices() async {
    final devices = await getMediaDevices();
    return devices.where((d) => d.kind == 'audioinput').toList();
  }

  /// Get available video input devices (cameras)
  static Future<List<MediaDeviceInfo>> getVideoInputDevices() async {
    final devices = await getMediaDevices();
    return devices.where((d) => d.kind == 'videoinput').toList();
  }

  /// Get available audio output devices (speakers)
  static Future<List<MediaDeviceInfo>> getAudioOutputDevices() async {
    final devices = await getMediaDevices();
    return devices.where((d) => d.kind == 'audiooutput').toList();
  }
}
