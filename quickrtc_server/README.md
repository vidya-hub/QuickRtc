# 🏠 QuickRTC Server

A powerful yet simple MediaSoup server with dependency injection support. Bring your own HTTP server and Socket.IO instance for maximum flexibility.

---

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Events](#-events)

---

## ✨ Features

- **🔌 Dependency Injection**: Inject your own HTTP/HTTPS and Socket.IO servers.
- **🏠 Auto Conference Management**: Automatically handle conference lifecycle.
- **👥 Participant Tracking**: Real-time participant management.
- **🔔 Event-Driven Architecture**: Comprehensive event system.
- **🛡️ Error Handling**: Robust error management.
- **🔧 Admin Tools**: Conference and participant management APIs.
- **📱 TypeScript**: Full type safety and IntelliSense.

---

## 📦 Installation

```bash
npm install quickrtc_server
```

---

## 🚀 Quick Start

### Basic Setup with Express

```typescript
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc_server";

// 1. Create your servers
const app = express();
const httpServer = http.createServer(app);
const socketServer = new SocketIOServer(httpServer);

// 2. Create QuickRTCServer with dependency injection
const mediaServer = new QuickRTCServer({
  httpServer,
  socketServer,
});

// 3. Start the server
await mediaServer.start();

httpServer.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
```

---

## 🔄 Architecture Flow

### Server Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP/HTTPS SERVER                             │
│                   (User-provided Express/etc)                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Socket.IO SERVER                              │
│                    (User-provided)                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    QuickRTCServer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Worker     │  │  Conference  │  │   Socket     │          │
│  │   Service    │→ │  Management  │→ │  Controller  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MediaSoup Core                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Workers    │  │   Routers    │  │  Transports  │          │
│  │              │→ │              │→ │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Conference Lifecycle Flow

```
Client Request                  QuickRTCServer                 MediaSoup
      │                              │                           │
      │──1. Join Conference─────────→│                           │
      │                              │                           │
      │                              │  Check if conference      │
      │                              │  exists                   │
      │                              │                           │
      │                              │  If not exists:           │
      │                              │──Create Router───────────→│
      │                              │←─Router Created───────────│
      │                              │  Create Conference        │
      │                              │  Add to Map               │
      │                              │                           │
      │                              │  Add Participant          │
      │                              │  to Conference            │
      │                              │                           │
      │←─2. Router Capabilities──────│                           │
      │                              │                           │
      │──3. Create Transports───────→│                           │
      │                              │──Create WebRTC Transport─→│
      │                              │←─Transport Params─────────│
      │←─4. Transport Params─────────│                           │
      │                              │                           │
      │──5. Produce Media───────────→│                           │
      │                              │──Create Producer─────────→│
      │                              │←─Producer Created─────────│
      │                              │                           │
      │                              │  Notify other participants│
      │                              │  (newProducer event)      │
      │                              │                           │
      │──6. Consume Media───────────→│                           │
      │                              │──Create Consumer─────────→│
      │                              │←─Consumer Created─────────│
      │←─7. Consumer Params──────────│                           │
      │                              │                           │
      │──8. Disconnect──────────────→│                           │
      │                              │  Remove Participant       │
      │                              │  Close Transports         │
      │                              │  Close Producers/Consumers│
      │                              │                           │
      │                              │  If last participant:     │
      │                              │  Destroy Conference       │
      │                              │──Close Router────────────→│
      │                              │                           │
```

---

## 📚 API Reference

### Constructor

```typescript
new QuickRTCServer(config: QuickRTCServerConfig)
```

**Parameters:**

```typescript
interface QuickRTCServerConfig {
  // Required: Inject your servers
  httpServer: http.Server | https.Server;
  socketServer: SocketIOServer;

  // Optional: MediaSoup configuration
  mediasoup?: {
    workerSettings?: WorkerSettings;
    routerOptions?: RouterOptions;
    transportOptions?: WebRtcTransportOptions;
  };
}
```

### Methods

#### `start(): Promise<void>`

Initialize and start the MediaSoup server.

```typescript
await mediaServer.start();
```

---

#### `stop(): Promise<void>`

Stop the server and clean up all resources.

```typescript
await mediaServer.stop();
```

---

#### `getConferences(): Conference[]`

Get all active conferences.

```typescript
const conferences = mediaServer.getConferences();
console.log(`Active conferences: ${conferences.length}`);
```

---

#### `getParticipants(): Participant[]`

Get all participants across all conferences.

```typescript
const participants = mediaServer.getParticipants();
console.log(`Total participants: ${participants.length}`);
```

---

#### `getConferenceParticipants(conferenceId: string): Participant[]`

Get participants in a specific conference.

```typescript
const participants = mediaServer.getConferenceParticipants("room-123");
```

---

#### `getStats(): ServerStats`

Get server statistics.

```typescript
const stats = mediaServer.getStats();
console.log(`Conferences: ${stats.conferences}`);
console.log(`Participants: ${stats.participants}`);
console.log(`Producers: ${stats.producers}`);
console.log(`Consumers: ${stats.consumers}`);
```

---

#### `closeConference(conferenceId: string, reason?: string): Promise<void>`

Close a conference and remove all participants.

```typescript
await mediaServer.closeConference("room-123", "Maintenance");
```

---

#### `kickParticipant(participantId: string, reason?: string): Promise<void>`

Remove a participant from their conference.

```typescript
await mediaServer.kickParticipant("user-456", "Violated rules");
```

---

#### `broadcastToConference(conferenceId: string, event: string, data: any): void`

Send a message to all participants in a conference.

```typescript
mediaServer.broadcastToConference("room-123", "announcement", {
  message: "Meeting will end in 5 minutes",
});
```

---

## ⚙️ Configuration

### MediaSoup Worker Settings

```typescript
{
  mediasoup: {
    workerSettings: {
      logLevel: "warn",              // Log level: "debug" | "warn" | "error" | "none"
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
      rtcMinPort: 40000,             // Minimum RTC port
      rtcMaxPort: 49999,             // Maximum RTC port
    }
  }
}
```

### Router Options

```typescript
{
  mediasoup: {
    routerOptions: {
      mediaCodecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: "video",
          mimeType: "video/H264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
          },
        },
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90000,
        },
      ],
    }
  }
}
```

### Transport Options

```typescript
{
  mediasoup: {
    transportOptions: {
      listenIps: [
        {
          ip: "0.0.0.0",              // Listen on all interfaces
          announcedIp: "YOUR_PUBLIC_IP", // Your public IP (for remote clients)
        },
      ],
      enableUdp: true,                // Enable UDP
      enableTcp: true,                // Enable TCP
      preferUdp: true,                // Prefer UDP over TCP
      enableSctp: false,              // Enable SCTP for data channels
    }
  }
}
```

---

## 🔔 Events

The server uses Node.js EventEmitter. Listen to events using `on()` or `addEventListener()`.

### `serverStarted`

Fired when the server initializes successfully.

```typescript
mediaServer.on("serverStarted", (event) => {
  console.log("🚀 MediaSoup server started");
});
```

---

### `serverError`

Fired when a server error occurs.

```typescript
mediaServer.on("serverError", (event) => {
  console.error("Server error:", event.detail.error);
});
```

---

### `clientConnected`

Fired when a client connects via Socket.IO.

```typescript
mediaServer.on("clientConnected", (event) => {
  console.log("Client connected:", event.detail.socketId);
});
```

---

### `clientDisconnected`

Fired when a client disconnects.

```typescript
mediaServer.on("clientDisconnected", (event) => {
  console.log("Client disconnected:", event.detail.socketId);
});
```

---

### `conferenceCreated`

Fired when a conference is created.

```typescript
mediaServer.on("conferenceCreated", (event) => {
  const { conference } = event.detail;
  console.log(`Conference created: ${conference.id}`);
});
```

---

### `conferenceDestroyed`

Fired when a conference is destroyed.

```typescript
mediaServer.on("conferenceDestroyed", (event) => {
  console.log(`Conference destroyed: ${event.detail.conferenceId}`);
});
```

---

### `participantJoined`

Fired when a participant joins a conference.

```typescript
mediaServer.on("participantJoined", (event) => {
  const { participant } = event.detail;
  console.log(`${participant.name} joined ${participant.conferenceId}`);
});
```

---

### `participantLeft`

Fired when a participant leaves.

```typescript
mediaServer.on("participantLeft", (event) => {
  const { participant } = event.detail;
  console.log(`${participant.name} left`);
});
```

---

### `producerCreated`

Fired when a producer is created.

```typescript
mediaServer.on("producerCreated", (event) => {
  const { producerId, participantId, kind } = event.detail;
  console.log(`Producer created: ${kind} for ${participantId}`);
});
```

---

### `producerClosed`

Fired when a producer is closed.

```typescript
mediaServer.on("producerClosed", (event) => {
  const { producerId, participantId } = event.detail;
  console.log(`Producer closed for ${participantId}`);
});
```

---

### `consumerCreated`

Fired when a consumer is created.

```typescript
mediaServer.on("consumerCreated", (event) => {
  const { consumerId, participantId, producerId } = event.detail;
  console.log(`Consumer created for ${participantId}`);
});
```

---

### `consumerClosed`

Fired when a consumer is closed.

```typescript
mediaServer.on("consumerClosed", (event) => {
  const { consumerId, participantId } = event.detail;
  console.log(`Consumer closed for ${participantId}`);
});
```

---

## 💡 Integration Examples

### Express + HTTPS

```typescript
import express from "express";
import https from "https";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc_server";

const app = express();

// Load SSL certificates
const httpsOptions = {
  key: fs.readFileSync("./certs/key.pem"),
  cert: fs.readFileSync("./certs/cert.pem"),
};

// Create HTTPS server
const httpsServer = https.createServer(httpsOptions, app);

// Create Socket.IO server
const socketServer = new SocketIOServer(httpsServer, {
  cors: { origin: "*" },
});

// Create MediaSoup server
const mediaServer = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer,
  mediasoup: {
    workerSettings: {
      logLevel: "warn",
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
    transportOptions: {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: "YOUR_PUBLIC_IP",
        },
      ],
    },
  },
});

// Start server
await mediaServer.start();

httpsServer.listen(3443, () => {
  console.log("🚀 HTTPS Server running on port 3443");
});
```

---

### Fastify Integration

```typescript
import Fastify from "fastify";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc_server";

const fastify = Fastify();

// Get underlying HTTP server
await fastify.listen({ port: 3000 });
const httpServer = fastify.server;

// Create Socket.IO server
const socketServer = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

// Create MediaSoup server
const mediaServer = new QuickRTCServer({
  httpServer,
  socketServer,
});

await mediaServer.start();
console.log("🚀 Fastify + MediaSoup running");
```

---

### Complete Express Example with API Routes

```typescript
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc_server";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Create servers
const httpServer = http.createServer(app);
const socketServer = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

const mediaServer = new QuickRTCServer({
  httpServer,
  socketServer,
});

// API Routes
app.get("/api/conferences", (req, res) => {
  const conferences = mediaServer.getConferences();
  res.json(conferences);
});

app.get("/api/conferences/:id/participants", (req, res) => {
  const participants = mediaServer.getConferenceParticipants(req.params.id);
  res.json(participants);
});

app.get("/api/stats", (req, res) => {
  const stats = mediaServer.getStats();
  res.json(stats);
});

app.post("/api/conferences/:id/close", async (req, res) => {
  try {
    await mediaServer.closeConference(req.params.id, "Admin closed");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/participants/:id/kick", async (req, res) => {
  try {
    await mediaServer.kickParticipant(req.params.id, req.body.reason);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
await mediaServer.start();

httpServer.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
```

---

### Event Monitoring

```typescript
import { QuickRTCServer } from "quickrtc_server";

const mediaServer = new QuickRTCServer({
  httpServer,
  socketServer,
});

// Monitor all server events
mediaServer.on("serverStarted", () => {
  console.log("✅ Server started");
});

mediaServer.on("conferenceCreated", (event) => {
  const { conference } = event.detail;
  console.log(`🏠 Conference created: ${conference.id}`);

  // Log to database, analytics, etc.
  logToDatabase("conference_created", conference);
});

mediaServer.on("participantJoined", (event) => {
  const { participant } = event.detail;
  console.log(`👋 ${participant.name} joined ${participant.conferenceId}`);

  // Update participant count
  updateAnalytics("participant_joined", participant);
});

mediaServer.on("producerCreated", (event) => {
  const { kind, participantId } = event.detail;
  console.log(`📹 ${kind} producer created for ${participantId}`);
});

mediaServer.on("serverError", (event) => {
  console.error("❌ Server error:", event.detail.error);

  // Alert admins
  alertAdmins("server_error", event.detail.error);
});

await mediaServer.start();
```

---

### Graceful Shutdown

```typescript
const mediaServer = new QuickRTCServer({
  httpServer,
  socketServer,
});

await mediaServer.start();

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n📡 Received ${signal}, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    await mediaServer.stop();

    // Close HTTP server
    httpServer.close(() => {
      console.log("✅ Server shut down successfully");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
```

---

## 📘 TypeScript Support

Full TypeScript definitions are included.

```typescript
import {
  QuickRTCServer,
  QuickRTCServerConfig,
  Conference,
  Participant,
  ServerStats,
  QuickRTCServerEvents,
} from "quickrtc_server";

// Type-safe configuration
const config: QuickRTCServerConfig = {
  httpServer,
  socketServer,
  mediasoup: {
    workerSettings: {
      logLevel: "warn",
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
  },
};

const server = new QuickRTCServer(config);

// Type-safe event handling
server.on(
  "participantJoined",
  (event: CustomEvent<QuickRTCServerEvents["participantJoined"]>) => {
    const { participant } = event.detail;
    // TypeScript knows the event structure
  }
);
```

---

## 🤝 Contributing

Contributions are welcome! Please see the main project README for guidelines.

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🔗 Related

- [QuickRTC Client](../quickrtc_client/README.md)
- [Example Application](../quickrtc_example/README.md)
- [Main Project](../README.md)
