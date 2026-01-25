---
sidebar_position: 4
---

# Widgets

Pre-built widgets for video conferencing UI.

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
