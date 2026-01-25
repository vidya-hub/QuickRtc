---
sidebar_position: 1
slug: /getting-started
---

# Getting Started

QuickRTC is a simple WebRTC conferencing SDK built on [mediasoup](https://mediasoup.org/). It provides an easy-to-use API for building real-time video conferencing applications.

## Overview

QuickRTC consists of four packages:

| Package                   | Description                                  |
| ------------------------- | -------------------------------------------- |
| `quickrtc-client`         | Core JavaScript/TypeScript client SDK        |
| `quickrtc-server`         | Node.js server with mediasoup integration    |
| `quickrtc-react-client`   | React hooks and components                   |
| `quickrtc-flutter-client` | Flutter SDK for Android, iOS, macOS, and Web |

## Quick Start

### 1. Install packages

```bash
# Client
npm install quickrtc-client socket.io-client

# Server
npm install quickrtc-server

# React (optional)
npm install quickrtc-react-client
```

### 2. Set up the server

```typescript
import express from "express";
import { createServer } from "https";
import { readFileSync } from "fs";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";

const app = express();

// HTTPS is required for WebRTC
const httpsServer = createServer(
  {
    key: readFileSync("key.pem"),
    cert: readFileSync("cert.pem"),
  },
  app,
);

const io = new SocketIOServer(httpsServer, {
  cors: { origin: "*" },
});

const mediaServer = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer: io,
});

await mediaServer.start();
httpsServer.listen(3000, () => {
  console.log("Server running on https://localhost:3000");
});
```

### 3. Connect from the client

```typescript
import { QuickRTC } from "quickrtc-client";
import { io } from "socket.io-client";

// Connect to the server
const socket = io("https://localhost:3000");

// Create QuickRTC instance
const rtc = new QuickRTC({ socket });

// Listen for remote participants
rtc.on("newParticipant", ({ participantName, streams }) => {
  console.log(`${participantName} joined with ${streams.length} streams`);

  // Streams are auto-consumed and ready to use
  streams.forEach((stream) => {
    const video = document.createElement("video");
    video.srcObject = stream.stream;
    video.autoplay = true;
    document.body.appendChild(video);
  });
});

rtc.on("streamAdded", (stream) => {
  console.log(`${stream.participantName} added ${stream.type}`);
});

rtc.on("streamRemoved", ({ streamId }) => {
  console.log(`Stream ${streamId} removed`);
});

rtc.on("participantLeft", ({ participantId }) => {
  console.log(`Participant ${participantId} left`);
});

// Join a conference
await rtc.join({
  conferenceId: "my-room",
  participantName: "Alice",
});

// Start sharing your camera
const mediaStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

const localStreams = await rtc.produce(mediaStream.getTracks());

// Each local stream has controls
localStreams.forEach((stream) => {
  console.log(`Producing ${stream.type}`);
  // stream.pause()
  // stream.resume()
  // stream.stop()
});
```

## Key Concepts

### Event-Driven Architecture

QuickRTC uses an event-driven pattern. You subscribe to events and react to changes:

- `newParticipant` - When someone joins (with their streams if any)
- `streamAdded` - When an existing participant adds a new stream
- `streamRemoved` - When a stream is removed
- `participantLeft` - When someone leaves
- `localStreamEnded` - When your local stream ends (e.g., browser "Stop sharing")

### Auto-Consume

Remote streams are **automatically consumed**. When you receive a `newParticipant` or `streamAdded` event, the streams are already ready to use - no manual subscription needed.

### Local Stream Controls

When you produce media with `rtc.produce()`, you get back `LocalStream` objects with built-in controls:

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
```

## Next Steps

- [Client SDK Documentation](/docs/client/overview)
- [Server SDK Documentation](/docs/server/overview)
- [React Integration](/docs/react/overview)
- [Flutter SDK](/docs/flutter/getting-started)
