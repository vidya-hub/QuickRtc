---
sidebar_position: 3
---

# Media

Capture and manage audio/video.

## Getting Media

Use `QuickRTCStatic.getLocalMedia()` to capture media:

```dart
// Audio + Video
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.audioVideo(),
);

// Audio only
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.audioOnly(),
);

// Video only
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.videoOnly(),
);

// Screen share
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.screenShareOnly(),
);
```

## Publishing Media

Publish captured media to the meeting:

```dart
await controller.produce(
  ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
);
```

## Video Config

```dart
// Presets
VideoConfig.frontCamera  // 720p, front camera
VideoConfig.backCamera   // 720p, back camera
VideoConfig.hd           // 1280x720
VideoConfig.fullHd       // 1920x1080

// Custom
MediaConfig.videoOnly(
  config: VideoConfig(
    width: 1280,
    height: 720,
    frameRate: 30,
    facingMode: 'user',  // 'user' = front, 'environment' = back
  ),
)
```

## Audio Config

```dart
MediaConfig.audioOnly(
  config: AudioConfig(
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  ),
)
```

## Screen Share Config

```dart
ScreenShareConfig.defaultConfig  // 1080p, 30fps
ScreenShareConfig.highQuality    // 1080p, 60fps

// Custom
MediaConfig.screenShareOnly(
  config: ScreenShareConfig(
    width: 1920,
    height: 1080,
    frameRate: 60,
  ),
)
```

## Device Enumeration

```dart
// Get available devices
final cameras = await QuickRTCStatic.getVideoInputDevices();
final mics = await QuickRTCStatic.getAudioInputDevices();
final speakers = await QuickRTCStatic.getAudioOutputDevices();

// Switch camera (mobile)
await QuickRTCStatic.switchCamera(currentTrack);
```

## LocalMedia Properties

After calling `getLocalMedia()`:

```dart
media.stream            // MediaStream
media.audioTrack        // MediaStreamTrack?
media.videoTrack        // MediaStreamTrack?
media.screenshareTrack  // MediaStreamTrack?
media.tracksWithTypes   // List<TrackWithType> for produce()
```

## Disposing Media

```dart
// Dispose when done
await media.dispose();

// Or dispose streams directly
media.stream.dispose();
```
