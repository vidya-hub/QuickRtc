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

## Deployment

For complete deployment instructions including Docker, GCP, AWS, and manual server setup, see the **[Deployment Guide](DEPLOYMENT.md)**.

### Quick Docker Start

```bash
./run.sh dev      # Development mode
./run.sh ssl-prod # Production with SSL
```

### Quick GCP Deploy

```bash
export GCP_PROJECT_ID=your-project-id
./run.sh gcloud-build      # Build images
./run.sh gcloud-create-vm  # Create VM
./run.sh gcloud-deploy     # Deploy
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
├── cloudbuild.yaml        # Google Cloud Build config
├── nginx.conf             # Nginx config (local dev)
├── nginx.gcloud.conf      # Nginx config (GCP deployment)
├── nginx.client.conf      # Nginx config (client static files)
├── nginx.docker.conf      # Nginx config (Docker SSL proxy)
├── nginx.production.conf  # Nginx config (production)
└── run.sh                 # Deployment helper script
```

---

## Server Code Example

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
  quickrtcConfig: {
    workerSettings: {
      rtcMinPort: 40000,
      rtcMaxPort: 40100,
    },
    webRtcServerOptions: {
      listenInfos: [{
        ip: "0.0.0.0",
        announcedIp: process.env.ANNOUNCED_IP || null,
      }],
    },
  },
});

await quickrtc.start();
httpsServer.listen(3000);
```

---

## Client Code Example

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

## Troubleshooting

See [Deployment Guide - Troubleshooting](DEPLOYMENT.md#troubleshooting) for common issues.

---

## License

MIT
