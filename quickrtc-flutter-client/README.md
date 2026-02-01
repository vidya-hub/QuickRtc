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
  quickrtc_flutter_client: ^1.1.0
```

## Quick Start (Simplest Way)

Use the `QuickRTCConference` widget for a batteries-included experience:

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

QuickRTCConference(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'my-room',
  participantName: 'John',
  onJoined: (controller) => controller.enableMedia(),
  builder: (context, state, controller) {
    return Column(
      children: [
        // Video grid
        Expanded(
          child: GridView.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2),
            itemCount: state.participantList.length + 1,
            itemBuilder: (_, index) {
              if (index == 0) {
                return QuickRTCMediaRenderer(
                  stream: state.localVideoStream?.stream,
                  mirror: true,
                  isLocal: true,
                );
              }
              final p = state.participantList[index - 1];
              return QuickRTCMediaRenderer(
                remoteStream: p.videoStream,
                participantName: p.name,
              );
            },
          ),
        ),
        // Controls using new convenience getters
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: Icon(state.isLocalAudioActive ? Icons.mic : Icons.mic_off),
              onPressed: () => controller.toggleMicrophoneMute(),
            ),
            IconButton(
              icon: Icon(state.isLocalVideoActive ? Icons.videocam : Icons.videocam_off),
              onPressed: () => controller.toggleCameraPause(),
            ),
            IconButton(
              icon: Icon(state.isLocalScreenshareActive ? Icons.stop_screen_share : Icons.screen_share),
              onPressed: () => controller.toggleScreenShareWithPicker(context),
            ),
          ],
        ),
      ],
    );
  },
)
```

## Quick Start (Controller API)

For more control, use `QuickRTCController.connect()`:

```dart
// Connect and join in one step
final controller = await QuickRTCController.connect(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'my-room',
  participantName: 'John',
);

// Enable camera and microphone
await controller.enableMedia();

// Later: leave and cleanup (socket auto-disconnects)
await controller.leaveMeeting();
controller.dispose();
```

## Manual Setup (Full Control)

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// Create socket (or use QuickRTCSocket.connect() for simpler setup)
final socket = await QuickRTCSocket.connect('https://your-server.com:3000');

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
      icon: Icon(state.isLocalAudioActive ? Icons.mic : Icons.mic_off),
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

> **Note:** `QuickRTCConference` includes this automatically when `autoRenderAudio: true` (default).

## Screen Sharing

```dart
// Simplest: use toggleScreenShareWithPicker (handles platform detection)
await controller.toggleScreenShareWithPicker(context);

// Or manually:
// Mobile
final media = await QuickRTCStatic.getLocalMedia(MediaConfig.screenShareOnly());

// Desktop (with picker)
final media = await QuickRTCStatic.getScreenShareWithPicker(context);

// Publish
await controller.produce(
  ProduceInput.fromTrack(media.screenshareTrack!, type: StreamType.screenshare),
);
```

### Android Screen Share External Stop Detection

On Android, when screen sharing is stopped via the system notification ("Stop now" button) or when MediaProjection is revoked, the SDK automatically detects this and:

1. Stops the local screen share
2. Emits `closeProducer` to the server
3. Other participants are notified and remove the screen share tile

This is handled automatically - no additional code is required. The SDK uses multiple detection strategies:
- Track `onMute` callback
- Track `muted` property monitoring
- Producer RTP stats monitoring (detects when no new bytes are being sent)

## Leave Meeting

```dart
await controller.leaveMeeting();
controller.dispose();
// If using manual socket setup:
socket.disconnect();
```

## Platform Setup

### Android

`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Required for screen sharing on Android 10+ -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- Required for screen sharing on Android 14+ (API 34+) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
```

`android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        minSdkVersion 24
    }
}
```

> **Note:** On Android 14+, the SDK handles the foreground service requirement automatically. The service includes a notification with a "Stop" button for users to stop screen sharing.

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
// Connection
state.isConnected           // Connection status
state.participantList       // List<RemoteParticipant>
state.participantCount      // Number of participants

// Local media presence
state.hasLocalAudio         // Mic active
state.hasLocalVideo         // Camera active
state.hasLocalScreenshare   // Screen share active

// Local media paused state
state.isLocalAudioPaused    // Mic muted
state.isLocalVideoPaused    // Camera paused
state.isLocalScreensharePaused // Screen share paused

// NEW in 1.1.0: Convenience getters (active = present && not paused)
state.isLocalAudioActive    // hasLocalAudio && !isLocalAudioPaused
state.isLocalVideoActive    // hasLocalVideo && !isLocalVideoPaused
state.isLocalScreenshareActive // hasLocalScreenshare && !isLocalScreensharePaused

// Streams
state.localVideoStream      // LocalStream?
state.localAudioStream      // LocalStream?
state.localScreenshareStream // LocalStream?
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

## What's New in 1.1.0

- **Version consolidation** - Single unified version for all components
- **Android screen share external stop detection** - Automatically detects when screen sharing is stopped via system notification and notifies other participants
- **Producer stats monitoring** - Reliable detection of stalled screen share streams
- **`QuickRTCConference` widget** - Batteries-included widget that handles socket, controller lifecycle, and audio rendering
- **`QuickRTCController.connect()`** - One-liner to connect and join
- **`QuickRTCSocket.connect()`** - Simplified socket connection
- **`toggleScreenShareWithPicker(context)`** - Platform-aware screen sharing toggle
- **Convenience getters** - `isLocalAudioActive`, `isLocalVideoActive`, `isLocalScreenshareActive`

## Example

See [example/](./example) for code snippets demonstrating basic features. For a complete working application, refer to the [QuickRTC Example Repository](https://github.com/vidya-hub/QuickRTC/tree/main/quickrtc-example/flutter-client).

## Documentation

Full documentation: [quickrtc-docs.vercel.app/docs/flutter/getting-started](https://quickrtc-docs.vercel.app/docs/flutter/getting-started)
