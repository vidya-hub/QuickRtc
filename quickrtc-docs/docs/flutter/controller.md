---
sidebar_position: 2
---

# Controller API

The `QuickRTCController` manages video conferences.

## Create Controller

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

final socket = io.io('https://your-server.com:3000',
  io.OptionBuilder()
    .setTransports(['websocket'])
    .disableAutoConnect()
    .build());
socket.connect();

final controller = QuickRTCController(socket: socket, debug: true);
```

## Meeting Lifecycle

```dart
// Join
await controller.joinMeeting(
  conferenceId: 'room-123',
  participantName: 'Alice',
);

// Leave
await controller.leaveMeeting();

// Dispose
controller.dispose();
socket.disconnect();
```

## Media Control

### Camera

```dart
await controller.toggleCameraPause();   // Pause/resume
```

### Microphone

```dart
await controller.toggleMicrophoneMute();  // Mute/unmute
```

## Low-Level Media API

For more control, use `QuickRTCStatic` and `produce()`:

```dart
// Get media
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.audioVideo(),
);

// Publish to meeting
await controller.produce(
  ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
);
```

### Media Config Options

```dart
MediaConfig.audioOnly()        // Microphone only
MediaConfig.videoOnly()        // Camera only
MediaConfig.audioVideo()       // Both
MediaConfig.screenShareOnly()  // Screen share
```

### Video Config

```dart
MediaConfig.videoOnly(config: VideoConfig.frontCamera)  // Front camera
MediaConfig.videoOnly(config: VideoConfig.backCamera)   // Back camera
MediaConfig.videoOnly(config: VideoConfig.hd)           // 720p
MediaConfig.videoOnly(config: VideoConfig.fullHd)       // 1080p
```

## Screen Sharing

```dart
// Mobile
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.screenShareOnly(),
);

// Desktop (with picker)
final media = await QuickRTCStatic.getScreenShareWithPicker(context);

// Publish
await controller.produce(
  ProduceInput.fromTrack(
    media.screenshareTrack!,
    type: StreamType.screenshare,
  ),
);

// Stop
await controller.state.localScreenshareStream?.stop();
```

## State Access

```dart
final state = controller.state;

state.isConnected         // bool
state.participantList     // List<RemoteParticipant>
state.participantCount    // int
state.hasLocalVideo       // bool
state.hasLocalAudio       // bool
state.isLocalVideoPaused  // bool
state.isLocalAudioPaused  // bool
```

## Listen to State Changes

```dart
ListenableBuilder(
  listenable: controller,
  builder: (context, _) {
    final state = controller.state;
    return Text('${state.participantCount} participants');
  },
)
```

## Error Handling

```dart
if (state.hasError) {
  print(state.error);
  controller.clearError();
}
```
