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
# Development mode (foreground)
./run.sh dev

# OR using docker-compose directly
docker-compose up --build
```

- Client: http://localhost (port 80)
- Server: http://localhost:3000

### With SSL (HTTPS)

```bash
./run.sh ssl
```

- HTTPS: https://localhost (port 443)

### Production Mode

```bash
# Set your public IP for WebRTC (auto-detected if not set)
export ANNOUNCED_IP=your.public.ip.address

# Run in detached mode
./run.sh prod

# OR with SSL
./run.sh ssl-prod
```

### Available Commands

```bash
./run.sh dev          # Start in development mode (foreground)
./run.sh prod         # Start in production mode (background)
./run.sh ssl          # Start with SSL/nginx (foreground)
./run.sh ssl-prod     # Start with SSL in production mode (background)
./run.sh stop         # Stop all services
./run.sh logs         # View all logs
./run.sh logs-server  # View server logs
./run.sh logs-client  # View client logs
./run.sh status       # Show container status
./run.sh clean        # Stop and remove all containers/images
```

---

## Google Cloud Platform Deployment

Deploy QuickRTC to Google Cloud Compute Engine with a single command.

### Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`
4. Enable required APIs:
   ```bash
   gcloud services enable compute.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

### Quick Deploy

```bash
# Set your project ID
export GCP_PROJECT_ID=your-project-id

# 1. Build and push Docker images to GCR
./run.sh gcloud-build

# 2. Create a VM instance
./run.sh gcloud-create-vm

# 3. Deploy the application
./run.sh gcloud-deploy
```

Your app will be available at `https://EXTERNAL_IP` (with self-signed certificate).

### GCloud Commands

| Command | Description |
|---------|-------------|
| `./run.sh gcloud-build` | Build & push images to Google Container Registry |
| `./run.sh gcloud-create-vm` | Create a GCE VM instance with firewall rules |
| `./run.sh gcloud-deploy` | Deploy containers to the VM |
| `./run.sh gcloud-ssh` | SSH into the VM |
| `./run.sh gcloud-logs [container]` | View container logs (default: quickrtc-server) |
| `./run.sh gcloud-stop` | Stop all containers on VM |
| `./run.sh gcloud-status` | Show VM status and external IP |
| `./run.sh gcloud-ssl` | Setup Let's Encrypt SSL certificate |
| `./run.sh gcloud-delete-vm` | Delete the VM (destructive!) |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GCP_PROJECT_ID` | Google Cloud project ID | (from gcloud config) |
| `GCP_REGION` | GCP region | `us-central1` |
| `GCP_ZONE` | GCP zone | `us-central1-a` |
| `GCE_INSTANCE_NAME` | VM instance name | `quickrtc-vm` |
| `GCE_MACHINE_TYPE` | VM machine type | `e2-medium` |
| `GCE_SERVICE_ACCOUNT` | Service account email | (optional) |
| `ANNOUNCED_IP` | Public IP for WebRTC | (auto-detected) |
| `RTC_MIN_PORT` | Minimum WebRTC UDP port | `40000` |
| `RTC_MAX_PORT` | Maximum WebRTC UDP port | `40100` |

### Production SSL with Let's Encrypt

For production with a custom domain:

```bash
# Point your domain to the VM's external IP first, then:
DOMAIN=rtc.yourdomain.com EMAIL=you@example.com ./run.sh gcloud-ssl
```

### Architecture on GCP

```
Internet
    │
    ├── HTTPS (443) ──► nginx ──► client (React app)
    │                        └──► server (Socket.IO/signaling)
    │
    └── UDP (40000-40100) ──► server (WebRTC media)
```

### Firewall Rules Created

| Rule | Ports | Protocol | Description |
|------|-------|----------|-------------|
| `quickrtc-http` | 80, 443, 3000 | TCP | HTTP/HTTPS access |
| `quickrtc-webrtc` | 40000-49999 | UDP/TCP | WebRTC media ports |

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

## Configuration

### Server Configuration

The server reads configuration from environment variables:

```typescript
// Environment Variables
PORT=3000                    // Server port
USE_SSL=false               // Enable HTTPS (use nginx for SSL termination in production)
ANNOUNCED_IP=1.2.3.4        // Public IP for WebRTC ICE candidates
RTC_MIN_PORT=40000          // Minimum UDP port for WebRTC
RTC_MAX_PORT=40100          // Maximum UDP port for WebRTC
```

### Client Configuration

The client automatically connects to the same host it's served from:

```typescript
const SERVER_URL = `${window.location.protocol}//${window.location.host}`;
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

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS |
| 3000 | TCP | Backend API/WebSocket |
| 40000-40100 | UDP | WebRTC media |

---

## Troubleshooting

### WebRTC not working over internet

1. Ensure `ANNOUNCED_IP` is set to your public IP
2. Verify UDP ports 40000-40100 are open in firewall
3. Check that RTC port range matches Docker exposed ports

### Self-signed certificate warning

For development, accept the browser warning. For production, use Let's Encrypt:

```bash
DOMAIN=yourdomain.com EMAIL=you@example.com ./run.sh gcloud-ssl
```

### Container crashes on GCE

Check logs:
```bash
./run.sh gcloud-logs quickrtc-server
./run.sh gcloud-logs quickrtc-nginx
```

---

## License

MIT
