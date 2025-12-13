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

---

## Docker Deployment

### Quick Start with Docker

```bash
# 1. Generate SSL certs (required for WebRTC)
cd quickrtc-example
npm run generate-certs

# 2. Build and run
docker-compose up --build
```

- Client: http://localhost (port 80)
- Server: http://localhost:3000

### With SSL (HTTPS)

```bash
# 1. Generate certs or use your own
npm run generate-certs

# 2. Run with SSL profile
docker-compose --profile ssl up --build
```

- HTTPS: https://localhost (port 443)

### Production Deployment

```bash
# Set your public IP for WebRTC
export ANNOUNCED_IP=your.public.ip.address

# Run in detached mode
docker-compose up -d --build
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANNOUNCED_IP` | Public IP for WebRTC | Auto-detect |
| `PORT` | Server port | 3000 |
| `USE_SSL` | Enable HTTPS on server | false (in Docker) |

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `client` | 80 | React app (nginx) |
| `server` | 3000 | Node.js + MediaSoup |
| `nginx` | 443 | SSL reverse proxy (optional) |

### Ports to Open

For production deployment, ensure these ports are open:

- `80/tcp` - HTTP (redirects to HTTPS)
- `443/tcp` - HTTPS
- `3000/tcp` - Backend (if not using nginx)
- `40000-40100/udp` - WebRTC media

---

## Project Structure

```
quickrtc-example/
├── server/                 # Express + QuickRTC server
│   ├── src/
│   │   └── index.ts       # Server entry point
│   └── Dockerfile
├── client/                 # Vite + React client
│   ├── src/
│   │   └── App.tsx        # Main app component
│   ├── Dockerfile
│   └── nginx.docker.conf  # Nginx config for client container
├── certs/                 # SSL certificates (generated)
├── docker-compose.yml     # Docker Compose config
├── nginx.conf             # Nginx config (local dev)
├── nginx.docker.conf      # Nginx config (Docker SSL proxy)
└── nginx.production.conf  # Nginx config (production)
```

---

## Local Development

```bash
# Server only
cd server && npm run dev

# Client only
cd client && npm run dev

# Both (from root)
npm run dev
```

---

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

---

## Client Code

```tsx
import { useQuickRTC } from "quickrtc-react-client";
import { io } from "socket.io-client";

function App() {
  const { rtc, isConnected, join, produce, leave } = useQuickRTC({ socket });

  const handleJoin = async () => {
    const socket = io("https://localhost:3000");
    await join({ conferenceId: "room-1", participantName: "Alice" });
    
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    await produce(media.getTracks());
  };

  // ... render UI
}
```

---

## Features Demonstrated

- Join/leave conference
- Camera and microphone toggle
- Screen sharing
- Multiple participants
- Auto-consume new participant streams
- Responsive video grid

---

## Production Notes

- Use proper SSL certificates (Let's Encrypt recommended)
- Configure `ANNOUNCED_IP` environment variable for public deployment
- Open ports: `443/tcp` (HTTPS), `40000-40100/udp` (WebRTC)

## License

MIT
