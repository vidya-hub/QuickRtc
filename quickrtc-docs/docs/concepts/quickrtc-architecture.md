---
sidebar_position: 2
---

# QuickRTC Architecture

QuickRTC is a high-level abstraction over mediasoup that simplifies WebRTC conferencing. This guide explains how QuickRTC works and how it differs from raw mediasoup.

## The Problem QuickRTC Solves

Using mediasoup directly requires managing many low-level details:

```mermaid
graph TB
    subgraph "Raw mediasoup (Complex)"
        direction TB
        R1["1. Create Workers and manage lifecycle"]
        R2["2. Create Routers for each room"]
        R3["3. Create WebRTC Transports for each participant"]
        R4["4. Handle ICE/DTLS connection for each transport"]
        R5["5. Create Producers when someone shares media"]
        R6["6. Notify other participants about new producers"]
        R7["7. Create Consumers for each participant × producer"]
        R8["8. Handle participant disconnect and cleanup"]
        R9["9. Manage RTP capabilities negotiation"]
        R10["10. Handle errors and reconnection"]
        
        R1 --> R2 --> R3 --> R4 --> R5 --> R6 --> R7 --> R8 --> R9 --> R10
    end
```

> **~500-1000 lines of boilerplate code required!**

```mermaid
graph TB
    subgraph "QuickRTC (Simple)"
        direction TB
        Q1["1. Create QuickRTCServer"]
        Q2["2. Create QuickRTC client"]
        Q3["3. Call join() and produce()"]
        Q4["4. Listen to events"]
        
        Q1 --> Q2 --> Q3 --> Q4
    end
```

> **~50 lines of code. That's it!**

## Architecture Overview

```mermaid
graph TB
    subgraph "YOUR APPLICATION"
        REACT["React App<br/>useQuickRTC()"]
        EXPRESS["Express Server<br/>QuickRTCServer"]
    end
    
    subgraph "QUICKRTC LAYER"
        CLIENT["QuickRTC<br/>(Client SDK)<br/>• join()<br/>• produce()<br/>• leave()"]
        SERVER["QuickRTCServer<br/>(Server SDK)<br/>• Conferences<br/>• Participants<br/>• Auto-consume"]
        
        CLIENT <-->|"Socket.IO"| SERVER
    end
    
    subgraph "MEDIASOUP LAYER"
        MSCLIENT["mediasoup-client<br/>• Device<br/>• Transports<br/>• Producers<br/>• Consumers"]
        MSSERVER["mediasoup<br/>• Workers<br/>• Routers<br/>• Transports<br/>• Producers<br/>• Consumers"]
        
        MSCLIENT <-->|"RTP Media"| MSSERVER
    end
    
    REACT --> CLIENT
    EXPRESS --> SERVER
    CLIENT --> MSCLIENT
    SERVER --> MSSERVER
```

## Package Structure

QuickRTC consists of three packages:

```mermaid
graph TB
    subgraph "quickrtc-server"
        SRV["<b>Server SDK</b><br/><br/>• Wraps mediasoup server<br/>• Manages Workers, Routers, Transports<br/>• Handles Socket.IO signaling<br/>• Auto-creates consumers<br/>• Conference & Participant management<br/><br/><code>npm install quickrtc-server</code>"]
    end
    
    subgraph "quickrtc-client"
        CLI["<b>Client SDK</b><br/><br/>• Wraps mediasoup-client<br/>• Simple join/produce/leave API<br/>• Event-driven architecture<br/>• Auto-receives remote streams<br/>• Works with any framework<br/><br/><code>npm install quickrtc-client</code>"]
    end
    
    subgraph "quickrtc-react-client"
        RCT["<b>React SDK</b><br/><br/>• React hooks: useQuickRTC()<br/>• Manages QuickRTC lifecycle<br/>• Reactive state updates<br/>• TypeScript support<br/><br/><code>npm install quickrtc-react-client</code>"]
    end
```

## Data Flow

### Join Conference Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    
    Client->>Server: 1. rtc.join({ conferenceId, participantName })
    Note right of Server: Find or create Conference<br/>Create Participant<br/>Get Router capabilities
    Server->>Client: "joined" { participantId, rtpCapabilities, existingParticipants }
    
    Note left of Client: 3. Load Device with RTP capabilities
    
    Client->>Server: "createTransport" (send)
    Note right of Server: 4. Create WebRtcTransport
    Server->>Client: transport params
    
    Client->>Server: "createTransport" (recv)
    Note right of Server: 5. Create WebRtcTransport
    Server->>Client: transport params
    
    Client->>Server: "connectTransport" (DTLS params)
    Note right of Server: 6. Connect transports
    
    Note over Client,Server: 7. Ready to produce/consume
    
    Server-->>Client: "newParticipant" (to other participants)
```

### Produce Media Flow

```mermaid
sequenceDiagram
    participant Alice as Alice (Client)
    participant Server
    participant Bob
    
    Alice-->>Alice: 1. getUserMedia()<br/>tracks = [videoTrack, audioTrack]
    
    Alice->>Server: 2. rtc.produce(tracks)<br/>"produce" { kind: "video", rtpParameters }
    Note right of Server: 3. Create Producer on Router
    Server->>Alice: producer.id
    
    Alice-)Server: RTP Media flows
    
    Server->>Bob: "newProducer" { producerId, participantId, kind }
    
    Note right of Bob: 4. Auto-consume
    Bob->>Server: "consume" (producer id)
    Note right of Server: 5. Create Consumer for Bob
    Server->>Bob: consumer params
    
    Server-)Bob: RTP Media flows
    
    Note right of Bob: 6. Fire "streamAdded" event
```

### Auto-Consume Feature

QuickRTC automatically creates consumers when new producers appear. You just listen to events:

```mermaid
graph TB
    subgraph "SERVER"
        ALICE_PROD["Alice Producer<br/>(video)"]
        
        ALICE_PROD --> AUTO["Server automatically creates<br/>consumers for ALL other participants"]
        
        AUTO --> BOB_CON["Bob Consumer"]
        AUTO --> CHARLIE_CON["Charlie Consumer"]
        AUTO --> DAVE_CON["Dave Consumer"]
    end
    
    subgraph "CLIENTS"
        BOB_CON --> BOB["Bob<br/>Receives 'streamAdded'<br/>with Alice's video"]
        CHARLIE_CON --> CHARLIE["Charlie<br/>Receives 'streamAdded'<br/>with Alice's video"]
        DAVE_CON --> DAVE["Dave<br/>Receives 'streamAdded'<br/>with Alice's video"]
    end
```

> **No manual subscription needed!**

## Event System

QuickRTC uses an event-driven architecture:

```mermaid
graph LR
    subgraph "Client Events"
        NP["newParticipant"] --> NPD["{ participantId, participantName,<br/>streams: [MediaStream, ...] }"]
        SA["streamAdded"] --> SAD["{ participantId, participantName,<br/>type, stream: MediaStream }"]
        SR["streamRemoved"] --> SRD["{ participantId, streamId, type }"]
        PL["participantLeft"] --> PLD["{ participantId }"]
        LSE["localStreamEnded"] --> LSED["{ streamId, type }<br/>(e.g., user clicked 'Stop sharing')"]
    end
```

```mermaid
graph LR
    subgraph "Server Events"
        PJ["participantJoined"] --> PJD["{ conferenceId, participant }"]
        PL2["participantLeft"] --> PLD2["{ conferenceId, participantId }"]
        PA["producerAdded"] --> PAD["{ conferenceId, participantId,<br/>producerId, kind }"]
    end
```

## LocalStream Controls

When you produce media, you get back LocalStream objects with built-in controls:

```typescript
const streams = await rtc.produce(tracks);

streams.forEach(stream => {
  console.log(stream.id);      // Unique stream ID
  console.log(stream.type);    // "audio" | "video" | "screenshare"
  console.log(stream.stream);  // MediaStream object
  console.log(stream.track);   // MediaStreamTrack

  // Controls
  stream.pause();   // Pause sending (receivers see frozen frame)
  stream.resume();  // Resume sending
  stream.stop();    // Stop completely (removes producer)
});
```

```mermaid
stateDiagram-v2
    [*] --> SENDING: produce()
    SENDING --> PAUSED: pause()
    PAUSED --> SENDING: resume()
    SENDING --> STOPPED: stop()
    PAUSED --> STOPPED: stop()
    STOPPED --> [*]
    
    SENDING: Media flows
    PAUSED: No media flows
    STOPPED: Removed
```

## Complete Integration Example

```mermaid
graph TB
    subgraph "SERVER SETUP"
        S1["const io = new Server(httpServer);"]
        S2["const quickrtc = new QuickRTCServer({<br/>  httpServer,<br/>  socketServer: io,<br/>});"]
        S3["await quickrtc.start();"]
        S4["// That's it! Server handles everything"]
        
        S1 --> S2 --> S3 --> S4
    end
    
    subgraph "CLIENT SETUP"
        C1["// 1. Connect<br/>const socket = io('https://server.com');<br/>const rtc = new QuickRTC({ socket });"]
        C2["// 2. Listen for remote participants<br/>rtc.on('newParticipant', ...);<br/>rtc.on('streamAdded', ...);"]
        C3["// 3. Join room<br/>await rtc.join({<br/>  conferenceId: 'room-123',<br/>  participantName: 'Alice'<br/>});"]
        C4["// 4. Share camera<br/>const media = await getUserMedia(...);<br/>await rtc.produce(media.getTracks());"]
        C5["// 5. Leave when done<br/>await rtc.leave();"]
        
        C1 --> C2 --> C3 --> C4 --> C5
    end
```

## QuickRTC vs Raw mediasoup

| Feature              | Raw mediasoup    | QuickRTC              |
| -------------------- | ---------------- | --------------------- |
| Lines of code        | 500-1000         | 50-100                |
| Transport management | Manual           | Automatic             |
| Consumer creation    | Manual           | Automatic             |
| Event handling       | Low-level        | High-level            |
| Learning curve       | Steep            | Gentle                |
| Flexibility          | Maximum          | Opinionated           |
| Use case             | Custom solutions | Standard conferencing |

## When to Use QuickRTC

**Use QuickRTC when:**

- Building standard video conferencing
- You want rapid development
- You don't need custom media routing
- You're building with React

**Use raw mediasoup when:**

- You need custom routing logic
- Building broadcast/streaming apps
- You need fine-grained control
- Building non-standard WebRTC apps

## Next Steps

- [Getting Started](/docs/getting-started) - Build your first app
- [Understanding mediasoup](/docs/concepts/mediasoup) - Learn the underlying technology
- [React Integration](/docs/react/overview) - Use with React
