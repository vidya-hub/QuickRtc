# quickrtc-types

Shared TypeScript types for QuickRTC client and server.

## Installation

```bash
npm install quickrtc-types
```

## Usage

```typescript
import {
  MediasoupConfig,
  JoinConferenceParams,
  CreateTransportParams,
  SocketEventData,
} from "quickrtc-types";
```

## Main Types

- `MediasoupConfig` - Server configuration
- `Conference`, `Participant` - Core entities
- `CreateTransportParams`, `ProduceParams`, `ConsumeParams` - Transport operations
- `SocketEventType`, `SocketEventData` - Socket communication
- `ClientConfig`, `ClientConnectionState` - Client types

## Peer Dependencies

- `mediasoup ^3.19.0`
- `socket.io ^4.8.0`

## License

ISC
