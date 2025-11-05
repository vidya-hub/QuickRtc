# 🎥 QuickRTC Client

A powerful yet simple WebRTC client built on MediaSoup for video conferencing applications. Focus on building your UI while we handle the complex WebRTC internals.

---

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Events](#-events)

---

## ✨ Features

- **🎯 Simple API**: Just a few lines to join a conference.
- **📞 Conference Management**: Easy join/leave operations.
- **🎥 Media Handling**: Camera, microphone, and screen sharing.
- **🔔 Event-Driven**: Real-time notifications for all actions.
- **👥 Participant Tracking**: Automatic participant management.
- **🔇 Media Controls**: Toggle audio/video with single method calls.
- **🖥️ Screen Sharing**: Built-in screen share support.
- **⚡ Auto-Consumption**: Automatically receive remote streams.
- **🛡️ Error Handling**: Comprehensive error management.
- **📱 TypeScript**: Full type safety and IntelliSense.

---

## 📦 Installation

```bash
npm install quickrtc_client
```

**Browser Usage (CDN):**

```html
<script src="/quickrtc_client/dist/client.js"></script>
<script>
  const client = new ConferenceClient({
    conferenceId: "room-123",
    participantName: "John Doe",
    socket: io(),
  });
</script>
```

---

## 🚀 Quick Start

### Basic Conference Setup (3 Steps)

```typescript
import { ConferenceClient } from "quickrtc_client";
import io from "socket.io-client";

// 1. Create socket connection
const socket = io("http://localhost:3000");

// 2. Create conference client
const client = new ConferenceClient({
  conferenceId: "my-room",
  conferenceName: "My Conference",
  participantId: "user-123",
  participantName: "John Doe",
  socket,
});

// 3. Join the meeting
await client.joinMeeting();

// That's it! You're in the conference
```

### Producing Media (Audio/Video)

```typescript
// Get user media
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
});

const audioTrack = mediaStream.getAudioTracks()[0];
const videoTrack = mediaStream.getVideoTracks()[0];

// Produce media to the conference
const { audioStreamId, videoStreamId } = await client.produceMedia(
  audioTrack,
  videoTrack
);

console.log("Media produced:", audioStreamId, videoStreamId);
```

### Consuming Remote Streams

```typescript
// Automatically consume all existing participant streams
await client.consumeExistingStreams();

// Listen for new remote streams
client.addEventListener("remoteStreamAdded", (event) => {
  const { participantId, participantName, kind, stream } = event.detail;

  // Display the stream in your UI
  const videoElement = document.getElementById(`remote-${participantId}`);
  videoElement.srcObject = stream;
});
```

---

## 🔄 Architecture Flow

### Client-Server Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATION                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ConferenceClient                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Device     │  │  Transport   │  │   Producer   │           │
│  │   Setup      │→ │   Creation   │→ │   Consumer   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ Socket.IO
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER (QuickRTCServer)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Router     │  │  Transport   │  │   Producer   │           │
│  │   Creation   │→ │   Creation   │→ │   Consumer   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Conference Join Flow

```
Client                          Server
  │                              │
  │──1. joinMeeting()───────────→│
  │                              │ Create/Get Conference
  │                              │ Add Participant
  │←─2. routerCapabilities───────│
  │                              │
  │──3. createTransports()──────→│  Create Send/Recv Transports
  │                              │
  │←─4. transport params─────────│
  │                              │
  │  Setup Send Transport        │
  │  Setup Recv Transport        │
  │                              │
  │──5. produceMedia()──────────→│
  │                              │ Create Producers
  │←─6. producer IDs─────────────│
  │                              │
  │──7. consumeExistingStreams()→│  Get Participant List
  │                              │
  │←─8. participants─────────────│
  │                              │
  │──9. consumeParticipantMedia()→│  Create Consumers
  │                              │
  │←─10. consumer params─────────│
  │                              │
  │  Create Consumers            │
  │  Receive Remote Streams      │
  │                              │
  │←─11. Event: participantJoined│
  │←─12. Event: remoteStreamAdded│
```

---

## 📚 API Reference

### Constructor

```typescript
new ConferenceClient(config: ConferenceClientConfig)
```

**Parameters:**

```typescript
interface ConferenceClientConfig {
  conferenceId: string; // Unique conference identifier
  conferenceName?: string; // Optional conference name
  participantId: string; // Unique participant identifier
  participantName: string; // Display name
  socket: ClientSocket; // Socket.IO client instance
}
```

### Methods

#### `joinMeeting(): Promise<void>`

Join a conference. Must be called before any other operations.

```typescript
await client.joinMeeting();
```

#### `produceMedia(audioTrack?, videoTrack?, type?): Promise<{audioStreamId?, videoStreamId?}>`

Produce audio/video to the conference.

**Parameters:**

- `audioTrack?: MediaStreamTrack` - Audio track from getUserMedia
- `videoTrack?: MediaStreamTrack` - Video track from getUserMedia
- `type?: "audio" | "video" | "screenshare"` - Stream type (default: "video")

**Returns:** Object with stream IDs for tracking

```typescript
const { audioStreamId, videoStreamId } = await client.produceMedia(
  audioTrack,
  videoTrack
);
```

#### `consumeExistingStreams(): Promise<void>`

Consume media from all existing participants.

```typescript
await client.consumeExistingStreams();
```

#### `stopWatchingStream(participantId: string): Promise<void>`

Stop receiving streams from a specific participant.

```typescript
await client.stopWatchingStream("participant-123");
```

#### `toggleAudio(streamId?, mute?): Promise<boolean>`

Toggle audio on/off.

**Parameters:**

- `streamId?: string` - Specific stream ID (uses first audio stream if omitted)
- `mute?: boolean` - Explicit mute state (true = mute, false = unmute)

**Returns:** Current enabled state

```typescript
const isEnabled = await client.toggleAudio();
```

#### `toggleVideo(streamId?, mute?): Promise<boolean>`

Toggle video on/off.

**Parameters:**

- `streamId?: string` - Specific stream ID (uses first video stream if omitted)
- `mute?: boolean` - Explicit mute state (true = mute, false = unmute)

**Returns:** Current enabled state

```typescript
const isEnabled = await client.toggleVideo();
```

#### `stopLocalStream(streamId: string): Promise<boolean>`

Stop a specific local stream (useful for screen sharing).

```typescript
await client.stopLocalStream(screenShareId);
```

#### `leaveMeeting(): Promise<void>`

Leave the conference and clean up all resources.

```typescript
await client.leaveMeeting();
```

#### `getParticipants(): Promise<any[]>`

Get list of all participants in the conference.

```typescript
const participants = await client.getParticipants();
```

#### `getRemoteParticipant(participantId: string): RemoteParticipant | undefined`

Get a specific remote participant.

```typescript
const participant = client.getRemoteParticipant("participant-123");
```

#### `getAllRemoteParticipants(): RemoteParticipant[]`

Get all remote participants.

```typescript
const participants = client.getAllRemoteParticipants();
```

#### `getLocalStreams(): LocalStreamInfo[]`

Get all local streams.

```typescript
const streams = client.getLocalStreams();
```

#### `getLocalStream(streamId: string): MediaStream | null`

Get a specific local stream.

```typescript
const stream = client.getLocalStream(streamId);
```

#### `isInMeeting(): boolean`

Check if currently in a meeting.

```typescript
if (client.isInMeeting()) {
  console.log("In meeting");
}
```

---

## 🔔 Events

The client uses the EventTarget API. Listen to events using `addEventListener`.

### `participantJoined`

Fired when a new participant joins the conference.

**Event Detail:**

```typescript
{
  participantId: string;
  participantName: string;
}
```

### `participantLeft`

Fired when a participant leaves the conference.

**Event Detail:**

```typescript
{
  participantId: string;
}
```

### `remoteStreamAdded`

Fired when a remote participant's stream becomes available.

**Event Detail:**

```typescript
{
  participantId: string;
  participantName: string;
  kind: "audio" | "video";
  stream: MediaStream;
}
```

### `remoteStreamRemoved`

Fired when a remote participant stops their stream.

**Event Detail:**

```typescript
{
  participantId: string;
  kind: "audio" | "video";
}
```

### `localStreamAdded`

Fired when a local stream is added.

**Event Detail:**

```typescript
{
  streamId: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
}
```

### `localStreamRemoved`

Fired when a local stream is removed.

**Event Detail:**

```typescript
{
  streamId: string;
  type: "audio" | "video" | "screenshare";
}
```

### `localAudioToggled`

Fired when local audio is toggled.

**Event Detail:**

```typescript
{
  streamId: string;
  enabled: boolean;
}
```

### `localVideoToggled`

Fired when local video is toggled.

**Event Detail:**

```typescript
{
  streamId: string;
  enabled: boolean;
}
```

### `error`

Fired when an error occurs.

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
import { ConferenceClient } from "quickrtc_client";
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
} from "quickrtc_client";

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

## 📄 License

MIT License - see LICENSE file for details.

---

## 🔗 Related

- [QuickRTC Server](../quickrtc_server/README.md)
- [Example Application](../quickrtc_example/README.md)
- [Main Project](../README.md)

---
