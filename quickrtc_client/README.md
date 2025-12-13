# quickrtc-client

Simple WebRTC conferencing client built on mediasoup.

## Installation

```bash
npm install quickrtc-client
```

## Quick Start

```typescript
import { QuickRTC } from "quickrtc-client";
import { io } from "socket.io-client";

const socket = io("https://localhost:3000");
const rtc = new QuickRTC({ socket });

// Listen for participants
rtc.on("newParticipant", ({ participantName, streams }) => {
  console.log(`${participantName} joined`);
  // streams may be empty if they haven't started sharing yet
});

rtc.on("streamAdded", (stream) => {
  // Existing participant started sharing media
  console.log(`${stream.participantName} started ${stream.type}`);
});

// Join room
await rtc.join({ conferenceId: "room-1", participantName: "Alice" });

// Start sharing media
const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
const localStreams = await rtc.produce(media.getTracks());
```

## Events

| Event | When | Data |
|-------|------|------|
| `newParticipant` | Someone joins | `{ participantId, participantName, streams[] }` |
| `streamAdded` | Participant starts sharing | `{ id, type, stream, participantId, participantName }` |
| `streamRemoved` | Participant stops sharing | `{ participantId, streamId, type }` |
| `participantLeft` | Someone leaves | `{ participantId }` |
| `localStreamEnded` | Your stream stopped externally | `{ streamId, type }` |

## API

```typescript
// Join/Leave
await rtc.join({ conferenceId, participantName });
await rtc.leave();

// Produce media
const streams = await rtc.produce(track);           // Single track
const streams = await rtc.produce([track1, track2]); // Multiple tracks
const streams = await rtc.produce({ track, type: "screenshare" }); // With type hint

// Control streams
await localStream.pause();
await localStream.resume();
await localStream.stop();
```

## Example

```typescript
let remoteParticipants = [];
let remoteStreams = [];

rtc.on("newParticipant", ({ participantId, participantName, streams }) => {
  remoteParticipants.push({ id: participantId, name: participantName });
  remoteStreams.push(...streams);
  render();
});

rtc.on("streamAdded", (stream) => {
  remoteStreams.push(stream);
  render();
});

rtc.on("streamRemoved", ({ streamId }) => {
  remoteStreams = remoteStreams.filter(s => s.id !== streamId);
  render();
});

rtc.on("participantLeft", ({ participantId }) => {
  remoteParticipants = remoteParticipants.filter(p => p.id !== participantId);
  remoteStreams = remoteStreams.filter(s => s.participantId !== participantId);
  render();
});

rtc.on("localStreamEnded", ({ streamId }) => {
  // Browser stopped the track (e.g., "Stop sharing" button)
  localStreams = localStreams.filter(s => s.id !== streamId);
  render();
});
```

## Types

```typescript
interface LocalStream {
  id: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
  track: MediaStreamTrack;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

interface RemoteStream {
  id: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
  participantId: string;
  participantName: string;
}
```

## License

MIT
