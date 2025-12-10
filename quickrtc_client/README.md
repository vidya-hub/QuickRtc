# quickrtc-client

Browser WebRTC client for QuickRTC server.

## Installation

```bash
npm install quickrtc-client
```

## Quick Start

```typescript
import { ConferenceClient } from "quickrtc-client";
import io from "socket.io-client";

const socket = io("https://localhost:3443");

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

```typescript
// Lifecycle
await client.joinMeeting();
await client.leaveMeeting();
client.isInMeeting();

// Media production
await client.produceMedia(audioTrack, videoTrack, type?);
await client.stopLocalStream(streamId);

// Media consumption
await client.consumeExistingStreams();
await client.stopWatchingStream(participantId);

// Controls
await client.toggleAudio(streamId?);
await client.toggleVideo(streamId?);

// Participants
client.getParticipants();
client.getRemoteParticipant(id);
client.getAllRemoteParticipants();

// Local streams
client.getLocalStreams();
client.getLocalStream(streamId);
```

## Events

```typescript
client.addEventListener("participantJoined", (e) => {
  const { participantId, participantName } = e.detail;
});

client.addEventListener("participantLeft", (e) => {
  const { participantId } = e.detail;
});

client.addEventListener("remoteStreamAdded", (e) => {
  const { participantId, kind, stream } = e.detail;
  videoElement.srcObject = stream;
});

client.addEventListener("remoteStreamRemoved", (e) => {});
client.addEventListener("localStreamAdded", (e) => {});
client.addEventListener("localAudioToggled", (e) => {});
client.addEventListener("localVideoToggled", (e) => {});
client.addEventListener("error", (e) => {});
```

## Screen Sharing

```typescript
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
const { videoStreamId } = await client.produceMedia(undefined, screenStream.getVideoTracks()[0], "screenshare");

// Stop sharing
await client.stopLocalStream(videoStreamId);
```

## License

MIT
