---
sidebar_position: 1
---

# Getting Started

Set up your first video call with the QuickRTC Flutter SDK.

## Installation

```yaml
dependencies:
  quickrtc_flutter_client: ^1.1.0
```

```bash
flutter pub get
```

## Quick Start (Simplest Way)

Use the `QuickRTCConference` widget for a batteries-included experience:

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

QuickRTCConference(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'my-room',
  participantName: 'John',
  onJoined: (controller) {
    // Enable camera and microphone when joined
    controller.enableMedia();
  },
  builder: (context, state, controller) {
    return Column(
      children: [
        // Video grid
        Expanded(child: buildVideoGrid(state)),
        // Controls
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
              icon: Icon(Icons.call_end),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ],
    );
  },
)
```

This widget handles:
- Socket connection and lifecycle
- Controller creation and disposal
- Audio playback for remote participants
- Error handling with retry capability

## Quick Start (Controller API)

For more control, use `QuickRTCController.connect()`:

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

// Connect and join in one step
final controller = await QuickRTCController.connect(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'my-room',
  participantName: 'John',
);

// Enable camera and microphone
await controller.enableMedia();

// Use in your UI
ListenableBuilder(
  listenable: controller,
  builder: (context, _) {
    final state = controller.state;
    return Text('${state.participantCount} participants');
  },
)

// Leave and cleanup (socket auto-disconnects)
await controller.leaveMeeting();
controller.dispose();
```

## Manual Setup (Full Control)

For maximum control over socket and controller:

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

// Option 1: Use QuickRTCSocket helper
final socket = await QuickRTCSocket.connect('https://your-server.com:3000');

// Option 2: Manual socket setup
import 'package:socket_io_client/socket_io_client.dart' as io;
final socket = io.io(
  'https://your-server.com:3000',
  io.OptionBuilder()
    .setTransports(['websocket'])
    .disableAutoConnect()
    .build(),
);
socket.connect();

// Create controller
final controller = QuickRTCController(socket: socket, debug: true);

// Join meeting
await controller.joinMeeting(
  conferenceId: 'my-room',
  participantName: 'John',
);
```

## Start Camera & Microphone

```dart
// High-level API (recommended)
await controller.enableMedia();

// Or use low-level API for more control
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.audioVideo(),
);
await controller.produce(
  ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
);
```

## Control Media

```dart
// Toggle microphone mute/unmute
await controller.toggleMicrophoneMute();

// Toggle camera pause/resume
await controller.toggleCameraPause();

// Screen share with platform-appropriate picker
await controller.toggleScreenShareWithPicker(context);
```

## Render Video

```dart
// Local video
QuickRTCMediaRenderer(
  stream: state.localVideoStream?.stream,
  mirror: true,
  isLocal: true,
  participantName: 'You',
  showName: true,
)

// Remote participant video
QuickRTCMediaRenderer(
  remoteStream: participant.videoStream,
  participantName: participant.name,
  isAudioEnabled: participant.hasAudio && !participant.isAudioMuted,
  isVideoEnabled: participant.hasVideo && !participant.isVideoMuted,
)

// Remote audio (invisible - handles playback)
// Note: QuickRTCConference includes this automatically
QuickRTCAudioRenderers(participants: state.participantList)
```

## Listen to State Changes

```dart
// Using ListenableBuilder (Flutter built-in)
ListenableBuilder(
  listenable: controller,
  builder: (context, _) {
    final state = controller.state;

    return Column(
      children: [
        Text('Participants: ${state.participantCount}'),
        // Use convenience getters for cleaner code
        Text('Camera: ${state.isLocalVideoActive ? "On" : "Off"}'),
        Text('Mic: ${state.isLocalAudioActive ? "On" : "Off"}'),
      ],
    );
  },
)
```

## Leave Meeting

```dart
await controller.leaveMeeting();
controller.dispose();
// If using manual socket setup:
socket.disconnect();
```

## Screen Sharing

```dart
// Simplest: handles platform detection automatically
await controller.toggleScreenShareWithPicker(context);

// Or manually:
// Mobile
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.screenShareOnly(),
);

// Desktop (with picker dialog)
final media = await QuickRTCStatic.getScreenShareWithPicker(context);

// Publish screen share
if (media.screenshareTrack != null) {
  await controller.produce(
    ProduceInput.fromTrack(
      media.screenshareTrack!,
      type: StreamType.screenshare,
    ),
  );
}
```

## State Properties

| Property                   | Type                      | Description                           |
| -------------------------- | ------------------------- | ------------------------------------- |
| `isConnected`              | `bool`                    | Connected to meeting                  |
| `participantList`          | `List<RemoteParticipant>` | Remote participants                   |
| `participantCount`         | `int`                     | Number of participants                |
| `hasLocalVideo`            | `bool`                    | Camera is active                      |
| `hasLocalAudio`            | `bool`                    | Microphone is active                  |
| `hasLocalScreenshare`      | `bool`                    | Screen share is active                |
| `isLocalVideoPaused`       | `bool`                    | Camera is paused                      |
| `isLocalAudioPaused`       | `bool`                    | Microphone is muted                   |
| `isLocalScreensharePaused` | `bool`                    | Screen share is paused                |
| **`isLocalVideoActive`**   | `bool`                    | Video enabled AND not paused *(new)*  |
| **`isLocalAudioActive`**   | `bool`                    | Audio enabled AND not paused *(new)*  |
| **`isLocalScreenshareActive`** | `bool`                | Screenshare enabled AND not paused *(new)* |
| `localVideoStream`         | `LocalStream?`            | Local video stream                    |
| `localAudioStream`         | `LocalStream?`            | Local audio stream                    |

## RemoteParticipant

| Property       | Type            | Description    |
| -------------- | --------------- | -------------- |
| `id`           | `String`        | Participant ID |
| `name`         | `String`        | Display name   |
| `videoStream`  | `RemoteStream?` | Video stream   |
| `audioStream`  | `RemoteStream?` | Audio stream   |
| `hasVideo`     | `bool`          | Has video      |
| `hasAudio`     | `bool`          | Has audio      |
| `isVideoMuted` | `bool`          | Video paused   |
| `isAudioMuted` | `bool`          | Audio muted    |

## What's Next?

- [Controller API](/docs/flutter/controller) - All controller methods
- [Widgets](/docs/flutter/widgets) - QuickRTCMediaRenderer, QuickRTCConference
- [Platform Setup](/docs/flutter/platform-setup) - Permissions setup
- [Screen Sharing](/docs/flutter/screen-sharing) - Platform-specific details
