# 🚀 Simple MediaSoup Server

A simplified, event-driven MediaSoup server that abstracts away complexity and provides an easy-to-use API for WebRTC server applications.

## ✨ Features

- **🎯 Simple Setup**: Just a few lines of code to get started
- **🏠 Automatic Conference Management**: Create and manage conferences automatically
- **👥 Participant Tracking**: Real-time participant management and monitoring
- **🔔 Event-Driven Architecture**: Comprehensive event system for all server activities
- **📊 Built-in Statistics**: Server performance and usage monitoring
- **🛡️ Error Handling**: Robust error handling and logging
- **⚡ Auto-Cleanup**: Automatic cleanup of closed conferences and participants
- **🔧 Admin Tools**: Built-in admin functions for server management
- **📱 TypeScript Support**: Full type safety and IntelliSense
- **🌐 CORS Support**: Built-in CORS configuration

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import { SimpleServer } from "simple_ms_server";

// Create server with minimal configuration
const server = new SimpleServer({
  port: 3000,
  host: "0.0.0.0",
  cors: { origin: "*" },
});

// Start the server
await server.start();
console.log("🚀 Server is running!");
```

### 2. Event Handling

```typescript
// Connection events
server.on("clientConnected", (event) => {
  console.log("New client:", event.detail.socketId);
});

server.on("clientDisconnected", (event) => {
  console.log("Client left:", event.detail.socketId);
});

// Conference events
server.on("conferenceCreated", (event) => {
  console.log("Conference created:", event.detail.conference);
});

server.on("participantJoined", (event) => {
  const { participant } = event.detail;
  console.log(`${participant.name} joined ${participant.conferenceId}`);
});

server.on("participantLeft", (event) => {
  const { participant } = event.detail;
  console.log(`${participant.name} left ${participant.conferenceId}`);
});

// Media events
server.on("producerCreated", (event) => {
  const { participantId, producerId, kind } = event.detail;
  console.log(`${kind} producer created for ${participantId}`);
});
```

### 3. Server Management

```typescript
// Get server statistics
const stats = server.getStats();
console.log("Server stats:", stats);

// Get all conferences
const conferences = server.getConferences();

// Get participants in a conference
const participants = server.getConferenceParticipants("conference-123");

// Kick a participant
await server.kickParticipant("participant-456", "Violated rules");

// Close a conference
await server.closeConference("conference-123", "Maintenance");

// Broadcast to conference
server.broadcastToConference("conference-123", "announcement", {
  message: "Meeting will end in 5 minutes",
});
```

### 4. Complete Example

```typescript
import { SimpleServer } from "simple_ms_server";

const server = new SimpleServer({
  port: 3000,
  cors: { origin: "*" },
  mediasoup: {
    workerSettings: {
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
  },
});

// Setup event handlers
function setupEvents() {
  server.on("serverStarted", (event) => {
    console.log(`✅ Server started on port ${event.detail.port}`);
  });

  server.on("participantJoined", (event) => {
    const { participant } = event.detail;
    console.log(
      `👋 ${participant.name} joined conference ${participant.conferenceId}`
    );

    // Broadcast to other participants
    server.broadcastToConference(
      participant.conferenceId,
      "participantJoined",
      {
        participant: participant.name,
      }
    );
  });

  server.on("producerCreated", (event) => {
    console.log(`📹 Media stream started: ${event.detail.kind}`);
  });
}

// Start server
async function start() {
  setupEvents();
  await server.start();

  // Start monitoring
  setInterval(() => {
    const stats = server.getStats();
    console.log(
      `📊 Stats: ${stats.participantCount} participants, ${stats.conferenceCount} conferences`
    );
  }, 30000);
}

start();
```

## 📋 API Reference

### Configuration

```typescript
interface SimpleServerConfig {
  port?: number; // Server port (default: 3000)
  host?: string; // Server host (default: '0.0.0.0')
  cors?: {
    // CORS configuration
    origin: string | string[];
    credentials?: boolean;
  };
  mediasoup?: {
    // MediaSoup configuration
    workerSettings?: WorkerSettings;
    routerOptions?: any;
    transportOptions?: any;
  };
}
```

### Methods

| Method                                    | Description                    | Returns                        |
| ----------------------------------------- | ------------------------------ | ------------------------------ |
| `start()`                                 | Start the server               | `Promise<void>`                |
| `stop()`                                  | Stop the server                | `Promise<void>`                |
| `getConferences()`                        | Get all active conferences     | `ConferenceInfo[]`             |
| `getConference(id)`                       | Get specific conference        | `ConferenceInfo \| undefined`  |
| `getParticipants()`                       | Get all participants           | `ParticipantInfo[]`            |
| `getConferenceParticipants(conferenceId)` | Get participants in conference | `ParticipantInfo[]`            |
| `getParticipant(id)`                      | Get specific participant       | `ParticipantInfo \| undefined` |
| `kickParticipant(id, reason?)`            | Kick participant               | `Promise<void>`                |
| `closeConference(id, reason?)`            | Close conference               | `Promise<void>`                |
| `broadcastToConference(id, event, data)`  | Broadcast to conference        | `void`                         |
| `sendToParticipant(id, event, data)`      | Send to participant            | `void`                         |
| `getStats()`                              | Get server statistics          | `ServerStats`                  |

### Events

| Event                 | When Triggered                | Data                                                                      |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `serverStarted`       | Server successfully started   | `{ port: number, host: string }`                                          |
| `serverError`         | Server error occurred         | `{ error: Error }`                                                        |
| `clientConnected`     | New WebSocket connection      | `{ socketId: string }`                                                    |
| `clientDisconnected`  | WebSocket disconnection       | `{ socketId: string }`                                                    |
| `conferenceCreated`   | New conference created        | `{ conference: ConferenceInfo }`                                          |
| `conferenceDestroyed` | Conference ended              | `{ conferenceId: string }`                                                |
| `participantJoined`   | Participant joined conference | `{ participant: ParticipantInfo }`                                        |
| `participantLeft`     | Participant left conference   | `{ participant: ParticipantInfo }`                                        |
| `producerCreated`     | Media stream started          | `{ participantId: string, producerId: string, kind: 'audio' \| 'video' }` |
| `producerClosed`      | Media stream ended            | `{ participantId: string, producerId: string }`                           |
| `consumerCreated`     | Started receiving stream      | `{ participantId: string, consumerId: string, producerId: string }`       |
| `consumerClosed`      | Stopped receiving stream      | `{ participantId: string, consumerId: string }`                           |
| `audioMuted`          | Audio muted                   | `{ participantId: string, conferenceId: string }`                         |
| `audioUnmuted`        | Audio unmuted                 | `{ participantId: string, conferenceId: string }`                         |
| `videoMuted`          | Video muted                   | `{ participantId: string, conferenceId: string }`                         |
| `videoUnmuted`        | Video unmuted                 | `{ participantId: string, conferenceId: string }`                         |

## 🎯 Use Cases

### Video Conferencing Platform

```typescript
const server = new SimpleServer({
  port: 3000,
  cors: { origin: "https://yourapp.com" },
});

server.on("participantJoined", (event) => {
  // Log user activity
  logUserActivity(event.detail.participant);

  // Send welcome message
  server.sendToParticipant(event.detail.participant.id, "welcome", {
    message: "Welcome to the conference!",
  });
});
```

### Webinar Platform

```typescript
const server = new SimpleServer({ port: 3000 });

server.on("conferenceCreated", (event) => {
  const { conference } = event.detail;

  // Set up webinar-specific settings
  if (conference.name?.includes("webinar")) {
    // Configure for one-to-many streaming
    console.log(`📡 Webinar started: ${conference.id}`);
  }
});
```

### Live Streaming

```typescript
const server = new SimpleServer({ port: 3000 });

server.on("producerCreated", (event) => {
  const { participantId, kind } = event.detail;

  // Start recording or relay to CDN
  if (kind === "video") {
    startStreamRecording(participantId);
  }
});
```

### Educational Platform

```typescript
const server = new SimpleServer({ port: 3000 });

server.on("participantJoined", (event) => {
  const { participant } = event.detail;

  // Check if participant is teacher
  if (participant.name.includes("Teacher")) {
    // Give special permissions
    server.sendToParticipant(participant.id, "permissions", {
      canMuteOthers: true,
      canShareScreen: true,
    });
  }
});
```

## 🔧 Admin & Monitoring

### Server Statistics

```typescript
const stats = server.getStats();
console.log({
  uptime: stats.uptime,
  conferences: stats.conferenceCount,
  participants: stats.participantCount,
  connections: stats.totalConnections,
});
```

### Conference Management

```typescript
// List all conferences
server.getConferences().forEach((conf) => {
  console.log(`Conference ${conf.id}: ${conf.participantCount} participants`);
});

// Close empty conferences
server
  .getConferences()
  .filter((conf) => conf.participantCount === 0)
  .forEach((conf) => server.closeConference(conf.id, "Cleanup"));
```

### Participant Management

```typescript
// Find and kick disruptive participants
server
  .getParticipants()
  .filter((p) => p.name.includes("spam"))
  .forEach((p) => server.kickParticipant(p.id, "Spam detected"));

// Broadcast announcement
server.getConferences().forEach((conf) => {
  server.broadcastToConference(conf.id, "announcement", {
    message: "Server maintenance in 10 minutes",
  });
});
```

## 🚀 Deployment

### Basic Deployment

```typescript
import { SimpleServer } from "simple_ms_server";

const server = new SimpleServer({
  port: process.env.PORT || 3000,
  host: "0.0.0.0",
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  },
});

await server.start();
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
EXPOSE 40000-49999/udp

CMD ["npm", "start"]
```

### Environment Variables

```bash
PORT=3000
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999
```

## 🔍 Comparison with Raw MediaSoup

| Feature                   | SimpleServer | Raw MediaSoup         |
| ------------------------- | ------------ | --------------------- |
| **Setup Complexity**      | 5 lines      | 100+ lines            |
| **Conference Management** | Automatic    | Manual                |
| **Event Handling**        | Built-in     | Custom implementation |
| **Error Handling**        | Automatic    | Manual                |
| **Admin Tools**           | Built-in     | Custom development    |
| **Statistics**            | Built-in     | Custom tracking       |
| **TypeScript Support**    | Complete     | Partial               |
| **Documentation**         | Simple       | Technical             |
| **Learning Curve**        | Easy         | Steep                 |

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests.

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with ❤️ for developers who want simple WebRTC servers**
