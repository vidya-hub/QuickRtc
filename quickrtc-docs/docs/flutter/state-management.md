---
sidebar_position: 7
---

# State Management

React to state changes in your UI.

## Using `QuickRTCConference` (Simplest)

The `QuickRTCConference` widget handles state management for you:

```dart
QuickRTCConference(
  serverUrl: 'https://your-server.com:3000',
  conferenceId: 'room-123',
  participantName: 'Alice',
  builder: (context, state, controller) {
    // state and controller are provided directly
    return Text('${state.participantCount} participants');
  },
)
```

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
  controller: controller, // Optional if inside a QuickRTCProvider
  listener: (context, controller) {
    if (controller.state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(controller.state.error!)),
      );
    }
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

// Local media presence
state.hasLocalAudio
state.hasLocalVideo
state.hasLocalScreenshare

// Local media paused state
state.isLocalAudioPaused
state.isLocalVideoPaused
state.isLocalScreensharePaused

// Local media streams
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

### Convenience Getters

These combine presence and paused state for easier UI logic:

```dart
// Active = present AND not paused
state.isLocalAudioActive       // hasLocalAudio && !isLocalAudioPaused
state.isLocalVideoActive       // hasLocalVideo && !isLocalVideoPaused
state.isLocalScreenshareActive // hasLocalScreenshare && !isLocalScreensharePaused
```

**Before (verbose):**
```dart
final isAudioOn = state.hasLocalAudio && !state.isLocalAudioPaused;
final isVideoOn = state.hasLocalVideo && !state.isLocalVideoPaused;

IconButton(
  icon: Icon(isAudioOn ? Icons.mic : Icons.mic_off),
  onPressed: () => controller.toggleMicrophoneMute(),
)
```

**After (cleaner):**
```dart
IconButton(
  icon: Icon(state.isLocalAudioActive ? Icons.mic : Icons.mic_off),
  onPressed: () => controller.toggleMicrophoneMute(),
)
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

## Complete Example with Convenience Getters

```dart
class ConferenceControls extends StatelessWidget {
  final QuickRTCController controller;
  final QuickRTCState state;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Using convenience getters for cleaner code
        _ControlButton(
          icon: state.isLocalAudioActive ? Icons.mic : Icons.mic_off,
          active: state.isLocalAudioActive,
          onTap: () => controller.toggleMicrophoneMute(),
        ),
        _ControlButton(
          icon: state.isLocalVideoActive ? Icons.videocam : Icons.videocam_off,
          active: state.isLocalVideoActive,
          onTap: () => controller.toggleCameraPause(),
        ),
        _ControlButton(
          icon: state.isLocalScreenshareActive
              ? Icons.stop_screen_share
              : Icons.screen_share,
          active: state.isLocalScreenshareActive,
          onTap: () => controller.toggleScreenShareWithPicker(context),
        ),
        _ControlButton(
          icon: Icons.call_end,
          active: false,
          destructive: true,
          onTap: () => controller.leaveMeeting(),
        ),
      ],
    );
  }
}
```
