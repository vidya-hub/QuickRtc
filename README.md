# QuickRTC

Simple WebRTC video conferencing built on MediaSoup.

## Packages

| Package                   | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `quickrtc-server`         | MediaSoup server with auto conference management |
| `quickrtc-client`         | Vanilla JavaScript browser client                |
| `quickrtc-react-client`   | React hooks with Redux state management          |
| `quickrtc-flutter-client` | Flutter client with Provider state management    |
| `quickrtc-types`          | Shared TypeScript types                          |

## Quick Start

```bash
cd quickrtc-example
npm run setup
npm run dev
```

- Server: https://localhost:3000
- Client: https://localhost:5173

## Server Setup

```typescript
import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const server = new QuickRTCServer({ httpServer, socketServer: io });
await server.start();

httpServer.listen(3000);
```

## React Client

```tsx
import { QuickRTCProvider, useQuickRTC } from "quickrtc-react-client";
import { io } from "socket.io-client";

function App() {
  const {
    isJoined,
    localStreams,
    remoteParticipants,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    watchAllParticipants,
    hasAudio,
    hasVideo,
    hasScreenShare,
  } = useQuickRTC();

  const handleJoin = async () => {
    const socket = io("https://localhost:3000");
    await join({ conferenceId: "room-1", participantName: "Alice", socket });
    await toggleAudio();
    await toggleVideo();
    await watchAllParticipants();
  };

  if (!isJoined) return <button onClick={handleJoin}>Join</button>;

  return (
    <div>
      <button onClick={toggleAudio}>{hasAudio ? "Mute" : "Unmute"}</button>
      <button onClick={toggleVideo}>{hasVideo ? "Stop" : "Start"} Video</button>
      <button onClick={toggleScreenShare}>
        {hasScreenShare ? "Stop" : "Share"}
      </button>
      <button onClick={leave}>Leave</button>

      {localStreams.map((s) => (
        <video
          key={s.id}
          ref={(el) => el && (el.srcObject = s.stream)}
          autoPlay
          muted
          playsInline
        />
      ))}

      {remoteParticipants.map((p) => (
        <div key={p.participantId}>
          <p>{p.participantName}</p>
          {p.streams?.map((s) => (
            <video
              key={s.id}
              ref={(el) => el && (el.srcObject = s.stream)}
              autoPlay
              playsInline
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Wrap with provider
<QuickRTCProvider>
  <App />
</QuickRTCProvider>;
```

## Vanilla JavaScript Client

```typescript
import { ConferenceClient } from "quickrtc-client";
import { io } from "socket.io-client";

const socket = io("https://localhost:3000");
const client = new ConferenceClient({
  conferenceId: "room-1",
  participantId: "user-1",
  participantName: "John",
  socket,
});

await client.joinMeeting();

const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});
await client.produceMedia(
  stream.getAudioTracks()[0],
  stream.getVideoTracks()[0],
);
await client.consumeExistingStreams();

// Screen sharing
const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
await client.produceMedia(undefined, screen.getVideoTracks()[0], "screenshare");
```

## Flutter Client

### Installation

```yaml
dependencies:
  quickrtc_flutter_client: 
```

### Usage

import 'package:quickrtc_flutter_client/quickrtc_flutter_client.dart';

// Wrap app with provider
QuickRTCProviderWidget(child: MyApp())

// In your widget
final provider = Provider.of<ConferenceProvider>(context);

await provider.joinConference(ConferenceConfig(
conferenceId: 'room-1',
participantId: 'user-1',
participantName: 'John',
socket: socket,
));

await provider.produceMedia(
audioTrack: tracks.getAudioTracks().first,
videoTrack: tracks.getVideoTracks().first,
);

````

## Features

- **Multi-stream support** - Camera + screen share simultaneously
- **Auto stream consumption** - New participants auto-connect
- **Cross-platform** - Web, React, Flutter clients
- **TypeScript** - Full type safety
- **Simple API** - Join, produce, consume in few lines

## Production Deployment

1. **HTTPS Required** - WebRTC requires secure context
2. **Configure Public IP**:
   ```typescript
   new QuickRTCServer({
     httpServer,
     socketServer,
     quickrtcConfig: {
       webRtcServerOptions: {
         listenInfos: [{ ip: "0.0.0.0", announcedIp: "YOUR_PUBLIC_IP" }],
       },
     },
   });
````

3. **Open Ports**:
   - `443/tcp` - HTTPS/WebSocket
   - `40000-49999/udp` - WebRTC media

## License

MIT
