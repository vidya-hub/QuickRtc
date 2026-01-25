import 'package:quickrtc_flutter_client/src/controller/quickrtc_static.dart';
import 'package:quickrtc_flutter_client/state/quick_rtc_state.dart';
import 'package:quickrtc_flutter_client/types.dart';

/// Mixin providing high-level media control methods
///
/// These methods provide a simpler API for common media operations,
/// delegating to the low-level produce/pause/resume/stop methods.
mixin QuickRTCMediaMixin {
  // Required implementations from the main class
  QuickRTCState get state;

  // Low-level methods (from producer mixin)
  Future<List<LocalStream>> produce(ProduceInput input);
  Future<void> pauseStream(String streamId);
  Future<void> resumeStream(String streamId);
  Future<void> stopStream(String streamId);

  // ============================================================================
  // HIGH-LEVEL: Camera Control
  // ============================================================================

  /// Enable camera (start producing video)
  ///
  /// If camera is already enabled, this is a no-op.
  Future<LocalStream?> enableCamera({VideoConfig? config}) async {
    if (state.hasLocalVideo) {
      return state.localVideoStream;
    }

    final media = await QuickRTCStatic.getLocalMedia(
      MediaConfig.videoOnly(config: config ?? VideoConfig.hd),
    );

    if (media.videoTrack == null) {
      throw Exception('Failed to get video track');
    }

    final streams = await produce(
      ProduceInput.fromTrack(media.videoTrack!, type: StreamType.video),
    );

    return streams.isNotEmpty ? streams.first : null;
  }

  /// Disable camera (stop producing video)
  Future<void> disableCamera() async {
    final videoStream = state.localVideoStream;
    if (videoStream != null) {
      await stopStream(videoStream.id);
    }
  }

  /// Toggle camera on/off
  Future<LocalStream?> toggleCamera({VideoConfig? config}) async {
    if (state.hasLocalVideo) {
      await disableCamera();
      return null;
    } else {
      return await enableCamera(config: config);
    }
  }

  /// Pause camera (temporarily stop sending video)
  Future<void> pauseCamera() async {
    final videoStream = state.localVideoStream;
    if (videoStream != null && !videoStream.paused) {
      await pauseStream(videoStream.id);
    }
  }

  /// Resume camera (resume sending video)
  Future<void> resumeCamera() async {
    final videoStream = state.localVideoStream;
    if (videoStream != null && videoStream.paused) {
      await resumeStream(videoStream.id);
    }
  }

  /// Toggle camera pause state
  ///
  /// If paused, resumes. If active, pauses.
  Future<void> toggleCameraPause() async {
    final videoStream = state.localVideoStream;
    if (videoStream != null) {
      if (videoStream.paused) {
        await resumeCamera();
      } else {
        await pauseCamera();
      }
    }
  }

  // ============================================================================
  // HIGH-LEVEL: Microphone Control
  // ============================================================================

  /// Enable microphone (start producing audio)
  ///
  /// If microphone is already enabled, this is a no-op.
  Future<LocalStream?> enableMicrophone({AudioConfig? config}) async {
    if (state.hasLocalAudio) {
      return state.localAudioStream;
    }

    final media = await QuickRTCStatic.getLocalMedia(
      MediaConfig.audioOnly(config: config),
    );

    if (media.audioTrack == null) {
      throw Exception('Failed to get audio track');
    }

    final streams = await produce(
      ProduceInput.fromTrack(media.audioTrack!, type: StreamType.audio),
    );

    return streams.isNotEmpty ? streams.first : null;
  }

  /// Disable microphone (stop producing audio)
  Future<void> disableMicrophone() async {
    final audioStream = state.localAudioStream;
    if (audioStream != null) {
      await stopStream(audioStream.id);
    }
  }

  /// Toggle microphone on/off
  Future<LocalStream?> toggleMicrophone({AudioConfig? config}) async {
    if (state.hasLocalAudio) {
      await disableMicrophone();
      return null;
    } else {
      return await enableMicrophone(config: config);
    }
  }

  /// Mute microphone (temporarily stop sending audio)
  Future<void> muteMicrophone() async {
    final audioStream = state.localAudioStream;
    if (audioStream != null && !audioStream.paused) {
      await pauseStream(audioStream.id);
    }
  }

  /// Unmute microphone (resume sending audio)
  Future<void> unmuteMicrophone() async {
    final audioStream = state.localAudioStream;
    if (audioStream != null && audioStream.paused) {
      await resumeStream(audioStream.id);
    }
  }

  /// Toggle microphone mute state
  ///
  /// If muted, unmutes. If unmuted, mutes.
  Future<void> toggleMicrophoneMute() async {
    final audioStream = state.localAudioStream;
    if (audioStream != null) {
      if (audioStream.paused) {
        await unmuteMicrophone();
      } else {
        await muteMicrophone();
      }
    }
  }

  // ============================================================================
  // HIGH-LEVEL: Combined Audio + Video Control
  // ============================================================================

  /// Enable both camera and microphone
  Future<List<LocalStream>> enableMedia({MediaConfig? config}) async {
    final effectiveConfig = config ?? MediaConfig.audioVideo();
    final results = <LocalStream>[];

    if (effectiveConfig.audio && !state.hasLocalAudio) {
      final stream =
          await enableMicrophone(config: effectiveConfig.audioConfig);
      if (stream != null) results.add(stream);
    }

    if (effectiveConfig.video && !state.hasLocalVideo) {
      final stream = await enableCamera(config: effectiveConfig.videoConfig);
      if (stream != null) results.add(stream);
    }

    return results;
  }

  /// Disable both camera and microphone
  Future<void> disableMedia() async {
    await disableCamera();
    await disableMicrophone();
  }

  // ============================================================================
  // HIGH-LEVEL: Screen Share Control
  // ============================================================================

  /// Start screen share
  Future<LocalStream?> startScreenShare({ScreenShareConfig? config}) async {
    if (state.hasLocalScreenshare) {
      return state.localScreenshareStream;
    }

    final media = await QuickRTCStatic.getLocalMedia(
      MediaConfig.screenShareOnly(config: config),
    );

    if (media.screenshareTrack == null) {
      throw Exception('Failed to get screenshare track');
    }

    final streams = await produce(
      ProduceInput.fromTrack(media.screenshareTrack!,
          type: StreamType.screenshare,),
    );

    return streams.isNotEmpty ? streams.first : null;
  }

  /// Stop screen share
  Future<void> stopScreenShare() async {
    final screenshareStream = state.localScreenshareStream;
    if (screenshareStream != null) {
      await stopStream(screenshareStream.id);
    }
  }

  /// Toggle screen share on/off
  Future<LocalStream?> toggleScreenShare({ScreenShareConfig? config}) async {
    if (state.hasLocalScreenshare) {
      await stopScreenShare();
      return null;
    } else {
      return await startScreenShare(config: config);
    }
  }
}
