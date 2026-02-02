---
sidebar_position: 4
---

# Widgets

Pre-built widgets for video conferencing UI.

## QuickRTCConference

Batteries-included widget that handles the complete conference lifecycle.

### Basic Usage

```dart
QuickRTCConference(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'room-123',
  participantName: 'Alice',
  onJoined: (controller) {
    controller.enableMedia();
  },
  builder: (context, state, controller) {
    return YourConferenceUI(state: state, controller: controller);
  },
)
```

### Features

- **Auto-connect** - Connects to server and joins conference automatically
- **Auto-audio** - Includes `QuickRTCAudioRenderers` for remote audio playback
- **Lifecycle management** - Creates and disposes controller automatically
- **Error handling** - Built-in error states with retry capability
- **Provider included** - Wraps children in `QuickRTCProvider`

### All Options

```dart
QuickRTCConference(
  // Required
  serverUrl: 'https://...',
  conferenceId: 'room-123',
  participantName: 'Alice',
  builder: (context, state, controller) => Widget,

  // Optional: Conference details
  conferenceName: 'My Meeting',
  participantId: 'custom-id',
  participantInfo: {'role': 'host'},

  // Optional: Callbacks
  onJoined: (controller) {},      // Called when successfully joined
  onLeft: () {},                   // Called when left
  onError: (error) {},             // Called on any error

  // Optional: Custom builders
  loadingBuilder: (context) => CircularProgressIndicator(),
  errorBuilder: (context, error, retry) => Column(
    children: [
      Text('Error: $error'),
      ElevatedButton(onPressed: retry, child: Text('Retry')),
    ],
  ),

  // Optional: Configuration
  debug: false,
  maxParticipants: 0,
  connectionTimeout: Duration(seconds: 10),
  socketTimeout: Duration(seconds: 30),
  operationTimeout: Duration(seconds: 30),
  extraHeaders: {'Authorization': 'Bearer ...'},
  query: {'token': '...'},

  // Optional: Audio handling
  autoRenderAudio: true,  // Set false to handle audio yourself
)
```

### Complete Example

```dart
QuickRTCConference(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'room-123',
  participantName: 'Alice',
  onJoined: (controller) => controller.enableMedia(),
  onLeft: () => Navigator.pop(context),
  builder: (context, state, controller) {
    return Scaffold(
      body: Stack(
        children: [
          // Video grid
          GridView.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: state.participantCount <= 2 ? 1 : 2,
            ),
            itemCount: state.participantList.length + 1,
            itemBuilder: (_, i) {
              if (i == 0) {
                return QuickRTCMediaRenderer(
                  stream: state.localVideoStream?.stream,
                  mirror: true,
                  isLocal: true,
                );
              }
              final p = state.participantList[i - 1];
              return QuickRTCMediaRenderer(
                remoteStream: p.videoStream,
                participantName: p.name,
              );
            },
          ),
        ],
      ),
      bottomNavigationBar: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
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
            icon: Icon(state.isLocalScreenshareActive
                ? Icons.stop_screen_share
                : Icons.screen_share),
            onPressed: () => controller.toggleScreenShareWithPicker(context),
          ),
          IconButton(
            icon: Icon(Icons.call_end, color: Colors.red),
            onPressed: () => controller.leaveMeeting(),
          ),
        ],
      ),
    );
  },
)
```

## QuickRTCMediaRenderer

Video renderer with overlays.

### Basic Usage

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
```

### All Options

```dart
QuickRTCMediaRenderer(
  // Stream input (use one)
  stream: MediaStream?,           // Direct stream
  remoteStream: RemoteStream?,    // From participant

  // Video options
  mirror: false,                  // Mirror for self-view
  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,

  // State
  isAudioEnabled: true,
  isVideoEnabled: true,

  // Info
  participantName: 'Alice',
  isLocal: false,                 // Shows "(You)" label

  // Overlays
  showAudioIndicator: true,       // Mic icon
  showVideoIndicator: false,      // Camera icon
  showName: true,                 // Name label
  showLocalLabel: true,           // "(You)" for local

  // Callbacks
  onTap: () {},
  onDoubleTap: () {},
)
```

### Object Fit

```dart
// Cover - fills container, may crop (default)
objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover

// Contain - shows entire video, may letterbox
objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain
```

## QuickRTCAudioRenderers

Handles audio playback for all remote participants. Invisible widget.

```dart
Stack(
  children: [
    VideoGrid(participants: state.participantList),
    QuickRTCAudioRenderers(participants: state.participantList),
  ],
)
```

> **Note:** `QuickRTCConference` includes this automatically when `autoRenderAudio: true` (default).

## QuickRTCProvider

Provides the controller to descendants (for manual setup):

```dart
QuickRTCProvider(
  controller: controller,
  child: MyConferenceScreen(),
)

// Access in descendants:
final controller = QuickRTCProvider.of(context);
final controller = QuickRTCProvider.read(context);  // Without listening
```

## QuickRTCBuilder

Rebuilds when state changes:

```dart
QuickRTCBuilder(
  buildWhen: (prev, curr) => prev.participantCount != curr.participantCount,
  builder: (context, state) {
    return Text('${state.participantCount} participants');
  },
)
```

## QuickRTCListener

Handles side effects (navigation, snackbars):

```dart
QuickRTCListener(
  listenWhen: (prev, curr) => prev.error != curr.error,
  listener: (context, controller) {
    if (controller.state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(controller.state.error!)),
      );
    }
  },
  child: MyWidget(),
)
```

## QuickRTCConsumer

Combines Builder + Listener:

```dart
QuickRTCConsumer(
  listener: (context, controller) {
    // Side effects
  },
  builder: (context, controller, state, child) {
    return VideoGrid(participants: state.participantList);
  },
)
```

## Building a Video Grid

```dart
Widget buildVideoGrid(QuickRTCState state) {
  final tiles = <Widget>[
    // Local video first
    QuickRTCMediaRenderer(
      stream: state.localVideoStream?.stream,
      mirror: true,
      isLocal: true,
      participantName: 'You',
      isAudioEnabled: state.isLocalAudioActive,
      isVideoEnabled: state.isLocalVideoActive,
    ),
  ];

  // Add remote participants
  for (final p in state.participantList) {
    tiles.add(QuickRTCMediaRenderer(
      remoteStream: p.videoStream,
      participantName: p.name,
      isAudioEnabled: p.hasAudio && !p.isAudioMuted,
      isVideoEnabled: p.hasVideo && !p.isVideoMuted,
    ));
  }

  final columns = tiles.length <= 2 ? 1 : (tiles.length <= 4 ? 2 : 3);

  return GridView.builder(
    padding: const EdgeInsets.all(8),
    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: columns,
      childAspectRatio: 16 / 9,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
    ),
    itemCount: tiles.length,
    itemBuilder: (_, i) => tiles[i],
  );
}
```

## QuickRTCTheme

Customize styling for all widgets:

```dart
QuickRTCTheme(
  data: QuickRTCThemeData(
    containerBackgroundColor: Colors.grey[900]!,
    placeholderBackgroundColor: Colors.blue[800]!,
    nameTextStyle: TextStyle(color: Colors.white),
    audioOffColor: Colors.red,
  ),
  child: YourApp(),
)
```
