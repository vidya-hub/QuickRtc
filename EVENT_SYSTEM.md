# Event System Documentation

This document explains the enhanced event system in the Simple MediaSoup client, including the new Event Orchestrator and how events flow through the system.

## Overview

The Simple MediaSoup client now features a comprehensive event system with:

- **Event Orchestrator**: Centralized event management and transformation
- **Type-safe event handling**: Full TypeScript support for all events
- **Event debugging**: Built-in logging and history tracking
- **Event transformation**: Automatic normalization of events from different sources

## Event Flow Architecture

```
Socket.IO Events → Event Orchestrator → SimpleClient Events → Application
MediaSoup Events → Event Orchestrator → SimpleClient Events → Application
```

### 1. Event Sources

The system handles events from multiple sources:

- **Socket Events**: Real-time events from the server (participant joins/leaves, media state changes)
- **MediaSoup Events**: WebRTC media events (streams, producers, consumers)
- **Client Events**: High-level application events

### 2. Event Orchestrator

The `EventOrchestrator` class manages the flow and transformation of events:

```typescript
// Automatic initialization in SimpleClient
const client = new SimpleClient({
  serverUrl: "https://your-server.com",
  eventOrchestrator: {
    enableDebugLogging: true, // Enable console logging
    logEventDetails: true, // Log event payloads
    maxEventHistory: 100, // Keep event history for debugging
  },
});
```

### 3. Event Types

All events are type-safe with the `SimpleClientEvents` interface:

```typescript
export interface SimpleClientEvents {
  // Connection events
  connected: { connection: ConnectionInfo };
  disconnected: { reason?: string };
  error: { error: Error; code?: string };

  // Participant events
  participantJoined: { participant: ParticipantInfo };
  participantLeft: { participant: ParticipantInfo };

  // Media events
  localStreamReady: { stream: MediaStream };
  remoteStreamAdded: { stream: StreamInfo };
  remoteStreamRemoved: { streamId: string; participantId: string };

  // Audio/Video state events
  audioMuted: { participantId: string; isLocal: boolean };
  audioUnmuted: { participantId: string; isLocal: boolean };
  videoMuted: { participantId: string; isLocal: boolean };
  videoUnmuted: { participantId: string; isLocal: boolean };

  // Screen sharing events
  screenShareStarted: { participantId: string; stream?: MediaStream };
  screenShareStopped: { participantId: string };
}
```

## Usage Examples

### Basic Event Listening

```javascript
// Create client instance
const client = new SimpleClient({
  serverUrl: "https://your-server.com",
  enableAudio: true,
  enableVideo: true,
  autoConsume: true,
});

// Setup event listeners BEFORE connecting
client.addEventListener("connected", (event) => {
  const { connection } = event.detail;
  console.log(`Connected to ${connection.conferenceId}`);
});

client.addEventListener("participantJoined", (event) => {
  const { participant } = event.detail;
  console.log(`${participant.name} joined the conference`);
});

client.addEventListener("localStreamReady", (event) => {
  const { stream } = event.detail;
  document.getElementById("localVideo").srcObject = stream;
});

client.addEventListener("remoteStreamAdded", (event) => {
  const { stream } = event.detail;
  const video = document.createElement("video");
  video.srcObject = stream.stream;
  video.autoplay = true;
  document.getElementById("remoteVideos").appendChild(video);
});

// Connect to conference
await client.connect("conference-room", "participant-name");
```

### Advanced Event Debugging

```javascript
// Enable debug mode
client.setEventDebugMode(true, true); // (enabled, includeDetails)

// Get event statistics
const stats = client.getEventStats();
console.log("Active listeners:", stats.activeListeners);
console.log("Events processed:", stats.eventsSinceStart);

// Get event history for debugging
const history = client.getEventHistory();
console.log("Recent events:", history.slice(-10));
```

### Error Handling

```javascript
client.addEventListener("error", (event) => {
  const { error, code } = event.detail;

  switch (code) {
    case "CONNECTION_FAILED":
      console.error("Failed to connect to server:", error.message);
      break;
    case "MEDIA_ACCESS_FAILED":
      console.error("Failed to access camera/microphone:", error.message);
      break;
    case "MEDIASOUP_ERROR":
      console.error("WebRTC error:", error.message);
      break;
    default:
      console.error("Unknown error:", error.message);
  }
});
```

## Event Orchestrator Features

### 1. Event Transformation

The orchestrator automatically transforms events from different sources into a consistent format:

```typescript
// Socket event (raw)
{ participantId: "abc123", participantName: "John" }

// Transformed to SimpleClient event
{ participant: { id: "abc123", name: "John", isLocal: false } }
```

### 2. Event History

Track all events for debugging:

```javascript
// Get full event history
const history = client.getEventHistory();

// Example history entry
{
  timestamp: 1640995200000,
  source: 'socket',
  eventType: 'participantJoined -> participantJoined',
  detail: { participant: { id: '123', name: 'John' } },
  processed: true
}
```

### 3. Debug Logging

Enable comprehensive logging:

```javascript
// Enable debug logging
client.setEventDebugMode(true, true);

// Console output:
// [EventOrchestrator] 2024-01-01T12:00:00.000Z INFO: Registering event source: socket
// [EventOrchestrator] 2024-01-01T12:00:00.000Z SUCCESS: Successfully processed event: socket:participantJoined -> participantJoined
// [SimpleClient] Emitting event: participantJoined { participant: { ... } }
```

## Migration from Old Event System

### Before (Old System)

```javascript
// Old way using .on() method
client.on("connected", (event) => {
  // This won't work anymore
});
```

### After (New System)

```javascript
// New way using .addEventListener()
client.addEventListener("connected", (event) => {
  const { connection } = event.detail;
  // Works with full type safety
});
```

## Common Issues and Solutions

### 1. Events Not Firing

**Problem**: Event listeners added after connection

```javascript
// ❌ Wrong - events may be missed
await client.connect("room", "name");
client.addEventListener("participantJoined", handler); // Too late!
```

**Solution**: Add listeners before connecting

```javascript
// ✅ Correct - listeners ready before events
client.addEventListener("participantJoined", handler);
await client.connect("room", "name");
```

### 2. Missing Event Details

**Problem**: Accessing undefined properties

```javascript
client.addEventListener("connected", (event) => {
  console.log(event.connection); // ❌ undefined
});
```

**Solution**: Access via event.detail

```javascript
client.addEventListener("connected", (event) => {
  console.log(event.detail.connection); // ✅ Correct
});
```

### 3. Socket Events Not Working

**Problem**: SocketController event listeners not set up

The system automatically calls `socketController.setupEventListeners()` during connection. If socket events aren't working, check:

1. Server is sending the events
2. Event orchestrator is properly initialized
3. Debug logging is enabled to see if events are being received

## Performance Considerations

### Event History Limit

The event orchestrator keeps a history of events for debugging. By default, it stores the last 100 events. For production, consider reducing this:

```javascript
const client = new SimpleClient({
  serverUrl: "https://your-server.com",
  eventOrchestrator: {
    enableDebugLogging: false, // Disable in production
    maxEventHistory: 20, // Reduce memory usage
  },
});
```

### Memory Management

Always disconnect properly to clean up event listeners:

```javascript
// Clean disconnection
await client.disconnect();
// This automatically calls eventOrchestrator.cleanup()
```

## Debugging Tips

1. **Enable Debug Logging**: Always start with debug mode when troubleshooting
2. **Check Event History**: Use `client.getEventHistory()` to see what events were processed
3. **Verify Event Stats**: Use `client.getEventStats()` to confirm listeners are registered
4. **Console Network Tab**: Check if WebSocket events are being received from server
5. **Browser DevTools**: Set breakpoints in event handlers to debug event flow

This enhanced event system provides robust, type-safe, and debuggable event handling for the Simple MediaSoup client.
