---
sidebar_position: 7
---

# State Management

React to state changes in your UI.

## Simple Approach: ListenableBuilder

The controller extends `ChangeNotifier`, so use Flutter's built-in `ListenableBuilder`:

```dart
ListenableBuilder(
  listenable: controller,
  builder: (context, _) {
    final state = controller.state;
    return Text('${state.participantCount} participants');
  },
)
```

This is the recommended approach for simple apps.

## Advanced Approach: QuickRTC Widgets

For larger apps, use the provider-based widgets.

### QuickRTCProvider

Provides the controller to descendants:

```dart
QuickRTCProvider(
  controller: controller,
  child: MyConferenceScreen(),
)

// Access in descendants:
final controller = QuickRTCProvider.of(context);
```

### QuickRTCBuilder

Rebuilds when state changes (requires provider ancestor):

```dart
QuickRTCBuilder(
  buildWhen: (prev, curr) => prev.participantCount != curr.participantCount,
  builder: (context, state) {
    return Text('${state.participantCount} participants');
  },
)
```

### QuickRTCListener

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

### QuickRTCConsumer

Combines Provider + Listener + Builder:

```dart
QuickRTCConsumer(
  controller: controller,
  listener: (context, controller) {
    // Handle side effects
  },
  builder: (context, state, controller) {
    return VideoGrid(participants: state.participantList);
  },
)
```

## State Properties

```dart
final state = controller.state;

// Connection
state.isConnected
state.conferenceId
state.participantId
state.participantName

// Local media
state.hasLocalAudio
state.hasLocalVideo
state.hasLocalScreenshare
state.isLocalAudioPaused
state.isLocalVideoPaused
state.localAudioStream
state.localVideoStream
state.localScreenshareStream

// Remote participants
state.participantList     // List<RemoteParticipant>
state.participantCount    // int

// Errors
state.hasError
state.error
```

## RemoteParticipant

```dart
for (final p in state.participantList) {
  p.id              // String
  p.name            // String
  p.videoStream     // RemoteStream?
  p.audioStream     // RemoteStream?
  p.screenshareStream // RemoteStream?
  p.hasVideo        // bool
  p.hasAudio        // bool
  p.hasScreenshare  // bool
  p.isVideoMuted    // bool
  p.isAudioMuted    // bool
}
```

## Error Handling

```dart
if (state.hasError) {
  print(state.error);
  controller.clearError();
}
```
