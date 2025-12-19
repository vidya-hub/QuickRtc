---
sidebar_position: 1
---

# Deployment Overview

QuickRTC can be deployed to various environments. This guide covers the most common deployment scenarios.

## Deployment Options

| Platform | Difficulty | Cost | Best For |
|----------|------------|------|----------|
| [Docker (Local)](/docs/deployment/docker) | Easy | Free | Development, testing |
| [Google Cloud](/docs/deployment/gcp) | Medium | ~$30/mo | Production |
| [AWS](/docs/deployment/aws) | Medium | ~$30/mo | Production |
| [Manual Server](/docs/deployment/manual) | Medium | Varies | Any VPS/bare metal |

## Requirements

All deployments require:

- **HTTPS** - WebRTC requires secure contexts
- **UDP ports** - For WebRTC media (default: 40000-40100)
- **Public IP** - For ICE candidate announcements
- **2+ CPU cores** - mediasoup is CPU-intensive
- **4GB+ RAM** - Recommended for production

## Quick Start

The fastest way to deploy is using Docker:

```bash
# Clone the example
git clone https://github.com/vidya-hub/QuickRtc.git
cd QuickRtc/quickrtc-example

# Start with SSL
./run.sh ssl-prod
```

## Architecture Overview

```
Internet
    │
    ├── HTTPS (443) ──► nginx ──► client (React app)
    │                        └──► server (Socket.IO/signaling)
    │
    └── UDP (40000-40100) ──► server (WebRTC media)
```

### Components

1. **nginx** - Reverse proxy handling SSL termination
2. **Client** - React application served as static files
3. **Server** - Node.js server with mediasoup workers

### Port Requirements

| Port | Protocol | Description |
|------|----------|-------------|
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS |
| 3000 | TCP | Backend API/WebSocket (internal) |
| 40000-40100 | UDP | WebRTC media |

## Environment Variables

All deployments use these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ANNOUNCED_IP` | Public IP for WebRTC ICE candidates | (auto-detected) |
| `RTC_MIN_PORT` | Minimum UDP port for WebRTC | `40000` |
| `RTC_MAX_PORT` | Maximum UDP port for WebRTC | `40100` |
| `PORT` | Server HTTP port | `3000` |

## Next Steps

Choose your deployment platform:

- [Docker Deployment](/docs/deployment/docker) - Local and development
- [Google Cloud Platform](/docs/deployment/gcp) - GCE deployment
- [AWS Deployment](/docs/deployment/aws) - EC2 deployment
- [Manual Server](/docs/deployment/manual) - Any Linux server
