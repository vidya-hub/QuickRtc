# quickrtc-server

MediaSoup server with automatic conference management.

## Installation

```bash
npm install quickrtc-server
```

## Quick Start

```typescript
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";

const app = express();
const httpServer = http.createServer(app);
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
    // Override only what you need - defaults are provided
    webRtcServerOptions: {
      listenInfos: [{ ip: "0.0.0.0", announcedIp: "YOUR_PUBLIC_IP" }],
    },
  },
});
```

### Default Config

```typescript
{
  workerSettings: {
    logLevel: "warn",
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
  routerOptions: {
    mediaCodecs: [/* opus, H264, VP8 */],
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

```typescript
// Lifecycle
await server.start();
await server.stop();

// Conference management
server.getConferences();
server.getConferenceParticipants(conferenceId);
await server.closeConference(conferenceId, reason);
await server.kickParticipant(participantId, reason);

// Messaging
server.broadcastToConference(conferenceId, event, data);
server.sendToParticipant(participantId, event, data);

// Stats
server.getStats(); // { uptime, conferenceCount, participantCount, totalConnections }
```

## Events

```typescript
server.on("serverStarted", (e) => {});
server.on("conferenceCreated", (e) => {});
server.on("conferenceDestroyed", (e) => {});
server.on("participantJoined", (e) => {});
server.on("participantLeft", (e) => {});
server.on("producerCreated", (e) => {});
server.on("consumerCreated", (e) => {});
```

## License

MIT
