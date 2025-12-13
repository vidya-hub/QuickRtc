---
sidebar_position: 1
---

# Server SDK Overview

The `quickrtc-server` package provides a Node.js server with mediasoup integration for handling WebRTC signaling and media routing.

## Installation

```bash
npm install quickrtc-server
```

## Requirements

- Node.js 18+
- HTTPS (WebRTC requires secure context)
- Open UDP ports for media (default: 40000-49999)

## Basic Usage

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

const io = new SocketIOServer(httpsServer, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

const server = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer: io,
});

await server.start();

httpsServer.listen(3000, () => {
  console.log("QuickRTC server running on https://localhost:3000");
});
```

## Configuration

```typescript
interface QuickRTCServerConfig {
  // Provide your HTTP/HTTPS server
  httpServer?: HttpServer | HttpsServer;
  
  // Provide your Socket.IO server
  socketServer?: Server;
  
  // Legacy: standalone mode (creates its own HTTP server)
  port?: number;
  host?: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  
  // MediaSoup configuration
  quickrtcConfig?: {
    webRtcServerOptions?: {
      listenInfos: [{
        ip: string;
        announcedIp?: string;  // Your public IP for production
      }];
    };
    workerSettings?: {
      rtcMinPort?: number;  // Default: 40000
      rtcMaxPort?: number;  // Default: 49999
    };
  };
}
```

### Production Configuration

```typescript
const server = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer: io,
  quickrtcConfig: {
    webRtcServerOptions: {
      listenInfos: [{
        ip: "0.0.0.0",
        announcedIp: process.env.PUBLIC_IP,  // Required for production
      }],
    },
    workerSettings: {
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
  },
});
```

## API Reference

### Lifecycle

```typescript
// Start the server
await server.start();

// Stop the server
await server.stop();
```

### Conferences

```typescript
// Get all active conferences
const conferences = server.getConferences();

// Get a specific conference
const conference = server.getConference(conferenceId);

// Close a conference (kicks all participants)
await server.closeConference(conferenceId, "Room closed");
```

### Participants

```typescript
// Get all participants
const participants = server.getParticipants();

// Get participants in a specific conference
const roomParticipants = server.getConferenceParticipants(conferenceId);

// Get a specific participant
const participant = server.getParticipant(participantId);

// Kick a participant
await server.kickParticipant(participantId, "You have been removed");
```

### Messaging

```typescript
// Broadcast to all participants in a conference
server.broadcastToConference(conferenceId, "custom-event", { data: "hello" });

// Send to a specific participant
server.sendToParticipant(participantId, "custom-event", { data: "hello" });
```

### Server Info

```typescript
// Get Socket.IO server instance
const io = server.getSocketServer();

// Get HTTP server instance
const http = server.getHttpServer();

// Get server statistics
const stats = server.getStats();
// { uptime, conferenceCount, participantCount, totalConnections }
```

## Events

Subscribe to server events using the `on()` method:

```typescript
server.on("conferenceCreated", (event) => {
  console.log("New conference:", event.detail.conference.id);
});

server.on("participantJoined", (event) => {
  console.log(`${event.detail.participant.name} joined`);
});
```

| Event | Description | Data |
|-------|-------------|------|
| `serverStarted` | Server started | `{ port, host }` |
| `serverError` | Server error | `{ error }` |
| `clientConnected` | Socket connected | `{ socketId }` |
| `clientDisconnected` | Socket disconnected | `{ socketId }` |
| `conferenceCreated` | New conference created | `{ conference }` |
| `conferenceDestroyed` | Conference closed | `{ conferenceId }` |
| `participantJoined` | Participant joined | `{ participant }` |
| `participantLeft` | Participant left | `{ participant }` |
| `producerCreated` | Media producer created | `{ participantId, producerId, kind }` |
| `producerClosed` | Media producer closed | `{ participantId, producerId }` |
| `consumerCreated` | Media consumer created | `{ participantId, consumerId, producerId }` |
| `consumerClosed` | Media consumer closed | `{ participantId, consumerId }` |
| `audioMuted` | Audio muted | `{ participantId, conferenceId }` |
| `audioUnmuted` | Audio unmuted | `{ participantId, conferenceId }` |
| `videoMuted` | Video muted | `{ participantId, conferenceId }` |
| `videoUnmuted` | Video unmuted | `{ participantId, conferenceId }` |

## Types

### ConferenceInfo

```typescript
interface ConferenceInfo {
  id: string;
  name?: string;
  participantCount: number;
  createdAt: Date;
}
```

### ParticipantInfo

```typescript
interface ParticipantInfo {
  id: string;
  name: string;
  conferenceId: string;
  socketId: string;
  joinedAt: Date;
  info?: Record<string, unknown>;
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioProducerIds: string[];
    videoProducerIds: string[];
  };
}
```

## Production Checklist

### 1. HTTPS Certificate

WebRTC requires a secure context. Use a valid SSL certificate:

```typescript
const httpsServer = createServer({
  key: readFileSync("/path/to/privkey.pem"),
  cert: readFileSync("/path/to/fullchain.pem"),
}, app);
```

### 2. Public IP Configuration

Set your server's public IP:

```typescript
quickrtcConfig: {
  webRtcServerOptions: {
    listenInfos: [{
      ip: "0.0.0.0",
      announcedIp: "YOUR_PUBLIC_IP",
    }],
  },
}
```

### 3. Firewall Rules

Open the required ports:

- **TCP 443** - HTTPS/WebSocket
- **UDP 40000-49999** - WebRTC media

```bash
# Example: UFW firewall
sudo ufw allow 443/tcp
sudo ufw allow 40000:49999/udp
```

### 4. Environment Variables

```bash
PUBLIC_IP=your.server.ip
NODE_ENV=production
```

## Docker Deployment

```dockerfile
FROM node:20-alpine

# mediasoup requires python and build tools
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 443
EXPOSE 40000-49999/udp

CMD ["node", "server.js"]
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
      - PUBLIC_IP=${PUBLIC_IP}
    network_mode: host  # Recommended for WebRTC
```
