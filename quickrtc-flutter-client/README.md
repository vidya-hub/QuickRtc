# 🚀 QuickRTC Flutter Client

A Flutter WebRTC client library built on MediaSoup with Provider state management for real-time video conferencing. This is the Flutter counterpart to the React and JavaScript clients in the QuickRTC ecosystem.

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Platform Setup](#-platform-setup)
- [Usage Examples](#-usage-examples)
- [State Management](#-state-management)
- [Contributing](#-contributing)

---

## ✨ Features

- 🎥 **Simple API** - Join/start conference in a few lines of code
- 📱 **Cross-platform** - Works on Android, iOS, Web, Desktop
- 🔇 **Media Controls** - Easy audio/video toggle and screen sharing
- 👥 **Real-time Participants** - Auto-tracking of remote participants
- 📡 **Auto Stream Consumption** - Automatically consume new participant streams
- 💬 **Event-driven** - Stream-based event handling
- 🧩 **Provider Pattern** - Clean state management with Provider
- 🏗️ **MVC Architecture** - Separation of concerns with services layer
- 🔒 **Type-safe** - Full Dart type safety with Freezed models

---

## 📦 Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  quickrtc_flutter_client:
    path: ../quickrtc-flutter-client # Adjust path as needed
```

Then run:

```bash
flutter pub get
cd quickrtc-flutter-client
flutter pub run build_runner build --delete-conflicting-outputs
```

---

## ⚡ Quick Start

### 1. Wrap Your App with Provider

```dart
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

void main() {
  runApp(
    QuickRTCProviderWidget(
      child: MyApp(),
    ),
  );
}
```

### 2. Connect to Conference

```dart
import 'package:socket_io_client/socket_io_client.dart' as io;

class ConferenceScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<ConferenceProvider>(context);

    return Scaffold(
      body: Column(
        children: [
          // Join button
          ElevatedButton(
            onPressed: () async {
              final socket = io.io('https://your-server.com', <String, dynamic>{
                'transports': ['websocket'],
                'autoConnect': true,
              });

              final config = ConferenceConfig(
                conferenceId: 'room-123',
                participantId: 'user-456',
                participantName: 'John Doe',
                socket: socket,
              );

              await provider.joinConference(config);
            },
            child: Text('Join Conference'),
          ),

          // Video grid
          Expanded(
            child: GridView.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
              ),
              itemCount: provider.remoteParticipants.length,
              itemBuilder: (context, index) {
                final participant = provider.remoteParticipants[index];
                return RTCVideoRendererWidget(
                  stream: participant.videoStream,
                  mirror: false,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

### 3. Produce Local Media

```dart
final tracks = await navigator.mediaDevices.getUserMedia({
  'audio': true,
  'video': {
    'facingMode': 'user',
    'width': 1280,
    'height': 720,
  },
});

await provider.produceMedia(
  audioTrack: tracks.getAudioTracks().first,
  videoTrack: tracks.getVideoTracks().first,
);

await provider.consumeExistingStreams();
```

---

## 🏗️ Architecture

QuickRTC Flutter follows the MVC pattern with Provider for state management:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Widgets consuming Provider state)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      ConferenceProvider                 │
│    (ChangeNotifier - State Manager)     │
└──────┬───────────────────┬──────────────┘
       │                   │
┌──────▼─────────┐  ┌─────▼──────────────┐
│ Service Layer  │  │  Models (Freezed)  │
│ - Socket       │  │  - State           │
│ - Device       │  │  - Config          │
│ - Stream       │  │  - Participants    │
└────────────────┘  └────────────────────┘
```

### Key Components

1. **ConferenceProvider** - Main state management class

   - Orchestrates all services
   - Manages conference state
   - Handles socket events
   - Notifies UI of changes

2. **Service Layer** - Business logic separation

   - **SocketService** - Socket.IO communication
   - **DeviceService** - WebRTC device management
   - **StreamService** - Media stream operations

3. **Models** - Immutable data classes with Freezed
   - Type-safe and immutable
   - JSON serialization support
   - Copy-with functionality

---

## 📚 API Reference

### ConferenceProvider

Main state management class. Access via `Provider.of<ConferenceProvider>(context)`.

#### Properties

```dart
// State
bool isJoined              // Connected to conference
bool isConnecting          // Connection in progress
String? error              // Error message if any
List<LocalStreamInfo> localStreams          // Your media streams
List<RemoteParticipant> remoteParticipants  // Other participants

// Convenience
bool hasLocalAudio         // Has active audio stream
bool hasLocalVideo         // Has active video stream
bool hasLocalScreenShare   // Has active screen share
```

#### Methods

```dart
// Join/Leave
Future<void> joinConference(ConferenceConfig config)
Future<void> leaveConference()

// Media Production
Future<Map<String, String?>> produceMedia({
  MediaStreamTrack? audioTrack,
  MediaStreamTrack? videoTrack,
})

// Media Consumption
Future<void> consumeExistingStreams()
Future<void> consumeParticipant({
  required String participantId,
  required String participantName,
})

// Stream Management
Future<void> stopLocalStream(String streamId)
Future<void> stopWatchingParticipant(String participantId)

// Controls
Future<void> toggleAudio()
Future<void> toggleVideo()

// Error Handling
void clearError()
```

### Models

#### ConferenceConfig

```dart
ConferenceConfig(
  conferenceId: 'room-123',      // Required
  participantId: 'user-456',     // Required
  participantName: 'John Doe',   // Required
  socket: socketInstance,        // Required
  conferenceName: 'Meeting',     // Optional
)
```

#### LocalStreamInfo

```dart
LocalStreamInfo(
  id: 'stream-id',
  type: LocalStreamType.audio,  // audio, video, screenshare
  track: MediaStreamTrack,
  stream: MediaStream,
  enabled: true,
  producer: RTCRtpSender,
)
```

#### RemoteParticipant

```dart
RemoteParticipant(
  participantId: 'user-789',
  participantName: 'Jane Smith',
  videoStream: MediaStream?,
  audioStream: MediaStream?,
  isAudioEnabled: true,
  isVideoEnabled: true,
)
```

---

## 🛠️ Platform Setup

### Android

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>

  <application>
    <!-- ... -->
  </application>
</manifest>
```

Set minimum SDK to 21:

```gradle
// android/app/build.gradle
android {
    defaultConfig {
        minSdkVersion 21
    }
}
```

### iOS

Add permissions to `ios/Runner/Info.plist`:

```xml
<dict>
  <key>NSCameraUsageDescription</key>
  <string>Camera access is required for video calls</string>

  <key>NSMicrophoneUsageDescription</key>
  <string>Microphone access is required for audio calls</string>

  <key>NSLocalNetworkUsageDescription</key>
  <string>Network access is required for video conferencing</string>
</dict>
```

Enable background modes in Xcode:

- Project → Runner → Signing & Capabilities → + Capability → Background Modes
- Check "Audio, AirPlay, and Picture in Picture"

### Web

Add to `web/index.html`:

```html
<head>
  <!-- ... -->
  <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
</head>
```

---

## 💡 Usage Examples

### Complete Conference Screen

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class ConferenceScreen extends StatefulWidget {
  @override
  _ConferenceScreenState createState() => _ConferenceScreenState();
}

class _ConferenceScreenState extends State<ConferenceScreen> {
  MediaStream? _localStream;

  Future<void> _joinConference() async {
    final provider = Provider.of<ConferenceProvider>(context, listen: false);

    // Create socket connection
    final socket = io.io('https://your-server.com:3443', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    // Join conference
    await provider.joinConference(
      ConferenceConfig(
        conferenceId: 'my-room',
        participantId: DateTime.now().millisecondsSinceEpoch.toString(),
        participantName: 'User ${DateTime.now().second}',
        socket: socket,
      ),
    );

    // Get local media
    _localStream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': true,
    });

    // Produce media
    await provider.produceMedia(
      audioTrack: _localStream!.getAudioTracks().first,
      videoTrack: _localStream!.getVideoTracks().first,
    );

    // Consume existing participants
    await provider.consumeExistingStreams();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('QuickRTC Conference')),
      body: Consumer<ConferenceProvider>(
        builder: (context, provider, child) {
          if (!provider.isJoined) {
            return Center(
              child: ElevatedButton(
                onPressed: provider.isConnecting ? null : _joinConference,
                child: Text(provider.isConnecting ? 'Connecting...' : 'Join'),
              ),
            );
          }

          return Column(
            children: [
              // Local video
              if (_localStream != null)
                Container(
                  height: 200,
                  child: RTCVideoRendererWidget(
                    stream: _localStream,
                    mirror: true,
                  ),
                ),

              // Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  IconButton(
                    icon: Icon(provider.hasLocalAudio ? Icons.mic : Icons.mic_off),
                    onPressed: () => provider.toggleAudio(),
                  ),
                  IconButton(
                    icon: Icon(provider.hasLocalVideo ? Icons.videocam : Icons.videocam_off),
                    onPressed: () => provider.toggleVideo(),
                  ),
                  IconButton(
                    icon: Icon(Icons.call_end),
                    onPressed: () async {
                      await provider.leaveConference();
                      Navigator.pop(context);
                    },
                  ),
                ],
              ),

              // Remote participants
              Expanded(
                child: GridView.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 1.0,
                  ),
                  itemCount: provider.remoteParticipants.length,
                  itemBuilder: (context, index) {
                    final participant = provider.remoteParticipants[index];
                    return Card(
                      child: Column(
                        children: [
                          Expanded(
                            child: RTCVideoRendererWidget(
                              stream: participant.videoStream,
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.all(8),
                            child: Text(participant.participantName),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _localStream?.dispose();
    super.dispose();
  }
}
```

### Using Selector for Performance

```dart
// Only rebuild when specific state changes
Selector<ConferenceProvider, bool>(
  selector: (_, provider) => provider.hasLocalAudio,
  builder: (_, hasAudio, __) {
    return Icon(hasAudio ? Icons.mic : Icons.mic_off);
  },
)
```

### Error Handling

```dart
Consumer<ConferenceProvider>(
  builder: (context, provider, child) {
    if (provider.error != null) {
      return AlertDialog(
        title: Text('Error'),
        content: Text(provider.error!),
        actions: [
          TextButton(
            onPressed: () => provider.clearError(),
            child: Text('OK'),
          ),
        ],
      );
    }
    return SizedBox.shrink();
  },
)
```

---

## 🔄 State Management

### Provider Pattern

QuickRTC uses the Provider pattern for state management:

1. **ChangeNotifier** - ConferenceProvider extends ChangeNotifier
2. **notifyListeners()** - Called after state updates
3. **Consumer/Selector** - Widgets rebuild on state changes

### State Flow

```
User Action → Provider Method → Service Layer → Socket/WebRTC
                    ↓
              State Update
                    ↓
            notifyListeners()
                    ↓
            Widget Rebuilds
```

### Service Layer

Services are singletons managing specific concerns:

- **SocketService** - Socket.IO communication, event streams
- **DeviceService** - WebRTC device lifecycle
- **StreamService** - Media operations

Benefits:

- Separation of concerns
- Testable in isolation
- Reusable across app
- Centralized logic

---

## 🧪 Testing

```dart
void main() {
  test('ConferenceProvider initializes correctly', () {
    final provider = ConferenceProvider();

    expect(provider.isJoined, false);
    expect(provider.isConnecting, false);
    expect(provider.localStreams, isEmpty);
    expect(provider.remoteParticipants, isEmpty);
  });
}
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Follow Dart/Flutter style guidelines
2. Add tests for new features
3. Update documentation
4. Run `flutter analyze` before submitting

---

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

## 🔗 Related Packages

- [quickrtc_server](../quickrtc_server) - MediaSoup server
- [quickrtc_client](../quickrtc_client) - JavaScript client
- [quickrtc-react-client](../quickrtc-react-client) - React client
- [quickrtc_types](../quickrtc_types) - Shared TypeScript types

---

**Made with ❤️ for Flutter developers building real-time video apps.**
