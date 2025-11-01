# 🎥 Simple MediaSoup Client# 🎥 Simple MediaSoup Client

A powerful yet simple WebRTC client built on MediaSoup for video conferencing applications. Focus on building your UI while we handle the complex WebRTC internals.A powerful yet simple WebRTC client built on MediaSoup for video conferencing applications. Focus on building your UI while we handle the complex WebRTC internals.

---

## 📋 Table of Contents## 📋 Table of Contents

- [Features](#-features)- [Features](#-features)

- [Installation](#-installation)- [Installation](#-installation)

- [Quick Start](#-quick-start)- [Quick Start](#-quick-start)

- [Architecture Flow](#-architecture-flow)- [Architecture Flow](#-architecture-flow)

- [API Reference](#-api-reference)- [API Reference](#-api-reference)

- [Events](#-events)- [Events](#-events)

- [Usage Examples](#-usage-examples)- [Usage Examples](#-usage-examples)

- [TypeScript Support](#-typescript-support)- [TypeScript Support](#-typescript-support)

---

## ✨ Features## ✨ Features

- **🎯 Simple API**: Just 3 lines to join a conference- **🎯 Simple API**: Just 3 lines to join a conference

- **📞 Conference Management**: Easy join/leave operations- **📞 Conference Management**: Easy join/leave operations

- **🎥 Media Handling**: Camera, microphone, and screen sharing- **🎥 Media Handling**: Camera, microphone, and screen sharing

- **🔔 Event-Driven**: Real-time notifications for all actions- **🔔 Event-Driven**: Real-time notifications for all actions

- **👥 Participant Tracking**: Automatic participant management- **👥 Participant Tracking**: Automatic participant management

- **🔇 Media Controls**: Toggle audio/video with single method calls- **🔇 Media Controls**: Toggle audio/video with single method calls

- **🖥️ Screen Sharing**: Built-in screen share support- **🖥️ Screen Sharing**: Built-in screen share support

- **⚡ Auto-Consumption**: Automatically receive remote streams- **⚡ Auto-Consumption**: Automatically receive remote streams

- **🛡️ Error Handling**: Comprehensive error management- **🛡️ Error Handling**: Comprehensive error management

- **📱 TypeScript**: Full type safety and IntelliSense- **📱 TypeScript**: Full type safety and IntelliSense

---

## 📦 Installation## � Installation

`bash`bash

npm install simple_ms_clientnpm install simple_ms_client

# or# or

yarn add simple_ms_clientyarn add simple_ms_client

# or# or

pnpm add simple_ms_clientpnpm add simple_ms_client

````



**Browser Usage (CDN):****Browser Usage (CDN):**



```html```html

<script src="/simple_ms_client/dist/client.js"></script><script src="/simple_ms_client/dist/client.js"></script>

<script><script>

  const client = new ConferenceClient({  const client = new ConferenceClient({

    conferenceId: "room-123",    conferenceId: "room-123",

    participantName: "John Doe",    participantName: "John Doe",

    socket: io(),    socket: io(),

  });  });

</script></script>

````

---

## 🚀 Quick Start## �🚀 Quick Start

### Basic Conference Setup (3 Steps)### Basic Conference Setup (3 Steps)

`typescript`typescript

import { ConferenceClient } from "simple_ms_client";import { ConferenceClient } from "simple_ms_client";

import io from "socket.io-client";import io from "socket.io-client";

// 1. Create socket connection// 1. Create socket connection

const socket = io("http://localhost:3000");const socket = io("http://localhost:3000");

// 2. Create conference client// 2. Create conference client

const client = new ConferenceClient({const client = new ConferenceClient({

conferenceId: "my-room", conferenceId: "my-room",

conferenceName: "My Conference", conferenceName: "My Conference",

participantId: "user-123", participantId: "user-123",

participantName: "John Doe", participantName: "John Doe",

socket, socket,

});});

// 3. Join the meeting// 3. Join the meeting

await client.joinMeeting();await client.joinMeeting();

// That's it! You're in the conference// That's it! You're in the conference

````



### Producing Media (Audio/Video)### Producing Media (Audio/Video)



```typescript```typescript

// Get user media// Get user media

const mediaStream = await navigator.mediaDevices.getUserMedia({const mediaStream = await navigator.mediaDevices.getUserMedia({

  audio: true,  audio: true,

  video: true,  video: true,

});});



const audioTrack = mediaStream.getAudioTracks()[0];const audioTrack = mediaStream.getAudioTracks()[0];

const videoTrack = mediaStream.getVideoTracks()[0];const videoTrack = mediaStream.getVideoTracks()[0];



// Produce media to the conference// Produce media to the conference

const { audioStreamId, videoStreamId } = await client.produceMedia(const { audioStreamId, videoStreamId } = await client.produceMedia(

  audioTrack,  audioTrack,

  videoTrack  videoTrack

););



console.log("Media produced:", audioStreamId, videoStreamId);console.log("Media produced:", audioStreamId, videoStreamId);

````

### Consuming Remote Streams### Consuming Remote Streams

`typescript`typescript

// Automatically consume all existing participant streams// Automatically consume all existing participant streams

await client.consumeExistingStreams();await client.consumeExistingStreams();

// Listen for new remote streams// Listen for new remote streams

client.addEventListener("remoteStreamAdded", (event) => {client.addEventListener("remoteStreamAdded", (event) => {

const { participantId, participantName, kind, stream } = event.detail; const { participantId, participantName, kind, stream } = event.detail;

// Display the stream in your UI // Display the stream in your UI

const videoElement = document.getElementById(`remote-${participantId}`); const videoElement = document.getElementById(`remote-${participantId}`);

videoElement.srcObject = stream; videoElement.srcObject = stream;

});});

```



------



## 🔄 Architecture Flow## 🔄 Architecture Flow



### Client-Server Integration Flow### Client-Server Integration Flow



```

┌─────────────────────────────────────────────────────────────────┐┌─────────────────────────────────────────────────────────────────┐

│ CLIENT APPLICATION ││ CLIENT APPLICATION │

└─────────────────────────────────────────────────────────────────┘└─────────────────────────────────────────────────────────────────┘

                               │                               │

                               ▼                               ▼

┌─────────────────────────────────────────────────────────────────┐┌─────────────────────────────────────────────────────────────────┐

│ ConferenceClient ││ ConferenceClient │

│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ││ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │

│ │ Device │ │ Transport │ │ Producer │ ││ │ Device │ │ Transport │ │ Producer │ │

│ │ Setup │→ │ Creation │→ │ Consumer │ ││ │ Setup │→ │ Creation │→ │ Consumer │ │

│ └──────────────┘ └──────────────┘ └──────────────┘ ││ └──────────────┘ └──────────────┘ └──────────────┘ │

└─────────────────────────────────────────────────────────────────┘└─────────────────────────────────────────────────────────────────┘

                               │                               │

                               ▼ Socket.IO                               ▼ Socket.IO

┌─────────────────────────────────────────────────────────────────┐┌─────────────────────────────────────────────────────────────────┐

│ SERVER (SimpleServer) ││ SERVER (SimpleServer) │

│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ││ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │

│ │ Router │ │ Transport │ │ Producer │ ││ │ Router │ │ Transport │ │ Producer │ │

│ │ Creation │→ │ Creation │→ │ Consumer │ ││ │ Creation │→ │ Creation │→ │ Consumer │ │

│ └──────────────┘ └──────────────┘ └──────────────┘ ││ └──────────────┘ └──────────────┘ └──────────────┘ │

└─────────────────────────────────────────────────────────────────┘└─────────────────────────────────────────────────────────────────┘

```



### Conference Join Flow### Conference Join Flow



```

Client ServerClient Server

│ │ │ │

│──1. joinMeeting()───────────→│ │──1. joinMeeting()───────────→│

│ │ Create/Get Conference │ │ Create/Get Conference

│ │ Add Participant │ │ Add Participant

│←─2. routerCapabilities───────│ │←─2. routerCapabilities───────│

│ │ │ │

│──3. createTransports()──────→│ │──3. createTransports()──────→│

│ │ Create Send/Recv Transports │ │ Create Send/Recv Transports

│←─4. transport params─────────│ │←─4. transport params─────────│

│ │ │ │

│ Setup Send Transport │ │ Setup Send Transport │

│ Setup Recv Transport │ │ Setup Recv Transport │

│ │ │ │

│──5. produceMedia()──────────→│ │──5. produceMedia()──────────→│

│ │ Create Producers │ │ Create Producers

│←─6. producer IDs─────────────│ │←─6. producer IDs─────────────│

│ │ │ │

│──7. consumeExistingStreams()→│ │──7. consumeExistingStreams()→│

│ │ Get Participant List │ │ Get Participant List

│←─8. participants─────────────│ │←─8. participants─────────────│

│ │ │ │

│──9. consumeParticipantMedia()→│ │──9. consumeParticipantMedia()→│

│ │ Create Consumers │ │ Create Consumers

│←─10. consumer params─────────│ │←─10. consumer params─────────│

│ │ │ │

│ Create Consumers │ │ Create Consumers │

│ Receive Remote Streams │ │ Receive Remote Streams │

│ │ │ │

│←─11. Event: participantJoined│ │←─11. Event: participantJoined│

│←─12. Event: remoteStreamAdded│ │←─12. Event: remoteStreamAdded│

│ │ │ │

````



------



## 📚 API Reference## 📚 API Reference



### Constructor### Constructor



```typescript```typescript

new ConferenceClient(config: ConferenceClientConfig)new ConferenceClient(config: ConferenceClientConfig)

````

**Parameters:\*\***Parameters:\*\*

`typescript`typescript

interface ConferenceClientConfig {interface ConferenceClientConfig {

conferenceId: string; // Unique conference identifier conferenceId: string; // Unique conference identifier

conferenceName?: string; // Optional conference name conferenceName?: string; // Optional conference name

participantId: string; // Unique participant identifier participantId: string; // Unique participant identifier

participantName: string; // Display name participantName: string; // Display name

socket: ClientSocket; // Socket.IO client instance socket: ClientSocket; // Socket.IO client instance

}}

````});



### Methods// Setup all event handlers

function setupEvents() {

#### `joinMeeting(): Promise<void>`  // Connection events

  client.on("connected", (event) => {

Join a conference. Must be called before any other operations.    updateUI("connected");

    showMessage("✅ Connected to conference!");

```typescript  });

await client.joinMeeting();

```  client.on("error", (event) => {

    showError(`❌ Error: ${event.detail.error.message}`);

---  });



#### `produceMedia(audioTrack?, videoTrack?, type?): Promise<{audioStreamId?, videoStreamId?}>`  // Media events

  client.on("localStreamReady", (event) => {

Produce audio/video to the conference.    document.getElementById("localVideo").srcObject = event.detail.stream;

  });

**Parameters:**

- `audioTrack?: MediaStreamTrack` - Audio track from getUserMedia  client.on("remoteStreamAdded", (event) => {

- `videoTrack?: MediaStreamTrack` - Video track from getUserMedia      const { stream, participantId, type } = event.detail.stream;

- `type?: "audio" | "video" | "screenshare"` - Stream type (default: "video")    addRemoteVideo(stream, participantId);

  });

**Returns:** Object with stream IDs for tracking

  // Mute events

```typescript  client.on("audioMuted", (event) => {

const { audioStreamId, videoStreamId } = await client.produceMedia(    if (event.detail.isLocal) {

  audioTrack,      updateMuteButton("audio", true);

  videoTrack    }

);  });

````

client.on("videoMuted", (event) => {

--- if (event.detail.isLocal) {

      updateMuteButton("video", true);

#### `consumeExistingStreams(): Promise<void>` }

});

Consume media from all existing participants.}

````typescript// Initialize

await client.consumeExistingStreams();async function init() {

```  setupEvents();



---  // Join conference

  await client.connect("demo-room", "User Name");

#### `stopWatchingStream(participantId: string): Promise<void>`

  // Setup controls

Stop receiving streams from a specific participant.  document.getElementById("muteBtn").onclick = () => client.toggleAudio();

  document.getElementById("videoBtn").onclick = () => client.toggleVideo();

```typescript  document.getElementById("shareBtn").onclick = () => client.startScreenShare();

await client.stopWatchingStream("participant-123");  document.getElementById("leaveBtn").onclick = () => client.disconnect();

```}



---init();

````

#### `toggleAudio(streamId?, mute?): Promise<boolean>`

## 📋 API Reference

Toggle audio on/off.

### Configuration

**Parameters:**

- `streamId?: string` - Specific stream ID (uses first audio stream if omitted)```typescript

- `mute?: boolean` - Explicit mute state (true = mute, false = unmute)interface SimpleClientConfig {

  serverUrl: string; // WebSocket server URL

**Returns:** Current enabled state iceServers?: RTCIceServer[]; // STUN/TURN servers

enableAudio?: boolean; // Enable audio by default (true)

````typescript enableVideo?: boolean; // Enable video by default (true)

const isEnabled = await client.toggleAudio();  autoConsume?: boolean; // Auto-consume remote streams (true)

```}

````

---

### Methods

#### `toggleVideo(streamId?, mute?): Promise<boolean>`

| Method | Description | Returns |

Toggle video on/off.| -------------------------------------------------------- | ----------------------- | ----------------------------- |

| `connect(conferenceId, participantName, participantId?)` | Join a conference | `Promise<void>` |

**Parameters:**| `disconnect()` | Leave the conference | `Promise<void>` |

- `streamId?: string` - Specific stream ID (uses first video stream if omitted)| `enableMedia(audio?, video?)` | Enable local media | `Promise<MediaStream>` |

- `mute?: boolean` - Explicit mute state (true = mute, false = unmute)| `toggleAudio(mute?)` | Mute/unmute audio | `Promise<boolean>` |

| `toggleVideo(mute?)` | Turn video on/off | `Promise<boolean>` |

**Returns:** Current enabled state| `startScreenShare()` | Start screen sharing | `Promise<MediaStream>` |

| `stopScreenShare()` | Stop screen sharing | `void` |

```typescript| `getLocalStream()`                                      | Get local media stream  |`MediaStream \| undefined` |

const isEnabled = await client.toggleVideo();| `getRemoteStreams()` | Get all remote streams | `StreamInfo[]` |

```| `getParticipants()`                                     | Get participant list    |`ParticipantInfo[]` |

| `getConnectionInfo()` | Get connection details | `ConnectionInfo \| undefined` |

---| `isAudioMuted()` | Check if audio is muted | `boolean` |

| `isVideoMuted()` | Check if video is muted | `boolean` |

#### `stopLocalStream(streamId: string): Promise<boolean>`

### Events

Stop a specific local stream (useful for screen sharing).

| Event | When Triggered | Data |

```````typescript| --------------------- | ------------------------------ | ------------------------------------------------- |

await client.stopLocalStream(screenShareId);| `connected`           | Successfully joined conference | `{ connection: ConnectionInfo }`                  |

```| `disconnected`        | Left conference                | `{ reason?: string }`                             |

| `error`               | Any error occurred             | `{ error: Error, code?: string }`                 |

---| `participantJoined`   | New participant joined         | `{ participant: ParticipantInfo }`                |

| `participantLeft`     | Participant left               | `{ participant: ParticipantInfo }`                |

#### `leaveMeeting(): Promise<void>`| `localStreamReady`    | Local media stream ready       | `{ stream: MediaStream }`                         |

| `remoteStreamAdded`   | Remote stream received         | `{ stream: StreamInfo }`                          |

Leave the conference and clean up all resources.| `remoteStreamRemoved` | Remote stream ended            | `{ streamId: string, participantId: string }`     |

| `audioMuted`          | Audio muted (local/remote)     | `{ participantId: string, isLocal: boolean }`     |

```typescript| `audioUnmuted`        | Audio unmuted                  | `{ participantId: string, isLocal: boolean }`     |

await client.leaveMeeting();| `videoMuted`          | Video muted (local/remote)     | `{ participantId: string, isLocal: boolean }`     |

```| `videoUnmuted`        | Video unmuted                  | `{ participantId: string, isLocal: boolean }`     |

| `screenShareStarted`  | Screen sharing started         | `{ participantId: string, stream?: MediaStream }` |

---| `screenShareStopped`  | Screen sharing stopped         | `{ participantId: string }`                       |



#### `getParticipants(): Promise<any[]>`## 🎯 Use Cases



Get list of all participants in the conference.### Video Conferencing App



```typescript```typescript

const participants = await client.getParticipants();const client = new SimpleClient({

```  serverUrl: "wss://your-server.com",

  enableAudio: true,

---  enableVideo: true,

});

#### `getRemoteParticipant(participantId: string): RemoteParticipant | undefined`

await client.connect(roomId, userName);

Get a specific remote participant.```



```typescript### Audio-Only Meeting

const participant = client.getRemoteParticipant("participant-123");

``````typescript

const client = new SimpleClient({

---  serverUrl: "wss://your-server.com",

  enableAudio: true,

#### `getAllRemoteParticipants(): RemoteParticipant[]`  enableVideo: false,

});

Get all remote participants.```



```typescript### Screen Sharing Session

const participants = client.getAllRemoteParticipants();

``````typescript

const client = new SimpleClient({

---  serverUrl: "wss://your-server.com",

  enableAudio: true,

#### `getLocalStreams(): LocalStreamInfo[]`  enableVideo: false,

});

Get all local streams.

await client.connect(roomId, userName);

```typescriptawait client.startScreenShare();

const streams = client.getLocalStreams();```

```````

### Webinar (Receive Only)

---

````typescript

#### `getLocalStream(streamId: string): MediaStream | null`const client = new SimpleClient({

  serverUrl: "wss://your-server.com",

Get a specific local stream.  enableAudio: false,

  enableVideo: false,

```typescript  autoConsume: true,

const stream = client.getLocalStream(streamId);});

````

await client.connect(webinarId, viewerName);

---```

#### `isInMeeting(): boolean`## 🔧 Error Handling

Check if currently in a meeting.The client provides comprehensive error handling with specific error codes:

`typescript`typescript

if (client.isInMeeting()) {client.on("error", (event) => {

console.log("In meeting"); const { error, code } = event.detail;

}

````switch (code) {

    case "CONNECTION_FAILED":

---      showError("Unable to connect to server");

      break;

## 🔔 Events    case "MEDIA_ACCESS_FAILED":

      showError("Camera/microphone access denied");

The client uses the EventTarget API. Listen to events using `addEventListener`.      break;

    case "AUDIO_TOGGLE_FAILED":

### `participantJoined`      showError("Failed to toggle audio");

      break;

Fired when a new participant joins the conference.    case "VIDEO_TOGGLE_FAILED":

      showError("Failed to toggle video");

```typescript      break;

client.addEventListener("participantJoined", (event) => {    case "SCREEN_SHARE_FAILED":

  const { participantId, participantName } = event.detail;      showError("Screen sharing not supported");

  console.log(`${participantName} joined`);      break;

});    default:

```      showError(`Unexpected error: ${error.message}`);

  }

**Event Detail:**});

```typescript```

{

  participantId: string;## 🌐 Browser Support

  participantName: string;

}- ✅ Chrome 80+

```- ✅ Firefox 75+

- ✅ Safari 14+

---- ✅ Edge 80+



### `participantLeft`## 📱 Mobile Support



Fired when a participant leaves the conference.- ✅ Chrome Mobile

- ✅ Safari Mobile

```typescript- ✅ Samsung Internet

client.addEventListener("participantLeft", (event) => {

  const { participantId } = event.detail;## 🚀 Getting Started

  console.log(`Participant ${participantId} left`);

});1. **Install dependencies**:

````

````bash

**Event Detail:**   npm install simple_ms_client

```typescript   ```

{

participantId: string;2. **Set up your server** (see server documentation)

}

```3. **Use the SimpleClient** in your app:



---   ```typescript

import { SimpleClient } from "simple_ms_client";

### `remoteStreamAdded`

const client = new SimpleClient({

Fired when a remote participant's stream becomes available.     serverUrl: "http://localhost:3000",

});

```typescript

client.addEventListener("remoteStreamAdded", (event) => {   await client.connect("my-room", "My Name");

const { participantId, participantName, kind, stream } = event.detail;   ```



// Display stream4. **Check the example** in `example/index.html` for a complete implementation

const videoEl = document.createElement("video");

videoEl.srcObject = stream;## 🔍 Comparison with Raw MediaSoup

videoEl.autoplay = true;

});| Feature                | SimpleClient | Raw MediaSoup         |

```| ---------------------- | ------------ | --------------------- |

| **Setup Complexity**   | 3 lines      | 50+ lines             |

**Event Detail:**| **Event Handling**     | Built-in     | Manual setup          |

```typescript| **Error Handling**     | Automatic    | Manual implementation |

{| **Stream Management**  | Automatic    | Manual tracking       |

participantId: string;| **TypeScript Support** | Full         | Partial               |

participantName: string;| **Documentation**      | Complete     | Technical             |

kind: "audio" | "video";| **Learning Curve**     | Easy         | Steep                 |

stream: MediaStream;

}## 🤝 Contributing

````

Contributions are welcome! Please read the contributing guidelines and submit pull requests.

---

## 📄 License

### `remoteStreamRemoved`

MIT License - see LICENSE file for details.

Fired when a remote participant stops their stream.

---

```typescript

client.addEventListener("remoteStreamRemoved", (event) => {**Made with ❤️ for developers who want simple WebRTC**

  const { participantId, kind } = event.detail;
  console.log(`${participantId} stopped ${kind}`);
});
```

**Event Detail:**

```typescript
{
  participantId: string;
  kind: "audio" | "video";
}
```

---

### `localStreamAdded`

Fired when a local stream is added.

```typescript
client.addEventListener("localStreamAdded", (event) => {
  const { streamId, type, stream } = event.detail;

  if (type === "video") {
    localVideoElement.srcObject = stream;
  }
});
```

**Event Detail:**

```typescript
{
  streamId: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
}
```

---

### `localStreamRemoved`

Fired when a local stream is removed.

```typescript
client.addEventListener("localStreamRemoved", (event) => {
  const { streamId, type } = event.detail;
  console.log(`Local ${type} stream removed`);
});
```

**Event Detail:**

```typescript
{
  streamId: string;
  type: "audio" | "video" | "screenshare";
}
```

---

### `localAudioToggled`

Fired when local audio is toggled.

```typescript
client.addEventListener("localAudioToggled", (event) => {
  const { streamId, enabled } = event.detail;
  updateAudioButton(enabled);
});
```

**Event Detail:**

```typescript
{
  streamId: string;
  enabled: boolean;
}
```

---

### `localVideoToggled`

Fired when local video is toggled.

```typescript
client.addEventListener("localVideoToggled", (event) => {
  const { streamId, enabled } = event.detail;
  updateVideoButton(enabled);
});
```

**Event Detail:**

```typescript
{
  streamId: string;
  enabled: boolean;
}
```

---

### `error`

Fired when an error occurs.

```typescript
client.addEventListener("error", (event) => {
  const { message, error } = event.detail;
  console.error("Client error:", message, error);
});
```

**Event Detail:**

```typescript
{
  message: string;
  error?: any;
}
```

---

## 💡 Usage Examples

### Complete Video Conference

```typescript
import { ConferenceClient } from "simple_ms_client";
import io from "socket.io-client";

// Setup
const socket = io("http://localhost:3000");
const client = new ConferenceClient({
  conferenceId: "meeting-123",
  participantId: "user-456",
  participantName: "John Doe",
  socket,
});

// Event listeners
client.addEventListener("participantJoined", (event) => {
  const { participantName } = event.detail;
  showNotification(`${participantName} joined`);
});

client.addEventListener("remoteStreamAdded", (event) => {
  const { participantId, stream, kind } = event.detail;
  displayRemoteStream(participantId, stream, kind);
});

client.addEventListener("localStreamAdded", (event) => {
  const { stream, type } = event.detail;
  if (type === "video") {
    document.getElementById("localVideo").srcObject = stream;
  }
});

// Join meeting
await client.joinMeeting();

// Produce media
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
});

const audioTrack = mediaStream.getAudioTracks()[0];
const videoTrack = mediaStream.getVideoTracks()[0];

await client.produceMedia(audioTrack, videoTrack);

// Consume existing streams
await client.consumeExistingStreams();
```

---

### Screen Sharing

```typescript
// Start screen share
async function startScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    // Handle when user stops sharing via browser UI
    screenTrack.onended = () => {
      console.log("Screen share stopped");
      screenShareButton.textContent = "Share Screen";
    };

    const { videoStreamId } = await client.produceMedia(
      undefined,
      screenTrack,
      "screenshare"
    );

    screenShareButton.textContent = "Stop Sharing";

    return videoStreamId;
  } catch (error) {
    console.error("Screen share error:", error);
  }
}

// Stop screen share
async function stopScreenShare(streamId) {
  await client.stopLocalStream(streamId);
  screenShareButton.textContent = "Share Screen";
}
```

---

### Audio/Video Controls

```typescript
// Mute/Unmute audio
async function toggleMute() {
  const isEnabled = await client.toggleAudio();

  muteButton.textContent = isEnabled ? "🔇 Mute" : "🔊 Unmute";
  muteButton.classList.toggle("muted", !isEnabled);
}

// Turn video on/off
async function toggleCamera() {
  const isEnabled = await client.toggleVideo();

  cameraButton.textContent = isEnabled ? "📹 Camera Off" : "📹 Camera On";
  cameraButton.classList.toggle("off", !isEnabled);
}
```

---

### Participant Management

```typescript
// Display participant list
async function updateParticipantList() {
  const participants = await client.getParticipants();

  const listEl = document.getElementById("participants");
  listEl.innerHTML = "";

  participants.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.participantName;
    li.dataset.id = p.participantId;
    listEl.appendChild(li);
  });
}

// Stop watching a participant
async function stopWatching(participantId) {
  await client.stopWatchingStream(participantId);
  removeParticipantFromUI(participantId);
}
```

---

### Graceful Cleanup

```typescript
// Leave meeting
async function leaveMeeting() {
  try {
    await client.leaveMeeting();

    // Clean UI
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteStreams").innerHTML = "";

    console.log("Left meeting successfully");
  } catch (error) {
    console.error("Error leaving:", error);
  }
}

// Handle page unload
window.addEventListener("beforeunload", async () => {
  if (client.isInMeeting()) {
    await client.leaveMeeting();
  }
});
```

---

## 📘 TypeScript Support

Full TypeScript definitions are included.

```typescript
import {
  ConferenceClient,
  ConferenceClientConfig,
  RemoteParticipant,
  LocalStreamInfo,
  LocalStreamType,
  ConferenceClientEvents,
} from "simple_ms_client";

// Type-safe configuration
const config: ConferenceClientConfig = {
  conferenceId: "room-123",
  participantId: "user-456",
  participantName: "John Doe",
  socket: io(),
};

const client = new ConferenceClient(config);

// Type-safe event handling
client.addEventListener("remoteStreamAdded", (event: CustomEvent) => {
  const { participantId, stream } = event.detail;
  // TypeScript knows the event detail structure
});
```

---

## 🤝 Contributing

Contributions are welcome! Please see the main project README for guidelines.

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🔗 Related

- [Simple MediaSoup Server](../simple_ms_server/README.md)
- [Example Application](../simple_ms_example/README.md)
- [Main Project](../README.md)
