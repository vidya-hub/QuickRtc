# Server Documentation

The Simple MediaSoup Server provides a comprehensive WebRTC conferencing solution with automatic resource management, scalability features, and robust error handling.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Configuration](#configuration)
- [Core Components](#core-components)
- [API Reference](#api-reference)
- [Events](#events)
- [Error Handling](#error-handling)
- [Scalability](#scalability)

## Installation

```bash
# Install the server package
pnpm add simple_ms_server @simple-mediasoup/types

# Peer dependencies
pnpm add mediasoup socket.io
```

## Basic Setup

### 1. Create a Basic Server

```typescript
import { Server } from "socket.io";
import { createServer } from "http";
import {
  WorkerService,
  MediasoupController,
  SocketEventController,
} from "simple_ms_server";
import type { MediasoupConfig } from "@simple-mediasoup/types";

const mediasoupConfig: MediasoupConfig = {
  workerConfig: {
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  },
  routerConfig: {
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
          "x-google-start-bitrate": 1000,
        },
      },
    ],
  },
  transportConfig: {
    listenIps: [
      { ip: "127.0.0.1", announcedIp: null },
      // Add your server's public IP for production
      // { ip: '0.0.0.0', announcedIp: 'YOUR_PUBLIC_IP' }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
};

async function startServer() {
  // Create HTTP server
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Initialize services
  const workerService = new WorkerService(mediasoupConfig);
  const mediasoupController = new MediasoupController(workerService);
  const socketController = new SocketEventController(mediasoupController, io);

  // Create MediaSoup workers
  await workerService.createWorkers();

  // Setup event listeners
  setupEventListeners(mediasoupController);

  // Start server
  httpServer.listen(3000, () => {
    console.log("🚀 MediaSoup server running on port 3000");
  });
}

function setupEventListeners(controller: MediasoupController) {
  controller.on("conferenceCreated", (conference) => {
    console.log(`Conference created: ${conference.id}`);
  });

  controller.on("participantLeft", (data) => {
    console.log(`Participant left: ${data.participantId}`);
  });

  controller.on("error", (error) => {
    console.error("MediaSoup error:", error);
  });
}

startServer().catch(console.error);
```

## Configuration

### MediaSoup Configuration

The `MediasoupConfig` interface defines the configuration for MediaSoup workers, routers, and transports:

```typescript
interface MediasoupConfig {
  workerConfig: WorkerSettings;
  routerConfig: RouterOptions;
  transportConfig: WebRtcTransportOptions;
}
```

#### Worker Configuration

```typescript
const workerConfig: WorkerSettings = {
  logLevel: "warn", // 'debug' | 'warn' | 'error' | 'none'
  logTags: [
    "info",
    "ice",
    "dtls",
    "rtp",
    "srtp",
    "rtcp",
    "rtx",
    "bwe",
    "score",
    "simulcast",
    "svc",
    "sctp",
  ],
  rtcMinPort: 10000,
  rtcMaxPort: 10100,
  appData: { serverName: "MyMediaSoupServer" },
};
```

#### Router Configuration

```typescript
const routerConfig: RouterOptions = {
  mediaCodecs: [
    // Audio codecs
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "audio",
      mimeType: "audio/PCMU",
      clockRate: 8000,
    },
    // Video codecs
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: {
        "x-google-start-bitrate": 1000,
      },
    },
    {
      kind: "video",
      mimeType: "video/VP9",
      clockRate: 90000,
      parameters: {
        "profile-id": 2,
      },
    },
    {
      kind: "video",
      mimeType: "video/h264",
      clockRate: 90000,
      parameters: {
        "packetization-mode": 1,
        "profile-level-id": "4d0032",
        "level-asymmetry-allowed": 1,
      },
    },
  ],
};
```

#### Transport Configuration

```typescript
const transportConfig: WebRtcTransportOptions = {
  listenIps: [
    { ip: "127.0.0.1", announcedIp: null }, // Local development
    { ip: "0.0.0.0", announcedIp: process.env.ANNOUNCED_IP }, // Production
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 1000000,
  minimumAvailableOutgoingBitrate: 600000,
  maxSctpMessageSize: 262144,
  sctpSendBufferSize: 262144,
};
```

## Core Components

### WorkerService

Manages MediaSoup workers with intelligent load balancing:

```typescript
const workerService = new WorkerService(mediasoupConfig);

// Create workers (one per CPU core by default)
await workerService.createWorkers();

// Get optimal worker for new conference
const { worker, router } = await workerService.getWorker();

// Get worker statistics
const stats = workerService.getWorkerStats();
console.log("Worker stats:", stats);

// Cleanup closed routers
await workerService.cleanupClosedRouters();
```

### MediasoupController

Central controller for conference and participant management:

```typescript
const controller = new MediasoupController(workerService);

// Join a conference
const conference = await controller.joinConference({
  conferenceId: "conference-123",
  conferenceName: "My Conference",
  participantId: "user-456",
  participantName: "John Doe",
  socketId: "socket-789",
});

// Create transport
const transport = await controller.createTransport({
  conferenceId: "conference-123",
  participantId: "user-456",
  direction: "producer", // or 'consumer'
  options: mediasoupConfig.transportConfig,
});

// Handle participant leaving
const cleanup = await controller.removeFromConference(
  "conference-123",
  "user-456"
);
```

### SocketEventController

Handles WebSocket communication with clients:

```typescript
const socketController = new SocketEventController(mediasoupController, io);

// The controller automatically handles these events:
// - joinConference
// - leaveConference
// - createTransport
// - connectTransport
// - produce
// - consume
// - pauseProducer/Consumer
// - muteAudio/Video
// - resumeProducer
// - getProducers
```

## API Reference

### MediasoupController Methods

#### Conference Management

```typescript
// Join conference
async joinConference(params: JoinConferenceParams): Promise<Conference>

// Create conference
async createConference(conferenceId: string, name: string): Promise<void>

// Get conference
getConference(conferenceId: string): Conference | undefined

// Remove participant
async removeFromConference(
  conferenceId: string,
  participantId: string
): Promise<{ closedProducerIds: string[]; closedConsumerIds: string[]; }>

// Check if conference exists
isConferenceExists(conferenceId: string): boolean
```

#### Transport Management

```typescript
// Create transport
async createTransport(
  params: CreateTransportParams
): Promise<WebRtcTransport>

// Connect transport
async connectTransport(params: ConnectTransportParams): Promise<void>
```

#### Producer/Consumer Management

```typescript
// Produce media
async produce(params: ProduceParams): Promise<string>

// Consume media
async consume(params: ConsumeParams): Promise<ConsumerResponse>

// Resume consumer
async resumeConsumer(params: ResumeConsumerParams): Promise<void>

// Pause/Resume producer
async pauseProducer(params: {
  conferenceId: string;
  participantId: string;
  producerId: string;
}): Promise<void>

async resumeProducer(params: {
  conferenceId: string;
  participantId: string;
  producerId: string;
}): Promise<void>
```

#### Media Controls

```typescript
// Mute/Unmute audio
async muteAudio(params: {
  conferenceId: string;
  participantId: string;
}): Promise<string[]>

async unmuteAudio(params: {
  conferenceId: string;
  participantId: string;
}): Promise<string[]>

// Mute/Unmute video
async muteVideo(params: {
  conferenceId: string;
  participantId: string;
}): Promise<string[]>

async unmuteVideo(params: {
  conferenceId: string;
  participantId: string;
}): Promise<string[]>
```

#### Statistics and Monitoring

```typescript
// Get system statistics
getStats(): {
  conferences: number;
  totalParticipants: number;
  workerStats: WorkerStats[];
}

// Get participant media states
getParticipantMediaStates(
  conferenceId: string,
  participantId: string
): MediaState[] | null
```

## Events

The MediasoupController emits the following events:

### Conference Events

```typescript
// Conference created
controller.on("conferenceCreated", (conference: Conference) => {
  console.log(`Conference ${conference.id} created`);
});

// Conference destroyed
controller.on("conferenceDestroyed", (data: { conferenceId: string }) => {
  console.log(`Conference ${data.conferenceId} destroyed`);
});

// Participant joined
controller.on(
  "participantJoined",
  (data: { conferenceId: string; participantId: string }) => {
    console.log(
      `Participant ${data.participantId} joined conference ${data.conferenceId}`
    );
  }
);

// Participant left
controller.on(
  "participantLeft",
  (data: {
    conferenceId: string;
    participantId: string;
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }) => {
    console.log(`Participant ${data.participantId} left`);
  }
);
```

### Media Events

```typescript
// Producer events
controller.on(
  "producerCreated",
  (data: {
    conferenceId: string;
    participantId: string;
    producerId: string;
  }) => {}
);

controller.on(
  "producerClosed",
  (data: {
    conferenceId: string;
    participantId: string;
    producerId: string;
  }) => {}
);

// Consumer events
controller.on(
  "consumerCreated",
  (data: {
    conferenceId: string;
    participantId: string;
    consumerId: string;
  }) => {}
);

// Mute/Unmute events
controller.on(
  "audioMuted",
  (data: {
    conferenceId: string;
    participantId: string;
    mutedProducerIds: string[];
  }) => {}
);
```

### System Events

```typescript
// Statistics
controller.on("stats", (stats) => {
  console.log("System stats:", stats);
});

// Cleanup
controller.on(
  "cleanup",
  (data: { cleanedConferences: number; totalConferences: number }) => {}
);

// Errors
controller.on("error", (error) => {
  console.error("Controller error:", error);
});
```

## Error Handling

The server includes comprehensive error handling:

### Error Handler

```typescript
import { ErrorHandler, ErrorType } from "simple_ms_server";

// Access the error handler
const errorHandler = controller.errorHandler;

// Listen for errors
errorHandler.on("error", (error) => {
  console.error(`${error.type}: ${error.message}`);

  // Handle specific error types
  switch (error.type) {
    case ErrorType.WORKER:
      // Handle worker errors
      break;
    case ErrorType.TRANSPORT:
      // Handle transport errors
      break;
    case ErrorType.CONFERENCE:
      // Handle conference errors
      break;
  }
});

// Get error statistics
const errorStats = errorHandler.getErrorStats();
console.log("Error statistics:", errorStats);

// Get recent errors
const recentErrors = errorHandler.getErrors(ErrorType.PRODUCER);
```

### Error Types

```typescript
enum ErrorType {
  VALIDATION = "VALIDATION",
  TRANSPORT = "TRANSPORT",
  PRODUCER = "PRODUCER",
  CONSUMER = "CONSUMER",
  CONFERENCE = "CONFERENCE",
  PARTICIPANT = "PARTICIPANT",
  WORKER = "WORKER",
  NETWORK = "NETWORK",
  INTERNAL = "INTERNAL",
}
```

## Scalability

### Load Balancing

The WorkerService automatically balances load across workers:

```typescript
// Workers are selected based on:
// - CPU usage (40% weight)
// - Router count (60% weight)
// - Last used time

const { worker, router } = await workerService.getWorker();
```

### Resource Management

```typescript
// Automatic cleanup happens every 5 minutes
// - Empty conferences are cleaned up
// - Closed routers are removed
// - Resource statistics are collected

// Manual cleanup
await controller.performPeriodicCleanup();

// Get current statistics
const stats = controller.getStats();
```

### Production Deployment

```typescript
// Production configuration
const productionConfig: MediasoupConfig = {
  workerConfig: {
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 20000, // Larger port range for production
  },
  transportConfig: {
    listenIps: [{ ip: "0.0.0.0", announcedIp: process.env.ANNOUNCED_IP }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
  },
};

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down MediaSoup server...");
  await controller.shutdown();
  process.exit(0);
});
```

## Advanced Usage

### Custom Event Handling

```typescript
class CustomSocketController extends SocketEventController {
  protected setupSocketEvents() {
    super.setupSocketEvents();

    // Add custom event handlers
    this.mediasoupSocket.on("connection", (socket) => {
      socket.on("customEvent", this.handleCustomEvent.bind(this));
    });
  }

  private handleCustomEvent(data: any) {
    // Handle custom events
  }
}
```

### Conference Middleware

```typescript
// Add middleware for conference join
const originalJoinConference = controller.joinConference.bind(controller);
controller.joinConference = async (params) => {
  // Pre-join validation
  if (!isValidParticipant(params.participantId)) {
    throw new Error("Invalid participant");
  }

  // Call original method
  const result = await originalJoinConference(params);

  // Post-join actions
  await notifyOtherParticipants(params);

  return result;
};
```

### Monitoring Integration

```typescript
// Integrate with monitoring systems
controller.on("stats", (stats) => {
  // Send to monitoring service
  monitoringService.send("mediasoup.conferences", stats.conferences);
  monitoringService.send("mediasoup.participants", stats.totalParticipants);
});

controller.on("error", (error) => {
  // Send errors to logging service
  logger.error("MediaSoup error", error);
});
```
