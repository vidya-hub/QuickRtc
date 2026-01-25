---
sidebar_position: 6
---

# Screen Sharing

Share your screen with meeting participants.

## Quick Start

```dart
// Get screen share media
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.screenShareOnly(),
);

// Publish to meeting
if (media.screenshareTrack != null) {
  await controller.produce(
    ProduceInput.fromTrack(
      media.screenshareTrack!,
      type: StreamType.screenshare,
    ),
  );
}
```

## Desktop (macOS, Windows, Linux)

Use the picker dialog to let users select a window or screen:

```dart
final media = await QuickRTCStatic.getScreenShareWithPicker(context);

if (media.screenshareTrack != null) {
  await controller.produce(
    ProduceInput.fromTrack(
      media.screenshareTrack!,
      type: StreamType.screenshare,
    ),
  );
}
```

### macOS Permissions

Users must grant screen recording permission:

**System Preferences → Privacy & Security → Screen Recording**

To check/request permission:

```dart
// Check permission
final hasPermission = await QuickRTCStatic.checkScreenCapturePermission();

// Request permission
await QuickRTCStatic.requestScreenCapturePermission();

// Open settings
await QuickRTCStatic.openScreenCaptureSettings();
```

## Mobile (Android, iOS)

Screen sharing uses the system screen capture:

```dart
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.screenShareOnly(),
);
```

### Android Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
```

## Stop Screen Sharing

```dart
await controller.state.localScreenshareStream?.stop();
```

## Config Options

```dart
MediaConfig.screenShareOnly(
  config: ScreenShareConfig(
    width: 1920,
    height: 1080,
    frameRate: 30,
  ),
)
```

Presets:

```dart
ScreenShareConfig.defaultConfig  // 1080p, 30fps
ScreenShareConfig.highQuality    // 1080p, 60fps
```
