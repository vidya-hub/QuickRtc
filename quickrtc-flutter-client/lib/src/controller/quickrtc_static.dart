import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/platform/quickrtc_platform.dart';
import 'package:quickrtc_flutter_client/types.dart';

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

  /// Get screen share on desktop platforms
  static Future<MediaStream> _getDesktopScreenShare(
      ScreenShareConfig config) async {
    final sources = await desktopCapturer.getSources(
      types: config.preferWindow
          ? [SourceType.Window, SourceType.Screen]
          : [SourceType.Screen, SourceType.Window],
    );

    if (sources.isEmpty) {
      throw Exception(
          'No screen share sources available. Please grant screen recording permission in System Preferences > Privacy & Security > Screen Recording');
    }

    final source = sources.first;

    final constraints = <String, dynamic>{
      'audio': false,
      'video': {
        'mandatory': {
          'sourceId': source.id,
          'frameRate': config.frameRate ?? 30,
          'minWidth': config.width ?? 1280,
          'minHeight': config.height ?? 720,
        },
      },
    };

    return await navigator.mediaDevices.getUserMedia(constraints);
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

  /// Get available screen share sources (desktop only)
  ///
  /// Returns a list of available screens and windows that can be shared.
  static Future<List<DesktopCapturerSource>> getScreenShareSources({
    bool includeScreens = true,
    bool includeWindows = true,
  }) async {
    if (!WebRTC.platformIsDesktop) {
      return [];
    }

    final types = <SourceType>[];
    if (includeScreens) types.add(SourceType.Screen);
    if (includeWindows) types.add(SourceType.Window);

    return await desktopCapturer.getSources(types: types);
  }

  /// Get screen share from a specific source (desktop only)
  static Future<MediaStream> getScreenShareFromSource(
    DesktopCapturerSource source, {
    ScreenShareConfig? config,
  }) async {
    final effectiveConfig = config ?? ScreenShareConfig.defaultConfig;

    final constraints = <String, dynamic>{
      'video': {
        'deviceId': {'exact': source.id},
        'mandatory': {
          'frameRate': effectiveConfig.frameRate ?? 30,
        },
      },
    };

    if (effectiveConfig.width != null) {
      (constraints['video'] as Map)['mandatory']['width'] =
          effectiveConfig.width;
    }
    if (effectiveConfig.height != null) {
      (constraints['video'] as Map)['mandatory']['height'] =
          effectiveConfig.height;
    }

    if (effectiveConfig.includeSystemAudio) {
      constraints['audio'] = {
        'deviceId': {'exact': source.id},
      };
    }

    return await navigator.mediaDevices.getUserMedia(constraints);
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
