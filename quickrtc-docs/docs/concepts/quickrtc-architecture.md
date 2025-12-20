---
sidebar_position: 2
---

# QuickRTC Architecture

QuickRTC is a high-level abstraction over mediasoup that simplifies WebRTC conferencing. This guide explains how QuickRTC works and how it differs from raw mediasoup.

## The Problem QuickRTC Solves

Using mediasoup directly requires managing many low-level details:

```
┌───────────────────────────────────────────────────────────────────┐
│                     Raw mediasoup (Complex)                       │
│                                                                   │
│   You must manually:                                              │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │  1. Create Workers and manage their lifecycle             │   │
│   │  2. Create Routers for each room                          │   │
│   │  3. Create WebRTC Transports for each participant         │   │
│   │  4. Handle ICE/DTLS connection for each transport         │   │
│   │  5. Create Producers when someone shares media            │   │
│   │  6. Notify other participants about new producers         │   │
│   │  7. Create Consumers for each participant × each producer │   │
│   │  8. Handle participant disconnect and cleanup             │   │
│   │  9. Manage RTP capabilities negotiation                   │   │
│   │  10. Handle errors and reconnection                       │   │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│   ~500-1000 lines of boilerplate code                             │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      QuickRTC (Simple)                            │
│                                                                   │
│   You just:                                                       │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │  1. Create QuickRTCServer                                 │   │
│   │  2. Create QuickRTC client                                │   │
│   │  3. Call join() and produce()                             │   │
│   │  4. Listen to events                                      │   │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│   ~50 lines of code                                               │
└───────────────────────────────────────────────────────────────────┘
```

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                      QuickRTC Architecture                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                      YOUR APPLICATION                       │  │
│  │                                                             │  │
│  │   ┌───────────────┐              ┌───────────────┐          │  │
│  │   │   React App   │              │ Express Server│          │  │
│  │   │               │              │               │          │  │
│  │   │ useQuickRTC() │              │ QuickRTCServer│          │  │
│  │   └───────┬───────┘              └───────┬───────┘          │  │
│  └───────────┼──────────────────────────────┼──────────────────┘  │
│              │                              │                     │
│  ┌───────────┼──────────────────────────────┼──────────────────┐  │
│  │           │       QUICKRTC LAYER         │                  │  │
│  │           ▼                              ▼                  │  │
│  │   ┌───────────────┐              ┌───────────────┐          │  │
│  │   │   QuickRTC    │◄────────────►│ QuickRTCServer│          │  │
│  │   │ (Client SDK)  │   Socket.IO  │  (Server SDK) │          │  │
│  │   │               │              │               │          │  │
│  │   │ • join()      │              │ • Conferences │          │  │
│  │   │ • produce()   │              │ • Participants│          │  │
│  │   │ • leave()     │              │ • Auto-consume│          │  │
│  │   └───────┬───────┘              └───────┬───────┘          │  │
│  └───────────┼──────────────────────────────┼──────────────────┘  │
│              │                              │                     │
│  ┌───────────┼──────────────────────────────┼──────────────────┐  │
│  │           │       MEDIASOUP LAYER        │                  │  │
│  │           ▼                              ▼                  │  │
│  │   ┌───────────────┐              ┌───────────────┐          │  │
│  │   │mediasoup-clnt │◄═══ RTP ════►│   mediasoup   │          │  │
│  │   │               │              │               │          │  │
│  │   │ • Device      │              │ • Workers     │          │  │
│  │   │ • Transports  │              │ • Routers     │          │  │
│  │   │ • Producers   │              │ • Transports  │          │  │
│  │   │ • Consumers   │              │ • Producers   │          │  │
│  │   └───────────────┘              │ • Consumers   │          │  │
│  │                                  └───────────────┘          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## Package Structure

QuickRTC consists of three packages:

```
┌───────────────────────────────────────────────────────────────────┐
│                       QuickRTC Packages                           │
│                                                                   │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │                    quickrtc-server                        │   │
│   │                    ════════════════                       │   │
│   │                                                           │   │
│   │   • Wraps mediasoup server                                │   │
│   │   • Manages Workers, Routers, Transports                  │   │
│   │   • Handles Socket.IO signaling                           │   │
│   │   • Auto-creates consumers for new producers              │   │
│   │   • Conference and Participant management                 │   │
│   │                                                           │   │
│   │   npm install quickrtc-server                             │   │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │                    quickrtc-client                        │   │
│   │                    ═══════════════                        │   │
│   │                                                           │   │
│   │   • Wraps mediasoup-client                                │   │
│   │   • Simple join/produce/leave API                         │   │
│   │   • Event-driven architecture                             │   │
│   │   • Auto-receives remote streams                          │   │
│   │   • Works with any framework                              │   │
│   │                                                           │   │
│   │   npm install quickrtc-client                             │   │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │                  quickrtc-react-client                    │   │
│   │                  ═════════════════════                    │   │
│   │                                                           │   │
│   │   • React hooks: useQuickRTC()                            │   │
│   │   • Manages QuickRTC lifecycle                            │   │
│   │   • Reactive state updates                                │   │
│   │   • TypeScript support                                    │   │
│   │                                                           │   │
│   │   npm install quickrtc-react-client                       │   │
│   └───────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Join Conference Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                      Join Conference Flow                         │
│                                                                   │
│   Client                          Server                          │
│     │                               │                             │
│     │  1. rtc.join({                │                             │
│     │       conferenceId,           │                             │
│     │       participantName         │                             │
│     │     })                        │                             │
│     │                               │                             │
│     │ ─────── "join" ─────────────► │                             │
│     │                               │  2. Find or create Conference│
│     │                               │     Create Participant      │
│     │                               │     Get Router capabilities │
│     │                               │                             │
│     │ ◄─────── "joined" ─────────── │                             │
│     │         {                     │                             │
│     │           participantId,      │                             │
│     │           rtpCapabilities,    │                             │
│     │           existingParticipants│                             │
│     │         }                     │                             │
│     │                               │                             │
│     │  3. Load Device with          │                             │
│     │     RTP capabilities          │                             │
│     │                               │                             │
│     │ ─── "createTransport" ──────► │                             │
│     │     (send)                    │  4. Create WebRtcTransport  │
│     │ ◄─── transport params ─────── │                             │
│     │                               │                             │
│     │ ─── "createTransport" ──────► │                             │
│     │     (recv)                    │  5. Create WebRtcTransport  │
│     │ ◄─── transport params ─────── │                             │
│     │                               │                             │
│     │ ─── "connectTransport" ─────► │                             │
│     │     (DTLS params)             │  6. Connect transports      │
│     │                               │                             │
│     │  7. Ready to produce/consume  │                             │
│     │                               │                             │
│     │ ◄─── "newParticipant" ─────── │  8. Notify others about     │
│     │      (to other participants)  │     new participant         │
│     │                               │                             │
└───────────────────────────────────────────────────────────────────┘
```

### Produce Media Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                      Produce Media Flow                           │
│                                                                   │
│   Alice (Client)                  Server                 Bob      │
│     │                               │                     │       │
│     │  1. getUserMedia()            │                     │       │
│     │     ↓                         │                     │       │
│     │  tracks = [videoTrack,        │                     │       │
│     │            audioTrack]        │                     │       │
│     │                               │                     │       │
│     │  2. rtc.produce(tracks)       │                     │       │
│     │                               │                     │       │
│     │ ─── "produce" ──────────────► │                     │       │
│     │     {                         │                     │       │
│     │       kind: "video",          │  3. Create Producer │       │
│     │       rtpParameters           │     on Router       │       │
│     │     }                         │                     │       │
│     │                               │                     │       │
│     │ ◄─── producer.id ──────────── │                     │       │
│     │                               │                     │       │
│     │ ════ RTP media flows ════════►│                     │       │
│     │                               │                     │       │
│     │                               │ ── "newProducer" ──►│       │
│     │                               │    {producerId,     │       │
│     │                               │     participantId,  │       │
│     │                               │     kind}           │       │
│     │                               │                     │       │
│     │                               │                     │ 4.Auto│
│     │                               │ ◄── "consume" ───── │consume│
│     │                               │                     │       │
│     │                               │  5. Create Consumer │       │
│     │                               │     for Bob         │       │
│     │                               │                     │       │
│     │                               │ ── consumer params ►│       │
│     │                               │                     │       │
│     │                               │ ════ RTP media ════►│       │
│     │                               │                     │       │
│     │                               │                     │6.Fire │
│     │                               │                     │"stream│
│     │                               │                     │Added" │
│     │                               │                     │       │
└───────────────────────────────────────────────────────────────────┘
```

### Auto-Consume Feature

QuickRTC automatically creates consumers when new producers appear. You just listen to events:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Auto-Consume Architecture                          │
│                                                                         │
│                           SERVER                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                 │   │
│   │   When Alice produces:                                          │   │
│   │                                                                 │   │
│   │   ┌──────────────┐                                              │   │
│   │   │Alice Producer│                                              │   │
│   │   │  (video)     │                                              │   │
│   │   └──────┬───────┘                                              │   │
│   │          │                                                      │   │
│   │          │  Server automatically creates                        │   │
│   │          │  consumers for ALL other participants                │   │
│   │          │                                                      │   │
│   │          ├──────────────────┬──────────────────┐                │   │
│   │          │                  │                  │                │   │
│   │          ▼                  ▼                  ▼                │   │
│   │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │   │
│   │   │ Bob Consumer │   │Charl Consumer│   │Dave Consumer │        │   │
│   │   └──────────────┘   └──────────────┘   └──────────────┘        │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                          CLIENTS                                        │
│                                                                         │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│   │     Bob     │    │   Charlie   │    │    Dave     │                 │
│   │             │    │             │    │             │                 │
│   │ Receives    │    │ Receives    │    │ Receives    │                 │
│   │ "streamAdd" │    │ "streamAdd" │    │ "streamAdd" │                 │
│   │ event with  │    │ event with  │    │ event with  │                 │
│   │ Alice's     │    │ Alice's     │    │ Alice's     │                 │
│   │ video       │    │ video       │    │ video       │                 │
│   └─────────────┘    └─────────────┘    └─────────────┘                 │
│                                                                         │
│   No manual subscription needed!                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Event System

QuickRTC uses an event-driven architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        QuickRTC Events                                  │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     Client Events                               │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐     When someone joins with media         │   │
│   │   │ newParticipant  │────► { participantId, participantName,    │   │
│   │   └─────────────────┘        streams: [MediaStream, ...] }      │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐     When existing participant adds stream │   │
│   │   │   streamAdded   │────► { participantId, participantName,    │   │
│   │   └─────────────────┘        type, stream: MediaStream }        │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐     When a stream is removed              │   │
│   │   │  streamRemoved  │────► { participantId, streamId, type }    │   │
│   │   └─────────────────┘                                           │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐     When someone leaves                   │   │
│   │   │ participantLeft │────► { participantId }                    │   │
│   │   └─────────────────┘                                           │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐     When your local stream ends           │   │
│   │   │localStreamEnded │────► { streamId, type }                   │   │
│   │   └─────────────────┘       (e.g., user clicked "Stop sharing") │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     Server Events                               │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐                                           │   │
│   │   │participantJoined│────► { conferenceId, participant }        │   │
│   │   └─────────────────┘                                           │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐                                           │   │
│   │   │ participantLeft │────► { conferenceId, participantId }      │   │
│   │   └─────────────────┘                                           │   │
│   │                                                                 │   │
│   │   ┌─────────────────┐                                           │   │
│   │   │  producerAdded  │────► { conferenceId, participantId,       │   │
│   │   └─────────────────┘        producerId, kind }                 │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## LocalStream Controls

When you produce media, you get back LocalStream objects with built-in controls:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LocalStream API                                    │
│                                                                         │
│   const streams = await rtc.produce(tracks);                            │
│                                                                         │
│   streams.forEach(stream => {                                           │
│     console.log(stream.id);      // Unique stream ID                    │
│     console.log(stream.type);    // "audio" | "video" | "screenshare"   │
│     console.log(stream.stream);  // MediaStream object                  │
│     console.log(stream.track);   // MediaStreamTrack                    │
│                                                                         │
│     // Controls                                                         │
│     stream.pause();   // Pause sending (receivers see frozen frame)     │
│     stream.resume();  // Resume sending                                 │
│     stream.stop();    // Stop completely (removes producer)             │
│   });                                                                   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                   Stream Lifecycle                              │   │
│   │                                                                 │   │
│   │   produce()         pause()           resume()         stop()   │   │
│   │      │                 │                 │               │      │   │
│   │      ▼                 ▼                 ▼               ▼      │   │
│   │  ┌────────┐       ┌────────┐       ┌────────┐      ┌────────┐   │   │
│   │  │SENDING │──────►│PAUSED  │──────►│SENDING │─────►│STOPPED │   │   │
│   │  │        │       │        │       │        │      │        │   │   │
│   │  │Media   │       │No media│       │Media   │      │Removed │   │   │
│   │  │flows   │       │flows   │       │flows   │      │        │   │   │
│   │  └────────┘       └────────┘       └────────┘      └────────┘   │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Complete Integration Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   Complete Integration Flow                             │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                         SERVER                                  │   │
│   │                                                                 │   │
│   │   const io = new Server(httpServer);                            │   │
│   │   const quickrtc = new QuickRTCServer({                         │   │
│   │     httpServer,                                                 │   │
│   │     socketServer: io,                                           │   │
│   │   });                                                           │   │
│   │   await quickrtc.start();                                       │   │
│   │                                                                 │   │
│   │   // That's it! Server handles everything automatically         │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                         CLIENT                                  │   │
│   │                                                                 │   │
│   │   // 1. Connect                                                 │   │
│   │   const socket = io("https://server.com");                      │   │
│   │   const rtc = new QuickRTC({ socket });                         │   │
│   │                                                                 │   │
│   │   // 2. Listen for remote participants                          │   │
│   │   rtc.on("newParticipant", ({ participantName, streams }) => {  │   │
│   │     streams.forEach(s => attachToVideo(s.stream));              │   │
│   │   });                                                           │   │
│   │                                                                 │   │
│   │   rtc.on("streamAdded", ({ stream }) => {                       │   │
│   │     attachToVideo(stream);                                      │   │
│   │   });                                                           │   │
│   │                                                                 │   │
│   │   // 3. Join room                                               │   │
│   │   await rtc.join({                                              │   │
│   │     conferenceId: "room-123",                                   │   │
│   │     participantName: "Alice"                                    │   │
│   │   });                                                           │   │
│   │                                                                 │   │
│   │   // 4. Share camera                                            │   │
│   │   const media = await navigator.mediaDevices.getUserMedia({     │   │
│   │     video: true, audio: true                                    │   │
│   │   });                                                           │   │
│   │   await rtc.produce(media.getTracks());                         │   │
│   │                                                                 │   │
│   │   // 5. Leave when done                                         │   │
│   │   await rtc.leave();                                            │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
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
