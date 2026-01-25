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
  quickrtc_flutter_client: ^1.0.2
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

// Wrap your app with QuickRTCProvider
QuickRTCProvider(
  controller: controller,
  child: const MyApp(),
);

// Join meeting
await controller.joinMeeting(
  conferenceId: 'my-room',
  participantName: 'John',
);
```

## Builder, Consumer & Listener Patterns

The SDK provides several widgets to simplify state management and UI updates.

### QuickRTCBuilder

Use this for reactive UI updates. It only rebuilds when the specified condition is met.

```dart
QuickRTCBuilder(
  buildWhen: (prev, curr) => prev.participantCount != curr.participantCount,
  builder: (context, state) {
    return Text('Participants: ${state.participantCount}');
  },
)
```

### QuickRTCConsumer

Use this when you need both the `controller` and the `state` in your build method.

```dart
QuickRTCConsumer(
  builder: (context, controller, state, child) {
    return IconButton(
      icon: Icon(state.isLocalAudioPaused ? Icons.mic_off : Icons.mic),
      onPressed: () => controller.toggleMicrophoneMute(),
    );
  },
)
```

### QuickRTCListener

Use this for occasional side effects like showing notifications or navigation, without rebuilding the UI.

```dart
QuickRTCListener(
  listenWhen: (prev, curr) => prev.error != curr.error && curr.error != null,
  listener: (context, controller) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(controller.state.error!)),
    );
  },
  child: const YourWidget(),
)
```

## Rendering Media

### QuickRTCMediaRenderer

Powerful widget for rendering local and remote video streams.

```dart
// Local video with mirroring
QuickRTCMediaRenderer(
  stream: state.localVideoStream?.stream,
  mirror: true,
  isLocal: true,
  participantName: 'You',
)

// Remote video from participant
QuickRTCMediaRenderer(
  remoteStream: participant.videoStream,
  participantName: participant.name,
  isAudioEnabled: participant.hasAudio && !participant.isAudioMuted,
  isVideoEnabled: participant.hasVideo && !participant.isVideoMuted,
)
```

### QuickRTCAudioRenderers

Invisible widget that handles audio playback for all remote participants.

```dart
QuickRTCAudioRenderers(participants: state.participantList)
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

See [example/](./example) for code snippets demonstrating basic features. For a complete working application, refer to the [QuickRTC Example Repository](https://github.com/vidya-hub/QuickRTC/tree/main/quickrtc-example/flutter-client).

## Documentation

Full documentation: [quickrtc-docs.vercel.app/docs/flutter/getting-started](https://quickrtc-docs.vercel.app/docs/flutter/getting-started)
