# quickrtc-server

MediaSoup WebRTC server with automatic conference management.

## Installation

```bash
npm install quickrtc-server
```

## Quick Start

```typescript
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";

const app = express();
const httpServer = createServer(app);
const socketServer = new SocketIOServer(httpServer, { cors: { origin: "*" } });

const mediaServer = new QuickRTCServer({ httpServer, socketServer });
await mediaServer.start();

httpServer.listen(3000);
```

## Configuration

```typescript
const server = new QuickRTCServer({
  httpServer,
  socketServer,
  quickrtcConfig: {
    // Worker settings
    workerSettings: {
      logLevel: "warn",
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
    // Router codecs
    routerOptions: {
      mediaCodecs: [/* custom codecs */],
    },
    // Transport settings
    transportOptions: {
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    },
    // Public IP configuration (required for production)
    webRtcServerOptions: {
      listenInfos: [{ ip: "0.0.0.0", announcedIp: "YOUR_PUBLIC_IP" }],
    },
  },
});
```

### Default Configuration

```typescript
{
  workerSettings: {
    logLevel: "warn",
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
  routerOptions: {
    mediaCodecs: [
      { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
      { kind: "video", mimeType: "video/H264", clockRate: 90000, parameters: { ... } },
      { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
    ],
  },
  transportOptions: {
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
  webRtcServerOptions: {
    listenInfos: [{ ip: "127.0.0.1", announcedIp: null }],
  },
}
```

## API

### Lifecycle

```typescript
await server.start();
await server.stop();
```

### Conference Management

```typescript
// Get all conferences
server.getConferences();

// Get participants in a conference
server.getConferenceParticipants(conferenceId);

// Close a conference
await server.closeConference(conferenceId, "Meeting ended");

// Kick a participant
await server.kickParticipant(participantId, "Removed by admin");
```

### Messaging

```typescript
// Broadcast to all participants in a conference
server.broadcastToConference(conferenceId, "customEvent", { data: "value" });

// Send to specific participant
server.sendToParticipant(participantId, "customEvent", { data: "value" });
```

### Statistics

```typescript
const stats = server.getStats();
// {
//   uptime: number,
//   conferenceCount: number,
//   participantCount: number,
//   totalConnections: number,
// }
```

## Events

```typescript
// Server lifecycle
server.on("serverStarted", (e) => {
  console.log("Server started");
});

// Conference events
server.on("conferenceCreated", (e) => {
  console.log(`Conference ${e.conferenceId} created`);
});

server.on("conferenceDestroyed", (e) => {
  console.log(`Conference ${e.conferenceId} destroyed`);
});

// Participant events
server.on("participantJoined", (e) => {
  console.log(`${e.participantName} joined ${e.conferenceId}`);
});

server.on("participantLeft", (e) => {
  console.log(`${e.participantId} left`);
});

// Media events
server.on("producerCreated", (e) => {
  console.log(`Producer ${e.producerId} created (${e.kind})`);
  // e.streamType: "audio" | "video" | "screenshare"
});

server.on("consumerCreated", (e) => {
  console.log(`Consumer ${e.consumerId} created`);
});
```

## Multi-Stream Support

QuickRTC supports multiple video streams per participant:

- **Camera video** (`video`) - Regular webcam stream
- **Screen share** (`screenshare`) - Display/window capture
- **Audio** (`audio`) - Microphone

The server automatically handles routing different stream types and notifies clients with the appropriate `streamType` in events.

## Socket Events

The server handles these socket events automatically:

| Event | Description |
|-------|-------------|
| `joinConference` | Join/create a conference |
| `leaveConference` | Leave current conference |
| `createTransport` | Create WebRTC transport |
| `connectTransport` | Connect transport with DTLS |
| `produce` | Start producing media |
| `consume` | Start consuming media |
| `pauseProducer` | Pause a producer |
| `resumeProducer` | Resume a producer |
| `closeProducer` | Close a producer |
| `closeConsumer` | Close a consumer |
| `consumeParticipantMedia` | Consume all media from a participant |
| `getParticipants` | Get list of participants |

## Production Deployment

### 1. HTTPS Required
WebRTC requires a secure context. Use HTTPS:

```typescript
import { createServer } from "https";
import fs from "fs";

const httpsServer = createServer({
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
}, app);
```

### 2. Configure Public IP
Set `announcedIp` to your server's public IP:

```typescript
webRtcServerOptions: {
  listenInfos: [{
    ip: "0.0.0.0",
    announcedIp: "203.0.113.1", // Your public IP
  }],
}
```

### 3. Open Firewall Ports
- `443/tcp` - HTTPS and WebSocket
- `40000-49999/udp` - WebRTC media (configurable via `rtcMinPort`/`rtcMaxPort`)

### 4. Docker Example

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 443
EXPOSE 40000-49999/udp
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
services:
  quickrtc:
    build: .
    ports:
      - "443:443"
      - "40000-49999:40000-49999/udp"
    environment:
      - ANNOUNCED_IP=203.0.113.1
```

## License

MIT
