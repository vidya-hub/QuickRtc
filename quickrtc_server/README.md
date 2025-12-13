# quickrtc-server

MediaSoup WebRTC server for QuickRTC conferencing.

## Installation

```bash
npm install quickrtc-server
```

## Quick Start

```typescript
import express from "express";
import { createServer } from "https";
import { readFileSync } from "fs";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";

const app = express();

const httpsServer = createServer({
  key: readFileSync("key.pem"),
  cert: readFileSync("cert.pem"),
}, app);

const socketServer = new SocketIOServer(httpsServer, {
  cors: { origin: "*" },
});

const mediaServer = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer,
});

await mediaServer.start();
httpsServer.listen(3000);
```

## Configuration

```typescript
const server = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer: socketIOServer,
  
  // MediaSoup config (optional - sensible defaults provided)
  quickrtcConfig: {
    // Required for production: set your public IP
    webRtcServerOptions: {
      listenInfos: [{
        ip: "0.0.0.0",
        announcedIp: process.env.PUBLIC_IP,
      }],
    },
    // Optional: customize ports
    workerSettings: {
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
  },
});
```

## API

```typescript
// Lifecycle
await server.start();
await server.stop();

// Conferences
server.getConferences();                      // List all
server.getConference(conferenceId);           // Get one
await server.closeConference(conferenceId);   // Close

// Participants  
server.getParticipants();                     // List all
server.getParticipant(participantId);         // Get one
await server.kickParticipant(participantId);  // Remove

// Messaging
server.broadcastToConference(conferenceId, "event", data);
server.sendToParticipant(participantId, "event", data);

// Stats
server.getStats(); // { uptime, conferenceCount, participantCount }
```

## Events

```typescript
server.on("conferenceCreated", (e) => console.log(e.detail.conference.id));
server.on("conferenceDestroyed", (e) => console.log(e.detail.conferenceId));
server.on("participantJoined", (e) => console.log(e.detail.participant.name));
server.on("participantLeft", (e) => console.log(e.detail.participant.name));
```

## Production Requirements

1. **HTTPS** - WebRTC requires secure context
2. **Public IP** - Set `announcedIp` to your server's public IP
3. **Firewall** - Open port 443 (TCP) and 40000-49999 (UDP)

## License

MIT
