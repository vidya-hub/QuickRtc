# 🚀 Simple MediaSoup Client

A simplified, event-driven WebRTC client that abstracts away MediaSoup complexity and provides an easy-to-use API for video conferencing applications.

## ✨ Features

- **🎯 Simple Setup**: Just a few lines of code to get started
- **📞 Easy Conference Management**: Join/leave conferences with minimal code
- **🎥 Automatic Media Handling**: Camera, microphone, and screen sharing
- **🔔 Event-Driven Architecture**: Real-time notifications for all actions
- **👥 Participant Management**: Automatic tracking of conference participants
- **🔇 Media Controls**: Mute/unmute audio and video with simple methods
- **🖥️ Screen Sharing**: Built-in screen sharing support
- **⚡ Auto-Stream Consumption**: Automatically receive remote streams
- **🛡️ Error Handling**: Comprehensive error handling and reporting
- **📱 TypeScript Support**: Full type safety and IntelliSense

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import { SimpleClient } from "simple_ms_client";

// Create client with minimal configuration
const client = new SimpleClient({
  serverUrl: "http://localhost:3000",
  enableAudio: true,
  enableVideo: true,
  autoConsume: true, // Automatically receive remote streams
});

// Connect to conference
await client.connect("my-conference", "John Doe");
```

### 2. Event Handling

```typescript
// Connection events
client.on("connected", (event) => {
  console.log("Connected to conference!", event.detail.connection);
});

client.on("disconnected", (event) => {
  console.log("Disconnected from conference");
});

// Participant events
client.on("participantJoined", (event) => {
  console.log(`${event.detail.participant.name} joined!`);
});

client.on("participantLeft", (event) => {
  console.log(`${event.detail.participant.name} left`);
});

// Media events
client.on("localStreamReady", (event) => {
  const videoElement = document.getElementById("localVideo");
  videoElement.srcObject = event.detail.stream;
});

client.on("remoteStreamAdded", (event) => {
  const { stream, participantId, type } = event.detail.stream;
  displayRemoteStream(stream, participantId, type);
});
```

### 3. Media Controls

```typescript
// Toggle audio (mute/unmute)
const isAudioMuted = await client.toggleAudio();

// Toggle video (on/off)
const isVideoMuted = await client.toggleVideo();

// Start screen sharing
const screenStream = await client.startScreenShare();

// Stop screen sharing
client.stopScreenShare();

// Check current state
const isAudioOff = client.isAudioMuted();
const isVideoOff = client.isVideoMuted();
```

### 4. Complete Example

```typescript
import { SimpleClient } from "simple_ms_client";

const client = new SimpleClient({
  serverUrl: "http://localhost:3000",
  enableAudio: true,
  enableVideo: true,
  autoConsume: true,
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

// Setup all event handlers
function setupEvents() {
  // Connection events
  client.on("connected", (event) => {
    updateUI("connected");
    showMessage("✅ Connected to conference!");
  });

  client.on("error", (event) => {
    showError(`❌ Error: ${event.detail.error.message}`);
  });

  // Media events
  client.on("localStreamReady", (event) => {
    document.getElementById("localVideo").srcObject = event.detail.stream;
  });

  client.on("remoteStreamAdded", (event) => {
    const { stream, participantId, type } = event.detail.stream;
    addRemoteVideo(stream, participantId);
  });

  // Mute events
  client.on("audioMuted", (event) => {
    if (event.detail.isLocal) {
      updateMuteButton("audio", true);
    }
  });

  client.on("videoMuted", (event) => {
    if (event.detail.isLocal) {
      updateMuteButton("video", true);
    }
  });
}

// Initialize
async function init() {
  setupEvents();

  // Join conference
  await client.connect("demo-room", "User Name");

  // Setup controls
  document.getElementById("muteBtn").onclick = () => client.toggleAudio();
  document.getElementById("videoBtn").onclick = () => client.toggleVideo();
  document.getElementById("shareBtn").onclick = () => client.startScreenShare();
  document.getElementById("leaveBtn").onclick = () => client.disconnect();
}

init();
```

## 📋 API Reference

### Configuration

```typescript
interface SimpleClientConfig {
  serverUrl: string; // WebSocket server URL
  iceServers?: RTCIceServer[]; // STUN/TURN servers
  enableAudio?: boolean; // Enable audio by default (true)
  enableVideo?: boolean; // Enable video by default (true)
  autoConsume?: boolean; // Auto-consume remote streams (true)
}
```

### Methods

| Method                                                   | Description             | Returns                       |
| -------------------------------------------------------- | ----------------------- | ----------------------------- |
| `connect(conferenceId, participantName, participantId?)` | Join a conference       | `Promise<void>`               |
| `disconnect()`                                           | Leave the conference    | `Promise<void>`               |
| `enableMedia(audio?, video?)`                            | Enable local media      | `Promise<MediaStream>`        |
| `toggleAudio(mute?)`                                     | Mute/unmute audio       | `Promise<boolean>`            |
| `toggleVideo(mute?)`                                     | Turn video on/off       | `Promise<boolean>`            |
| `startScreenShare()`                                     | Start screen sharing    | `Promise<MediaStream>`        |
| `stopScreenShare()`                                      | Stop screen sharing     | `void`                        |
| `getLocalStream()`                                       | Get local media stream  | `MediaStream \| undefined`    |
| `getRemoteStreams()`                                     | Get all remote streams  | `StreamInfo[]`                |
| `getParticipants()`                                      | Get participant list    | `ParticipantInfo[]`           |
| `getConnectionInfo()`                                    | Get connection details  | `ConnectionInfo \| undefined` |
| `isAudioMuted()`                                         | Check if audio is muted | `boolean`                     |
| `isVideoMuted()`                                         | Check if video is muted | `boolean`                     |

### Events

| Event                 | When Triggered                 | Data                                              |
| --------------------- | ------------------------------ | ------------------------------------------------- |
| `connected`           | Successfully joined conference | `{ connection: ConnectionInfo }`                  |
| `disconnected`        | Left conference                | `{ reason?: string }`                             |
| `error`               | Any error occurred             | `{ error: Error, code?: string }`                 |
| `participantJoined`   | New participant joined         | `{ participant: ParticipantInfo }`                |
| `participantLeft`     | Participant left               | `{ participant: ParticipantInfo }`                |
| `localStreamReady`    | Local media stream ready       | `{ stream: MediaStream }`                         |
| `remoteStreamAdded`   | Remote stream received         | `{ stream: StreamInfo }`                          |
| `remoteStreamRemoved` | Remote stream ended            | `{ streamId: string, participantId: string }`     |
| `audioMuted`          | Audio muted (local/remote)     | `{ participantId: string, isLocal: boolean }`     |
| `audioUnmuted`        | Audio unmuted                  | `{ participantId: string, isLocal: boolean }`     |
| `videoMuted`          | Video muted (local/remote)     | `{ participantId: string, isLocal: boolean }`     |
| `videoUnmuted`        | Video unmuted                  | `{ participantId: string, isLocal: boolean }`     |
| `screenShareStarted`  | Screen sharing started         | `{ participantId: string, stream?: MediaStream }` |
| `screenShareStopped`  | Screen sharing stopped         | `{ participantId: string }`                       |

## 🎯 Use Cases

### Video Conferencing App

```typescript
const client = new SimpleClient({
  serverUrl: "wss://your-server.com",
  enableAudio: true,
  enableVideo: true,
});

await client.connect(roomId, userName);
```

### Audio-Only Meeting

```typescript
const client = new SimpleClient({
  serverUrl: "wss://your-server.com",
  enableAudio: true,
  enableVideo: false,
});
```

### Screen Sharing Session

```typescript
const client = new SimpleClient({
  serverUrl: "wss://your-server.com",
  enableAudio: true,
  enableVideo: false,
});

await client.connect(roomId, userName);
await client.startScreenShare();
```

### Webinar (Receive Only)

```typescript
const client = new SimpleClient({
  serverUrl: "wss://your-server.com",
  enableAudio: false,
  enableVideo: false,
  autoConsume: true,
});

await client.connect(webinarId, viewerName);
```

## 🔧 Error Handling

The client provides comprehensive error handling with specific error codes:

```typescript
client.on("error", (event) => {
  const { error, code } = event.detail;

  switch (code) {
    case "CONNECTION_FAILED":
      showError("Unable to connect to server");
      break;
    case "MEDIA_ACCESS_FAILED":
      showError("Camera/microphone access denied");
      break;
    case "AUDIO_TOGGLE_FAILED":
      showError("Failed to toggle audio");
      break;
    case "VIDEO_TOGGLE_FAILED":
      showError("Failed to toggle video");
      break;
    case "SCREEN_SHARE_FAILED":
      showError("Screen sharing not supported");
      break;
    default:
      showError(`Unexpected error: ${error.message}`);
  }
});
```

## 🌐 Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+

## 📱 Mobile Support

- ✅ Chrome Mobile
- ✅ Safari Mobile
- ✅ Samsung Internet

## 🚀 Getting Started

1. **Install dependencies**:

   ```bash
   npm install simple_ms_client
   ```

2. **Set up your server** (see server documentation)

3. **Use the SimpleClient** in your app:

   ```typescript
   import { SimpleClient } from "simple_ms_client";

   const client = new SimpleClient({
     serverUrl: "http://localhost:3000",
   });

   await client.connect("my-room", "My Name");
   ```

4. **Check the example** in `example/index.html` for a complete implementation

## 🔍 Comparison with Raw MediaSoup

| Feature                | SimpleClient | Raw MediaSoup         |
| ---------------------- | ------------ | --------------------- |
| **Setup Complexity**   | 3 lines      | 50+ lines             |
| **Event Handling**     | Built-in     | Manual setup          |
| **Error Handling**     | Automatic    | Manual implementation |
| **Stream Management**  | Automatic    | Manual tracking       |
| **TypeScript Support** | Full         | Partial               |
| **Documentation**      | Complete     | Technical             |
| **Learning Curve**     | Easy         | Steep                 |

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests.

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with ❤️ for developers who want simple WebRTC**
