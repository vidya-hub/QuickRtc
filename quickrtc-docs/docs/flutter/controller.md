---
sidebar_position: 2
---

# Controller API

The `QuickRTCController` manages video conferences.

## Create Controller

### Simplest: `connect()` Factory

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

// Connect and optionally join in one step
final controller = await QuickRTCController.connect(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'room-123',      // Optional: join immediately
  participantName: 'Alice',       // Required if conferenceId provided
  debug: true,
);

// Socket is managed automatically - disposed when controller is disposed
```

### Manual: Injected Socket

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

// Option 1: Use QuickRTCSocket helper
final socket = await QuickRTCSocket.connect('https://your-server.com:3000');

// Option 2: Manual socket setup
import 'package:socket_io_client/socket_io_client.dart' as io;
final socket = io.io('https://your-server.com:3000',
  io.OptionBuilder()
    .setTransports(['websocket'])
    .disableAutoConnect()
    .build());
socket.connect();

// Create controller with injected socket
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
// If using manual socket setup:
socket.disconnect();
```

## Media Control

### High-Level Methods

```dart
// Enable camera + microphone (recommended)
await controller.enableMedia();

// Or individually:
await controller.enableCamera();
await controller.enableMicrophone();

// Disable
await controller.disableCamera();
await controller.disableMicrophone();
await controller.disableMedia();  // Both
```

### Toggle Methods

```dart
// Camera
await controller.toggleCamera();         // Start/stop camera
await controller.toggleCameraPause();    // Pause/resume (keeps stream)

// Microphone
await controller.toggleMicrophone();       // Start/stop microphone
await controller.toggleMicrophoneMute();   // Mute/unmute (keeps stream)
```

## Screen Sharing

### Simplest: `toggleScreenShareWithPicker()`

```dart
// Handles platform detection automatically:
// - Desktop: shows screen/window picker dialog
// - Mobile: uses system screen capture
// - If already sharing: stops the screen share
await controller.toggleScreenShareWithPicker(context);
```

### Manual Control

```dart
// Start
await controller.startScreenShare();

// Stop
await controller.stopScreenShare();

// Toggle (without picker)
await controller.toggleScreenShare();
```

### Low-Level API

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

// Stop via state
await controller.state.localScreenshareStream?.stop();
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

## State Access

```dart
final state = controller.state;

// Connection
state.isConnected
state.conferenceId
state.participantId

// Local media presence
state.hasLocalAudio
state.hasLocalVideo
state.hasLocalScreenshare

// Local media paused state
state.isLocalAudioPaused
state.isLocalVideoPaused
state.isLocalScreensharePaused

// Convenience getters (active = present AND not paused)
state.isLocalAudioActive       // hasLocalAudio && !isLocalAudioPaused
state.isLocalVideoActive       // hasLocalVideo && !isLocalVideoPaused
state.isLocalScreenshareActive // hasLocalScreenshare && !isLocalScreensharePaused

// Participants
state.participantList     // List<RemoteParticipant>
state.participantCount    // int
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

## Constructor Options

```dart
// Using connect() factory
final controller = await QuickRTCController.connect(
  serverUrl: 'https://...',
  conferenceId: 'room-123',        // Optional
  participantName: 'Alice',        // Required if conferenceId provided
  conferenceName: 'My Meeting',    // Optional
  participantId: 'custom-id',      // Optional, auto-generated if not provided
  participantInfo: {'role': 'host'}, // Optional metadata
  debug: false,
  maxParticipants: 0,              // 0 = unlimited
  connectionTimeout: Duration(seconds: 10),
  socketTimeout: Duration(seconds: 30),
  operationTimeout: Duration(seconds: 30),
  extraHeaders: {'Authorization': 'Bearer ...'}, // Optional
  query: {'token': '...'}, // Optional query params
);

// Using constructor with socket
final controller = QuickRTCController(
  socket: socket,
  debug: false,
  maxParticipants: 0,
  socketTimeout: Duration(seconds: 30),
  operationTimeout: Duration(seconds: 30),
);
```
