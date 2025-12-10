# QuickRTC

Simple WebRTC video conferencing built on MediaSoup.

## Packages

| Package | Description |
|---------|-------------|
| `quickrtc-server` | MediaSoup server with auto conference management |
| `quickrtc-client` | Browser client library |
| `quickrtc-react-client` | React hooks + Redux integration |
| `quickrtc-flutter-client` | Flutter client library |
| `quickrtc-types` | Shared TypeScript types |

## Quick Start

```bash
cd quickrtc-example
npm run setup
npm run dev
```

- Server: https://localhost:3000
- Client: https://localhost:5173

## Server

```typescript
import { QuickRTCServer } from "quickrtc-server";

const server = new QuickRTCServer({ httpServer, socketServer });
await server.start();
```

## Client

```typescript
import { ConferenceClient } from "quickrtc-client";

const client = new ConferenceClient({
  conferenceId: "room-1",
  participantId: "user-1",
  participantName: "John",
  socket,
});

await client.joinMeeting();
await client.produceMedia(audioTrack, videoTrack);
```

## Production

- Use HTTPS (required for WebRTC)
- Open ports: `3443/tcp`, `40000-49999/udp`

## License

MIT
