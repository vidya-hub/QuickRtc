# quickrtc-flutter-client

Flutter client library for QuickRTC conferencing.

## Features

- **State management agnostic** - Works with Provider, Riverpod, BLoC, GetX, or plain setState
- **Event-driven API** - Simple subscribe/unsubscribe pattern
- **Cross-platform** - Android, iOS, Web, Desktop
- **Auto-consume** - Automatically handles new participant streams

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  quickrtc_flutter_client:
    git:
      url: https://github.com/vidya-hub/QuickRTC.git
      path: quickrtc-flutter-client
```

## Quick Start

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class ConferenceScreen extends StatefulWidget {
  @override
  State<ConferenceScreen> createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  late QuickRTC rtc;
  List<RemoteStream> remoteStreams = [];
  List<LocalStream> localStreams = [];
  List<Participant> participants = [];

  @override
  void initState() {
    super.initState();
    
    final socket = io.io('https://your-server.com', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    rtc = QuickRTC(QuickRTCConfig(socket: socket, debug: true));

    rtc.on<NewParticipantEvent>('newParticipant', (event) {
      setState(() {
        participants.add(Participant(id: event.participantId, name: event.participantName));
        remoteStreams.addAll(event.streams);
      });
    });

    rtc.on<RemoteStream>('streamAdded', (stream) {
      setState(() => remoteStreams.add(stream));
    });

    rtc.on<StreamRemovedEvent>('streamRemoved', (event) {
      setState(() => remoteStreams.removeWhere((s) => s.id == event.streamId));
    });

    rtc.on<ParticipantLeftEvent>('participantLeft', (event) {
      setState(() {
        participants.removeWhere((p) => p.id == event.participantId);
        remoteStreams.removeWhere((s) => s.participantId == event.participantId);
      });
    });

    rtc.on<LocalStreamEndedEvent>('localStreamEnded', (event) {
      setState(() => localStreams.removeWhere((s) => s.id == event.streamId));
    });
  }

  Future<void> _join() async {
    await rtc.join(JoinConfig(
      conferenceId: 'room-123',
      participantName: 'Alice',
    ));

    final media = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': true,
    });

    final streams = await rtc.produce(ProduceInput.fromTracks(media.getTracks()));
    setState(() => localStreams.addAll(streams));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Local videos
          ...localStreams.map((s) => RTCVideoView(
            RTCVideoRenderer()..srcObject = s.stream,
            mirror: true,
          )),
          // Remote videos
          ...remoteStreams.map((s) => RTCVideoView(
            RTCVideoRenderer()..srcObject = s.stream,
          )),
          ElevatedButton(onPressed: _join, child: Text('Join')),
        ],
      ),
    );
  }

  @override
  void dispose() {
    rtc.dispose();
    super.dispose();
  }
}
```

## Events

| Event | When | Data |
|-------|------|------|
| `newParticipant` | Someone joins | `NewParticipantEvent { participantId, participantName, streams[] }` |
| `streamAdded` | Participant starts sharing | `RemoteStream { id, type, stream, participantId, participantName }` |
| `streamRemoved` | Participant stops sharing | `StreamRemovedEvent { participantId, streamId, type }` |
| `participantLeft` | Someone leaves | `ParticipantLeftEvent { participantId }` |
| `localStreamEnded` | Your stream stopped externally | `LocalStreamEndedEvent { streamId, type }` |
| `connected` | Joined conference | `ConnectedEvent { conferenceId, participantId }` |
| `disconnected` | Left conference | `DisconnectedEvent { reason }` |
| `error` | Error occurred | `ErrorEvent { message, error }` |

## API

### QuickRTC

```dart
final rtc = QuickRTC(QuickRTCConfig(
  socket: socket,        // Socket.IO client instance
  maxParticipants: 0,    // 0 = unlimited
  debug: false,          // Enable debug logging
));

// Properties
rtc.isConnected          // bool - connected to conference
rtc.conferenceId         // String? - current conference ID
rtc.participantId        // String? - your participant ID
rtc.participants         // Map<String, Participant> - remote participants
rtc.localStreams         // Map<String, LocalStream> - your streams
rtc.remoteStreams        // Map<String, RemoteStream> - remote streams

// Methods
await rtc.join(JoinConfig(...))              // Join conference
await rtc.leave()                            // Leave conference
await rtc.produce(ProduceInput.fromTrack(track))  // Produce media
await rtc.pause(streamId)                    // Pause local stream
await rtc.resume(streamId)                   // Resume local stream
await rtc.stop(streamId)                     // Stop local stream
rtc.on<T>(event, handler)                    // Subscribe to event
rtc.off<T>(event, handler)                   // Unsubscribe from event
rtc.dispose()                                // Cleanup resources
```

### ProduceInput

```dart
// Single track
ProduceInput.fromTrack(track)
ProduceInput.fromTrack(track, type: StreamType.screenshare)

// Multiple tracks
ProduceInput.fromTracks([audioTrack, videoTrack])

// Tracks with explicit types
ProduceInput.fromTracksWithTypes([
  TrackWithType(track: screenTrack, type: StreamType.screenshare),
])
```

### LocalStream

```dart
localStream.id           // Stream ID
localStream.type         // StreamType (audio, video, screenshare)
localStream.stream       // MediaStream
localStream.track        // MediaStreamTrack
localStream.paused       // bool

await localStream.pause()
await localStream.resume()
await localStream.stop()
```

## Platform Setup

### Android

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

Set minimum SDK in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        minSdkVersion 21
    }
}
```

### iOS

Add to `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access required for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access required for audio calls</string>
```

### Web

Add to `web/index.html`:

```html
<script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
```

## Widgets

### RTCVideoRendererWidget

```dart
RTCVideoRendererWidget(
  stream: mediaStream,
  mirror: false,         // Flip horizontally (for self-view)
  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
)
```

## License

ISC
