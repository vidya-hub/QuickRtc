# QuickRTC Example

Complete video conferencing example with Express backend and React frontend.

## Quick Start

```bash
npm run setup   # Generate SSL certs and install dependencies
npm run dev     # Start server and client
```

- Server: https://localhost:3000
- Client: https://localhost:5173

Accept the self-signed certificate warning in your browser.

## Project Structure

```
quickrtc-example/
├── server/                 # Express + QuickRTC server
│   └── src/
│       └── index.ts       # Server entry point
├── client/                 # Vite + React client
│   └── src/
│       ├── App.tsx        # Main app component
│       └── components/    # UI components
│           ├── VideoTile.tsx      # Single participant video
│           ├── VideoGrid.tsx      # Grid of all participants
│           ├── ControlBar.tsx     # Media control buttons
│           ├── ConferenceRoom.tsx # In-call view
│           ├── JoinForm.tsx       # Join conference form
│           └── LoadingScreen.tsx  # Connecting state
└── certs/                 # SSL certificates (generated)
```

## Client Components

### App.tsx
Main component handling conference lifecycle:
- Join form -> Connecting -> In-call

### VideoTile
Displays a single participant's video/audio:
- Camera video as primary view
- Screen share as primary with camera overlay
- Avatar placeholder when no video

### VideoGrid
Responsive grid of all participants:
- Local user tile (muted)
- Remote participant tiles

### ControlBar
Media control buttons:
- Mute/Unmute audio
- Start/Stop video
- Start/Stop screen share
- Leave conference

## Server Code

```typescript
import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";
import fs from "fs";

const app = express();
const httpsServer = createServer({
  key: fs.readFileSync("../certs/key.pem"),
  cert: fs.readFileSync("../certs/cert.pem"),
}, app);

const io = new Server(httpsServer, {
  cors: { origin: "*" }
});

const quickrtc = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer: io,
});

await quickrtc.start();
httpsServer.listen(3000);
```

## Client Code

```tsx
import { useQuickRTC, QuickRTCProvider } from "quickrtc-react-client";
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

  // ... render UI
}

// Wrap with provider
<QuickRTCProvider>
  <App />
</QuickRTCProvider>
```

## Features Demonstrated

- Join/leave conference
- Camera and microphone toggle
- Screen sharing with camera overlay
- Multiple participants
- Auto-consume new participant streams
- Responsive video grid

## Development

```bash
# Server only
cd server && npm run dev

# Client only
cd client && npm run dev

# Both (from root)
npm run dev
```

## Production Notes

- Use proper SSL certificates
- Configure `announcedIp` in server config for public deployment
- Open ports: `443/tcp` (HTTPS), `40000-49999/udp` (WebRTC)

## License

MIT
