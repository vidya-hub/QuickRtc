# QuickRTC Flutter Example

Code snippets demonstrating how to use the QuickRTC Flutter Client SDK.

## Quick Start

### 1. Socket Connection

```dart
import 'package:socket_io_client/socket_io_client.dart' as io;

final socket = io.io(
  'https://your-server.com:3000',
  io.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .build(),
);
socket.connect();
```

### 2. Create Controller & Join Meeting

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

final controller = QuickRTCController(socket: socket, debug: true);

await controller.joinMeeting(
  conferenceId: 'my-room',
  participantName: 'John',
);
```

### 3. Start Camera & Microphone

```dart
// Get local media
final media = await QuickRTCStatic.getLocalMedia(MediaConfig.audioVideo());

// Publish to meeting
await controller.produce(
  ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
);
```

### 4. Toggle Controls

```dart
await controller.toggleMicrophoneMute();  // Mute/unmute mic
await controller.toggleCameraPause();     // Pause/resume camera
```

### 5. Screen Sharing

```dart
// Mobile
final media = await QuickRTCStatic.getLocalMedia(MediaConfig.screenShareOnly());

// Desktop (with picker dialog)
final media = await QuickRTCStatic.getScreenShareWithPicker(context);

// Publish
await controller.produce(
  ProduceInput.fromTrack(media.screenshareTrack!, type: StreamType.screenshare),
);
```

### 6. Render Video

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

// Remote audio (invisible - plays audio)
QuickRTCAudioRenderers(participants: state.participantList)
```

### 6. Media Rendering

#### QuickRTCMediaRenderer

Display local/remote video with built-in indicators.

```dart
// Local
QuickRTCMediaRenderer(
  stream: localStream,
  mirror: true,
  isLocal: true,
  participantName: 'You',
)

// Remote
QuickRTCMediaRenderer(
  remoteStream: participant.videoStream,
  participantName: participant.name,
)
```

#### QuickRTCAudioRenderers

Invisible widget to handle all remote participant audio.

```dart
QuickRTCAudioRenderers(participants: state.participantList)
```

### 7. State Management Patterns

The SDK provides specialized widgets for efficient state management:

#### QuickRTCBuilder

Rebuilds a specific part of your UI when state changes.

```dart
QuickRTCBuilder(
  buildWhen: (prev, curr) => prev.participantCount != curr.participantCount,
  builder: (context, state) {
    return Text('Count: ${state.participantCount}');
  },
)
```

#### QuickRTCConsumer

Access the controller and state directly in your builder.

```dart
QuickRTCConsumer(
  builder: (context, controller, state, child) {
    return ControlButton(
      isActive: state.hasLocalVideo,
      onPressed: () => controller.toggleCameraPause(),
    );
  },
)
```

#### QuickRTCListener

Perform side-effects (like showing snackbars) based on state changes.

```dart
QuickRTCListener(
  listenWhen: (prev, curr) => prev.error != curr.error && curr.error != null,
  listener: (context, state) {
    showError(state.error!);
  },
  child: YourContent(),
)
```

### 8. Leave Meeting

```dart
await controller.leaveMeeting();
controller.dispose();
socket.disconnect();
```

## Files

- **lib/quickrtc_snippets.dart** - All code snippets in one file

## Dependency Management

This project uses modern dependency constraints. If you encounter issues with generated files:

1. Run `flutter pub get`
2. Run `flutter pub run build_runner build --delete-conflicting-outputs`

The library is verified to pass static analysis with zero warnings on all platforms.

## Full Example

For a complete working app, see [quickrtc-example/flutter-client](https://github.com/vidya-hub/QuickRTC/tree/main/quickrtc-example/flutter-client).

## Learn More

- [QuickRTC Documentation](https://quickrtc-docs.vercel.app/docs/flutter/getting-started)
- [Platform Setup Guide](https://quickrtc-docs.vercel.app/docs/flutter/platform-setup)
