---
sidebar_position: 6
---

# Screen Sharing

Share your screen with meeting participants.

## Quick Start

The simplest way to add screen sharing is using `toggleScreenShareWithPicker()`:

```dart
// Handles everything automatically:
// - Platform detection (desktop vs mobile)
// - Showing appropriate picker dialog
// - Stopping if already sharing
await controller.toggleScreenShareWithPicker(context);
```

This method:
- **Desktop (macOS, Windows, Linux)**: Shows native screen/window picker
- **Mobile (iOS, Android)**: Uses system screen capture
- **Web**: Uses browser's built-in picker
- **Toggle behavior**: Stops screen share if already active

## Desktop (macOS, Windows, Linux)

### Using `toggleScreenShareWithPicker` (Recommended)

```dart
IconButton(
  icon: Icon(state.isLocalScreenshareActive
      ? Icons.stop_screen_share
      : Icons.screen_share),
  onPressed: () => controller.toggleScreenShareWithPicker(context),
)
```

### Manual Approach with Picker

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

### Using `toggleScreenShareWithPicker` (Recommended)

```dart
// Same API works on mobile - no context picker needed
await controller.toggleScreenShareWithPicker(context);
```

### Manual Approach

```dart
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.screenShareOnly(),
);

if (media.screenshareTrack != null) {
  await controller.produce(
    ProduceInput.fromTrack(
      media.screenshareTrack!,
      type: StreamType.screenshare,
    ),
  );
}
```

### Android Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
```

## Stop Screen Sharing

```dart
// Using toggle (if already sharing, stops it)
await controller.toggleScreenShareWithPicker(context);

// Or explicitly stop
await controller.stopScreenShare();

// Or via state
await controller.state.localScreenshareStream?.stop();
```

## Check Screen Share Status

```dart
// Is screen share active?
if (state.hasLocalScreenshare) {
  // Screen share is being produced
}

// Is it active AND not paused?
if (state.isLocalScreenshareActive) {
  // Screen share is being produced and not paused
}
```

## Config Options

```dart
// With toggleScreenShareWithPicker
await controller.toggleScreenShareWithPicker(
  context,
  config: ScreenShareConfig(
    width: 1920,
    height: 1080,
    frameRate: 30,
  ),
);

// With MediaConfig
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

## Complete Example

```dart
class ConferenceControls extends StatelessWidget {
  final QuickRTCController controller;
  final QuickRTCState state;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Mic toggle
        IconButton(
          icon: Icon(state.isLocalAudioActive ? Icons.mic : Icons.mic_off),
          onPressed: () => controller.toggleMicrophoneMute(),
        ),
        // Camera toggle
        IconButton(
          icon: Icon(state.isLocalVideoActive ? Icons.videocam : Icons.videocam_off),
          onPressed: () => controller.toggleCameraPause(),
        ),
        // Screen share toggle - works on all platforms
        IconButton(
          icon: Icon(
            state.isLocalScreenshareActive
                ? Icons.stop_screen_share
                : Icons.screen_share,
          ),
          onPressed: () => controller.toggleScreenShareWithPicker(context),
        ),
      ],
    );
  }
}
```
