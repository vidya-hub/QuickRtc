---
sidebar_position: 1
---

# Client SDK Overview

The `quickrtc-client` package is the core JavaScript/TypeScript client SDK for QuickRTC. It works with any framework or vanilla JavaScript.

## Installation

```bash
npm install quickrtc-client socket.io-client
```

## Basic Usage

```typescript
import { QuickRTC } from "quickrtc-client";
import { io } from "socket.io-client";

const socket = io("https://your-server.com");
const rtc = new QuickRTC({ socket });

// Subscribe to events
rtc.on("newParticipant", ({ participantName, streams }) => {
  console.log(`${participantName} joined`);
});

// Join a conference
await rtc.join({
  conferenceId: "room-123",
  participantName: "Alice",
});

// Produce media
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const localStreams = await rtc.produce(stream.getTracks());

// Leave
await rtc.leave();
```

## Configuration

```typescript
interface QuickRTCConfig {
  socket: Socket;           // Socket.IO client instance
  maxParticipants?: number; // Max participants (0 = unlimited)
  debug?: boolean;          // Enable debug logging
}
```

## Events

| Event | Description | Data |
|-------|-------------|------|
| `connected` | Successfully joined a conference | `{ conferenceId, participantId }` |
| `disconnected` | Left or disconnected from conference | `{ reason }` |
| `newParticipant` | A participant joined | `{ participantId, participantName, participantInfo, streams[] }` |
| `participantLeft` | A participant left | `{ participantId }` |
| `streamAdded` | A participant started sharing media | `RemoteStream` |
| `streamRemoved` | A participant stopped sharing | `{ participantId, streamId, type }` |
| `localStreamEnded` | Local track ended externally | `{ streamId, type }` |
| `error` | An error occurred | `{ message, error }` |

## API Reference

### `join(config)`

Join a conference.

```typescript
interface JoinConfig {
  conferenceId: string;
  participantName: string;
  participantId?: string;      // Auto-generated if not provided
  conferenceName?: string;
  participantInfo?: Record<string, unknown>;
}

await rtc.join({
  conferenceId: "my-room",
  participantName: "Alice",
  participantInfo: { role: "host" },
});
```

### `leave()`

Leave the current conference.

```typescript
await rtc.leave();
```

### `produce(input)`

Produce media tracks to share with other participants.

```typescript
// Single track
const [stream] = await rtc.produce(track);

// Multiple tracks
const streams = await rtc.produce([audioTrack, videoTrack]);

// Track with type hint (for screen share)
const [screen] = await rtc.produce({
  track: screenTrack,
  type: "screenshare",
});

// Array with type hints
const streams = await rtc.produce([
  { track: videoTrack, type: "video" },
  { track: screenTrack, type: "screenshare" },
]);
```

### `pause(streamId)`

Pause a local stream.

```typescript
await rtc.pause(localStream.id);
// or
await localStream.pause();
```

### `resume(streamId)`

Resume a paused local stream.

```typescript
await rtc.resume(localStream.id);
// or
await localStream.resume();
```

### `stop(streamId)`

Stop a local stream completely.

```typescript
await rtc.stop(localStream.id);
// or
await localStream.stop();
```

### `on(event, handler)` / `off(event, handler)`

Subscribe/unsubscribe to events.

```typescript
const handler = (data) => console.log(data);

rtc.on("newParticipant", handler);
rtc.off("newParticipant", handler);
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Whether connected to a conference |
| `conferenceId` | `string \| null` | Current conference ID |
| `participantId` | `string \| null` | Current participant ID |
| `participantName` | `string \| null` | Current participant name |
| `localStreams` | `Map<string, LocalStream>` | Map of local streams |
| `remoteStreams` | `Map<string, RemoteStream>` | Map of remote streams |
| `participants` | `Map<string, Participant>` | Map of remote participants |

## Types

### LocalStream

```typescript
interface LocalStream {
  id: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
  track: MediaStreamTrack;
  paused: boolean;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}
```

### RemoteStream

```typescript
interface RemoteStream {
  id: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
  producerId: string;
  participantId: string;
  participantName: string;
}
```

### Participant

```typescript
interface Participant {
  id: string;
  name: string;
  info: Record<string, unknown>;
}
```

## Screen Sharing

```typescript
// Start screen share
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
});

const [screenShare] = await rtc.produce({
  track: screenStream.getVideoTracks()[0],
  type: "screenshare",
});

// Handle when user clicks "Stop sharing" in browser UI
rtc.on("localStreamEnded", ({ streamId, type }) => {
  if (type === "screenshare") {
    console.log("Screen share ended");
  }
});
```

## Error Handling

```typescript
rtc.on("error", ({ message, error }) => {
  console.error("QuickRTC error:", message, error);
});

try {
  await rtc.join({ ... });
} catch (error) {
  console.error("Failed to join:", error);
}
```
