---
sidebar_position: 2
---

# Docker Deployment

Deploy QuickRTC locally using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vidya-hub/QuickRtc.git
cd QuickRtc/quickrtc-example

# Development mode (foreground)
./run.sh dev

# OR using docker-compose directly
docker-compose up --build
```

Access the application:
- Client: http://localhost (port 80)
- Server: http://localhost:3000

## With SSL (HTTPS)

WebRTC requires HTTPS in production. Enable SSL with:

```bash
./run.sh ssl
```

Access via: https://localhost (port 443)

:::note
You'll see a browser warning for the self-signed certificate. Click "Advanced" and proceed to accept it.
:::

## Production Mode

For production deployments:

```bash
# Set your public IP for WebRTC (auto-detected if not set)
export ANNOUNCED_IP=your.public.ip.address

# Run in detached mode
./run.sh prod

# OR with SSL
./run.sh ssl-prod
```

## Available Commands

| Command | Description |
|---------|-------------|
| `./run.sh dev` | Start in development mode (foreground) |
| `./run.sh prod` | Start in production mode (background) |
| `./run.sh ssl` | Start with SSL/nginx (foreground) |
| `./run.sh ssl-prod` | Start with SSL in production mode (background) |
| `./run.sh stop` | Stop all services |
| `./run.sh logs` | View all logs |
| `./run.sh logs-server` | View server logs |
| `./run.sh logs-client` | View client logs |
| `./run.sh status` | Show container status |
| `./run.sh clean` | Stop and remove all containers/images |

## Docker Compose Configuration

The default `docker-compose.yml`:

```yaml
version: '3.8'
services:
  server:
    build: ./server
    ports:
      - "3000:3000"
      - "40000-40100:40000-40100/udp"
    environment:
      - ANNOUNCED_IP=${ANNOUNCED_IP:-}
      - RTC_MIN_PORT=40000
      - RTC_MAX_PORT=40100

  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server
```

## Custom Configuration

### Change WebRTC Port Range

```bash
export RTC_MIN_PORT=50000
export RTC_MAX_PORT=50100
./run.sh ssl-prod
```

### Use Custom Domain

For local development with a custom domain:

1. Add to `/etc/hosts`:
   ```
   127.0.0.1 rtc.local
   ```

2. Update nginx configuration to use your domain

3. Generate certificates for your domain

## Troubleshooting

### Port already in use

```bash
# Check what's using port 80
lsof -i :80

# Stop conflicting service or use different port
```

### Container won't start

```bash
# View logs
./run.sh logs

# Check container status
docker ps -a

# Rebuild from scratch
./run.sh clean
./run.sh dev
```

### WebRTC not connecting

1. Ensure `ANNOUNCED_IP` is set correctly
2. Check UDP ports are exposed
3. Verify firewall allows UDP traffic

```bash
# Check your public IP
curl ifconfig.me

# Set and restart
export ANNOUNCED_IP=$(curl -s ifconfig.me)
./run.sh ssl-prod
```
