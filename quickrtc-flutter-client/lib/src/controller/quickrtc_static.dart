import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/platform/quickrtc_platform.dart';
import 'package:quickrtc_flutter_client/types.dart';
import 'package:quickrtc_flutter_client/widgets/screen_select_dialog.dart';

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

      // Create combined stream with all tracks
      final combinedStream =
          await createLocalMediaStream('quickrtc_local_media');
      if (audioTrack != null) combinedStream.addTrack(audioTrack);
      if (videoTrack != null) combinedStream.addTrack(videoTrack);

      return LocalMedia(
        stream: combinedStream,
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
      ScreenShareConfig? config) async {
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
  /// If [context] is provided, shows a Flutter dialog to select the source.
  /// Otherwise, automatically selects the first available screen.
  static Future<MediaStream> _getDesktopScreenShare(ScreenShareConfig config,
      [BuildContext? context]) async {
    // On macOS, check and request screen capture permission first
    if (!kIsWeb && Platform.isMacOS) {
      final hasPermission =
          await QuickRTCPlatform.checkScreenCapturePermission();
      if (!hasPermission) {
        debugPrint(
            'QuickRTC: Screen capture permission not granted, requesting...');
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

    // Get the source - either from picker dialog or auto-select
    DesktopCapturerSource? selectedSource;

    if (context != null && context.mounted) {
      // Show Flutter picker dialog
      selectedSource = await ScreenSelectDialog.show(context);
      if (selectedSource == null) {
        throw Exception('Screen share cancelled by user');
      }
      debugPrint(
          'QuickRTC: User selected: ${selectedSource.name} (${selectedSource.id})');
    } else {
      // Auto-select the first screen source
      final sources = await desktopCapturer.getSources(
        types: config.preferWindow
            ? [SourceType.Window, SourceType.Screen]
            : [SourceType.Screen, SourceType.Window],
      );

      if (sources.isEmpty) {
        throw Exception(
            'No screen share sources available. Please check screen recording permissions.');
      }

      // Find the best source based on preference
      if (config.preferWindow) {
        selectedSource = sources.firstWhere(
          (s) => s.type == SourceType.Window,
          orElse: () => sources.first,
        );
      } else {
        selectedSource = sources.firstWhere(
          (s) => s.type == SourceType.Screen,
          orElse: () => sources.first,
        );
      }
      debugPrint(
          'QuickRTC: Auto-selected: ${selectedSource.name} (${selectedSource.id})');
    }

    // Create constraints with the selected source
    final constraints = <String, dynamic>{
      'video': {
        'deviceId': {'exact': selectedSource.id},
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
        'QuickRTC: Using getDisplayMedia with source: ${selectedSource.id}');
    return await navigator.mediaDevices.getDisplayMedia(constraints);
  }

  /// Get screen share on mobile platforms
  static Future<MediaStream> _getMobileScreenShare(
      ScreenShareConfig config) async {
    if (!kIsWeb && Platform.isAndroid) {
      final serviceStarted = await QuickRTCPlatform.startScreenCaptureService();
      if (!serviceStarted) {
        throw Exception('Failed to start screen capture foreground service. '
            'Screen sharing requires a foreground service on Android 10+.');
      }
      await Future.delayed(const Duration(milliseconds: 100));
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

      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (e) {
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

  /// Show native screen picker dialog (macOS only)
  ///
  /// Displays a native macOS window with preview thumbnails of available
  /// screens and windows. The user can select which source to share.
  ///
  /// Returns a map with the selected source info:
  /// - `id`: The source ID
  /// - `name`: Human-readable name of the source
  /// - `type`: Either "screen" or "window"
  /// - `displayId`: (optional) Display ID for screen sources
  /// - `windowId`: (optional) Window ID for window sources
  ///
  /// Returns null if the user cancels, on non-macOS platforms, or if
  /// screen capture permission is not granted.
  ///
  /// Example:
  /// ```dart
  /// final source = await QuickRTCStatic.showScreenPicker();
  /// if (source != null) {
  ///   print('Selected: ${source['name']} (${source['type']})');
  /// }
  /// ```
  static Future<Map<String, dynamic>?> showScreenPicker() async {
    if (kIsWeb || !Platform.isMacOS) {
      return null;
    }

    // Check permission first
    final hasPermission = await QuickRTCPlatform.checkScreenCapturePermission();
    if (!hasPermission) {
      debugPrint('QuickRTC: Screen capture permission not granted');
      return null;
    }

    return await QuickRTCPlatform.showScreenPicker();
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
            'QuickRTC: Screen capture permission not granted for getSources');
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
          'getScreenShareWithPicker is only available on desktop platforms');
    }

    // On macOS, check and request permission first
    if (!kIsWeb && Platform.isMacOS) {
      final hasPermission =
          await QuickRTCPlatform.checkScreenCapturePermission();
      if (!hasPermission) {
        debugPrint(
            'QuickRTC: Screen capture permission not granted, requesting...');
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

    // Show the picker dialog
    if (!context.mounted) {
      throw Exception('BuildContext is no longer mounted');
    }

    final selectedSource = await ScreenSelectDialog.show(context);
    if (selectedSource == null) {
      throw Exception('Screen share cancelled by user');
    }

    debugPrint(
        'QuickRTC: User selected: ${selectedSource.name} (${selectedSource.id})');

    // Get the stream from the selected source
    final stream = await getScreenShareFromSource(
      selectedSource,
      config: config,
    );

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
        'QuickRTC: Refreshing native source list for types: $sourceTypes');
    final refreshedSources =
        await desktopCapturer.getSources(types: sourceTypes);
    debugPrint(
        'QuickRTC: Native source list refreshed, found ${refreshedSources.length} sources');

    // Verify our source ID is in the refreshed list
    final matchingSource =
        refreshedSources.where((s) => s.id == source.id).toList();
    if (matchingSource.isEmpty) {
      debugPrint(
          'QuickRTC: WARNING - Source ID ${source.id} not found in refreshed list!');
      debugPrint('QuickRTC: Available source IDs:');
      for (final s in refreshedSources) {
        debugPrint('QuickRTC:   - ${s.id} (${s.name}) [${s.type}]');
      }
    } else {
      debugPrint(
          'QuickRTC: Source ID ${source.id} confirmed in refreshed list');
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
      MediaStreamTrack currentTrack) async {
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
