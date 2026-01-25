---
sidebar_position: 1
---

# Getting Started

Set up your first video call with the QuickRTC Flutter SDK.

## Installation

```yaml
dependencies:
  quickrtc_flutter_client: ^1.0.2
```

```bash
flutter pub get
```

## Basic Usage

### 1. Connect & Join Meeting

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// Create socket connection
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

### 2. Start Camera & Microphone

```dart
// Get local media (camera + mic)
final media = await QuickRTCStatic.getLocalMedia(
  MediaConfig.audioVideo(),
);

// Publish to meeting
await controller.produce(
  ProduceInput.fromTracksWithTypes(media.tracksWithTypes),
);
```

### 3. Control Media

```dart
// Toggle microphone mute/unmute
await controller.toggleMicrophoneMute();

// Toggle camera pause/resume
await controller.toggleCameraPause();
```

### 4. Render Video

```dart
// Local video
QuickRTCMediaRenderer(
  stream: media.stream,
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
QuickRTCAudioRenderers(participants: state.participantList)
```

### 5. Listen to State Changes

```dart
// Using ListenableBuilder (Flutter built-in)
ListenableBuilder(
  listenable: controller,
  builder: (context, _) {
    final state = controller.state;

    return Column(
      children: [
        Text('Participants: ${state.participantCount}'),
        Text('Camera: ${state.hasLocalVideo ? "On" : "Off"}'),
        Text('Mic: ${state.hasLocalAudio ? "On" : "Off"}'),
      ],
    );
  },
)
```

### 6. Leave Meeting

```dart
await controller.leaveMeeting();
controller.dispose();
socket.disconnect();
```

## Screen Sharing

```dart
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

| Property             | Type                      | Description            |
| -------------------- | ------------------------- | ---------------------- |
| `isConnected`        | `bool`                    | Connected to meeting   |
| `participantList`    | `List<RemoteParticipant>` | Remote participants    |
| `participantCount`   | `int`                     | Number of participants |
| `hasLocalVideo`      | `bool`                    | Camera is active       |
| `hasLocalAudio`      | `bool`                    | Microphone is active   |
| `isLocalVideoPaused` | `bool`                    | Camera is paused       |
| `isLocalAudioPaused` | `bool`                    | Microphone is muted    |
| `localVideoStream`   | `LocalStream?`            | Local video stream     |
| `localAudioStream`   | `LocalStream?`            | Local audio stream     |

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
- [Widgets](/docs/flutter/widgets) - QuickRTCMediaRenderer options
- [Platform Setup](/docs/flutter/platform-setup) - Permissions setup
- [Screen Sharing](/docs/flutter/screen-sharing) - Platform-specific details
