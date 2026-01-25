# QuickRTC Flutter Client

A Flutter WebRTC library built on MediaSoup for real-time video conferencing.

## Features

- **Simple API** - High-level methods for common tasks
- **Cross-Platform** - Android, iOS, macOS, Web
- **Screen Sharing** - Full support for all platforms
- **Auto-Consume** - Automatically handles new participant streams

## Installation

```yaml
dependencies:
  quickrtc_flutter_client:
    git:
      url: https://github.com/vidya-hub/QuickRTC.git
      path: quickrtc-flutter-client
```

## Quick Start

### 1. Connect & Join

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// Create socket
final socket = io.io('https://your-server.com:3000',
  io.OptionBuilder()
    .setTransports(['websocket'])
    .disableAutoConnect()
    .build());
socket.connect();

// Create controller
final controller = QuickRTCController(socket: socket, debug: true);

// Join meeting
await controller.joinMeeting(
  conferenceId: 'my-room',
  participantName: 'John',
);
```

### 2. Start Camera & Mic

```dart
// Get media
final media = await QuickRTCStatic.getLocalMedia(MediaConfig.audioVideo());

// Publish to meeting
await controller.produce(
  ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
);
```

### 3. Control Media

```dart
await controller.toggleMicrophoneMute();  // Mute/unmute mic
await controller.toggleCameraPause();     // Pause/resume camera
```

### 4. Render Video

```dart
// Local video
QuickRTCMediaRenderer(
  stream: localStream,
  mirror: true,
  isLocal: true,
  participantName: 'You',
)

// Remote video
QuickRTCMediaRenderer(
  remoteStream: participant.videoStream,
  participantName: participant.name,
)

// Remote audio (invisible - handles playback)
QuickRTCAudioRenderers(participants: state.participantList)
```

### 5. Listen to State

```dart
ListenableBuilder(
  listenable: controller,
  builder: (context, _) {
    final state = controller.state;
    // state.participantList - remote participants
    // state.hasLocalVideo - camera active
    // state.hasLocalAudio - mic active
    return YourUI();
  },
)
```

### 6. Leave

```dart
await controller.leaveMeeting();
controller.dispose();
socket.disconnect();
```

## Screen Sharing

```dart
// Mobile
final media = await QuickRTCStatic.getLocalMedia(MediaConfig.screenShareOnly());

// Desktop (with picker)
final media = await QuickRTCStatic.getScreenShareWithPicker(context);

// Publish
await controller.produce(
  ProduceInput.fromTrack(media.screenshareTrack!, type: StreamType.screenshare),
);
```

## Platform Setup

### Android

`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

`android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        minSdkVersion 24
    }
}
```

### iOS

`ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone for audio calls</string>
```

### macOS

`macos/Runner/*.entitlements`:

```xml
<key>com.apple.security.device.camera</key>
<true/>
<key>com.apple.security.device.audio-input</key>
<true/>
<key>com.apple.security.network.client</key>
<true/>
```

## State Properties

```dart
state.isConnected           // Connection status
state.participantList       // List<RemoteParticipant>
state.participantCount      // Number of participants
state.hasLocalAudio         // Mic active
state.hasLocalVideo         // Camera active
state.isLocalAudioPaused    // Mic muted
state.isLocalVideoPaused    // Camera paused
state.localVideoStream      // LocalStream?
state.localAudioStream      // LocalStream?
```

## RemoteParticipant

```dart
participant.id              // String
participant.name            // String
participant.videoStream     // RemoteStream?
participant.audioStream     // RemoteStream?
participant.hasVideo        // bool
participant.hasAudio        // bool
participant.isVideoMuted    // bool
participant.isAudioMuted    // bool
```

## Example

See [example/](./example) for code snippets demonstrating all features.

## Documentation

Full documentation: [quickrtc.dev/docs/flutter](https://quickrtc.dev/docs/flutter/overview)
