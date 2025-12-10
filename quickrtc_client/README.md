# quickrtc-client

Vanilla JavaScript WebRTC client for QuickRTC server.

## Installation

```bash
npm install quickrtc-client
```

## Quick Start

```typescript
import { ConferenceClient } from "quickrtc-client";
import { io } from "socket.io-client";

const socket = io("https://localhost:3000");

const client = new ConferenceClient({
  conferenceId: "room-1",
  participantId: "user-1",
  participantName: "John",
  socket,
});

// Join and produce media
await client.joinMeeting();

const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
await client.produceMedia(stream.getAudioTracks()[0], stream.getVideoTracks()[0]);

// Consume other participants
await client.consumeExistingStreams();
```

## API

### Lifecycle

```typescript
await client.joinMeeting();
await client.leaveMeeting();
client.isInMeeting(); // boolean
```

### Media Production

```typescript
// Produce camera + audio
await client.produceMedia(audioTrack, videoTrack);

// Produce with type (for screen share)
await client.produceMedia(audioTrack, videoTrack, "screenshare");

// Stop a specific stream
await client.stopLocalStream(streamId);
```

### Media Consumption

```typescript
// Consume all existing participants
await client.consumeExistingStreams();

// Stop watching a specific participant
await client.stopWatchingStream(participantId);
```

### Controls

```typescript
await client.toggleAudio(streamId?);
await client.toggleVideo(streamId?);
```

### Participants

```typescript
client.getParticipants();           // All participants
client.getRemoteParticipant(id);    // Single remote participant
client.getAllRemoteParticipants();  // All remote participants
```

### Local Streams

```typescript
client.getLocalStreams();          // All local streams
client.getLocalStream(streamId);   // Single local stream
```

## Events

```typescript
// Participant events
client.addEventListener("participantJoined", (e) => {
  const { participantId, participantName } = e.detail;
});

client.addEventListener("participantLeft", (e) => {
  const { participantId } = e.detail;
});

// Stream events
client.addEventListener("remoteStreamAdded", (e) => {
  const { participantId, kind, stream, streamType } = e.detail;
  // streamType: "audio" | "video" | "screenshare"
  videoElement.srcObject = stream;
});

client.addEventListener("remoteStreamRemoved", (e) => {
  const { participantId, kind } = e.detail;
});

client.addEventListener("localStreamAdded", (e) => {
  const { streamId, type, stream } = e.detail;
});

// Toggle events
client.addEventListener("localAudioToggled", (e) => {
  const { enabled } = e.detail;
});

client.addEventListener("localVideoToggled", (e) => {
  const { enabled } = e.detail;
});

// Error event
client.addEventListener("error", (e) => {
  console.error(e.detail.error);
});
```

## Screen Sharing

```typescript
// Start screen share
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
const { videoStreamId } = await client.produceMedia(
  undefined, 
  screenStream.getVideoTracks()[0], 
  "screenshare"
);

// Stop screen share
await client.stopLocalStream(videoStreamId);
```

## Multi-Stream Support

QuickRTC supports multiple simultaneous streams per participant:

- **Camera video** (`video`) - Regular webcam
- **Screen share** (`screenshare`) - Display/window capture
- **Audio** (`audio`) - Microphone

A participant can share both camera and screen simultaneously. Use the `streamType` field to differentiate:

```typescript
client.addEventListener("remoteStreamAdded", (e) => {
  const { stream, streamType, participantId } = e.detail;
  
  if (streamType === "screenshare") {
    screenShareElement.srcObject = stream;
  } else if (streamType === "video") {
    videoElement.srcObject = stream;
  } else if (streamType === "audio") {
    audioElement.srcObject = stream;
  }
});
```

## Complete Example

```typescript
import { ConferenceClient } from "quickrtc-client";
import { io } from "socket.io-client";

const socket = io("https://localhost:3000");
const client = new ConferenceClient({
  conferenceId: "demo-room",
  participantId: crypto.randomUUID(),
  participantName: "User",
  socket,
});

// Setup event listeners
client.addEventListener("participantJoined", (e) => {
  console.log(`${e.detail.participantName} joined`);
});

client.addEventListener("remoteStreamAdded", (e) => {
  const video = document.createElement("video");
  video.srcObject = e.detail.stream;
  video.autoplay = true;
  video.dataset.participantId = e.detail.participantId;
  video.dataset.streamType = e.detail.streamType;
  document.body.appendChild(video);
});

client.addEventListener("remoteStreamRemoved", (e) => {
  const video = document.querySelector(
    `video[data-participant-id="${e.detail.participantId}"]`
  );
  video?.remove();
});

// Join and start
await client.joinMeeting();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
await client.produceMedia(stream.getAudioTracks()[0], stream.getVideoTracks()[0]);
await client.consumeExistingStreams();

// Cleanup on page unload
window.addEventListener("beforeunload", () => client.leaveMeeting());
```

## License

MIT
