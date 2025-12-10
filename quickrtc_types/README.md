# quickrtc-types

Shared TypeScript types for QuickRTC client and server packages.

## Installation

```bash
npm install quickrtc-types
```

## Usage

```typescript
import {
  // Core types
  MediasoupConfig,
  Conference,
  Participant,
  
  // Transport types
  CreateTransportParams,
  ConnectTransportParams,
  ProduceParams,
  ConsumeParams,
  ConsumerParams,
  
  // Socket event types
  SocketEventType,
  SocketEventData,
  ClientToServerEvents,
  ServerToClientEvents,
  
  // Client types
  JoinConferenceRequest,
  JoinConferenceResponse,
  ParticipantJoinedData,
  ParticipantLeftData,
  NewProducerData,
  ProducerClosedData,
} from "quickrtc-types";
```

## Core Types

### MediasoupConfig

```typescript
interface MediasoupConfig {
  workerSettings: WorkerSettings;
  routerOptions: RouterOptions;
  transportOptions: WebRtcTransportOptions;
  webRtcServerOptions: WebRtcServerOptions;
}
```

### Conference & Participant

```typescript
interface Conference {
  conferenceId: string;
  conferenceName?: string;
  participants: Map<string, Participant>;
  router: Router;
}

interface Participant {
  participantId: string;
  participantName: string;
  socketId: string;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  sendTransport?: Transport;
  recvTransport?: Transport;
}
```

## Transport Types

### ProduceParams

```typescript
interface ProduceParams {
  conferenceId: string;
  participantId: string;
  transportId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  streamType?: "audio" | "video" | "screenshare";
}
```

### ConsumerParams

```typescript
interface ConsumerParams {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  streamType?: "audio" | "video" | "screenshare";
}
```

## Socket Event Types

### Server to Client Events

```typescript
interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  participantJoined: (data: ParticipantJoinedData) => void;
  participantLeft: (data: ParticipantLeftData) => void;
  newProducer: (data: NewProducerData) => void;
  producerClosed: (data: ProducerClosedData) => void;
  consumerClosed: (data: ConsumerClosedData) => void;
  audioMuted: (data: MediaMutedData) => void;
  audioUnmuted: (data: MediaMutedData) => void;
  videoMuted: (data: MediaMutedData) => void;
  videoUnmuted: (data: MediaMutedData) => void;
}
```

### Client to Server Events

```typescript
interface ClientToServerEvents {
  joinConference: (data, callback) => void;
  leaveConference: (data, callback) => void;
  createTransport: (data, callback) => void;
  connectTransport: (data, callback) => void;
  produce: (data, callback) => void;
  consume: (data, callback) => void;
  pauseProducer: (data, callback) => void;
  resumeProducer: (data, callback) => void;
  closeProducer: (data, callback) => void;
  closeConsumer: (data, callback) => void;
  consumeParticipantMedia: (data, callback) => void;
  getParticipants: (data, callback) => void;
}
```

## Event Data Types

### ParticipantJoinedData

```typescript
interface ParticipantJoinedData {
  participantId: string;
  participantName: string;
  conferenceId: string;
}
```

### NewProducerData

```typescript
interface NewProducerData {
  producerId: string;
  participantId: string;
  participantName: string;
  kind: MediaKind;
  streamType?: "audio" | "video" | "screenshare";
}
```

### ProducerClosedData

```typescript
interface ProducerClosedData {
  participantId: string;
  producerId: string;
  kind: "audio" | "video";
}
```

## Stream Types

QuickRTC uses `streamType` to differentiate media sources:

| Type | Description |
|------|-------------|
| `audio` | Microphone audio |
| `video` | Camera video |
| `screenshare` | Screen/window capture |

## Peer Dependencies

- `mediasoup ^3.19.0`
- `socket.io ^4.8.0`

## License

ISC
