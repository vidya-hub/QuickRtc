# QuickRTC Deployment Guide

Complete guide for deploying QuickRTC to various environments.

## Table of Contents

- [Local Docker Deployment](#local-docker-deployment)
- [Google Cloud Platform (GCP)](#google-cloud-platform-gcp)
- [AWS Deployment](#aws-deployment)
- [Manual Server Deployment](#manual-server-deployment)
- [Troubleshooting](#troubleshooting)

---

## Local Docker Deployment

### Quick Start

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

### Local Docker Commands

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

---

## Google Cloud Platform (GCP)

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

### GCP Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GCP_PROJECT_ID` | Google Cloud project ID | (from gcloud config) |
| `GCP_REGION` | GCP region | `us-central1` |
| `GCP_ZONE` | GCP zone | `us-central1-a` |
| `GCE_INSTANCE_NAME` | VM instance name | `quickrtc-vm` |
| `GCE_MACHINE_TYPE` | VM machine type | `e2-medium` |
| `GCE_SERVICE_ACCOUNT` | Service account email | (optional) |

### Production SSL with Let's Encrypt

For production with a custom domain:

```bash
# Point your domain to the VM's external IP first, then:
DOMAIN=rtc.yourdomain.com EMAIL=you@example.com ./run.sh gcloud-ssl
```

### GCP Architecture

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

### Cost Estimation (GCP)

| Resource | Spec | Est. Monthly Cost |
|----------|------|-------------------|
| VM (e2-medium) | 2 vCPU, 4GB RAM | ~$25-35 |
| Static IP | 1 IP | ~$3 |
| Egress | Varies | ~$0.12/GB |

---

## AWS Deployment

### Prerequisites

1. Install [AWS CLI](https://aws.amazon.com/cli/)
2. Configure credentials: `aws configure`
3. Create an EC2 key pair

### Manual EC2 Setup

```bash
# 1. Launch EC2 instance (Ubuntu 22.04, t3.medium recommended)
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-groups quickrtc-sg

# 2. Create security group with required ports
aws ec2 create-security-group --group-name quickrtc-sg --description "QuickRTC ports"
aws ec2 authorize-security-group-ingress --group-name quickrtc-sg --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name quickrtc-sg --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name quickrtc-sg --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name quickrtc-sg --protocol udp --port 40000-40100 --cidr 0.0.0.0/0

# 3. SSH into instance
ssh -i your-key.pem ubuntu@<public-ip>

# 4. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# 5. Clone and deploy
git clone https://github.com/vidya-hub/QuickRtc.git
cd QuickRtc/quickrtc-example
export ANNOUNCED_IP=<public-ip>
./run.sh ssl-prod
```

### AWS Architecture

```
Internet
    │
    ├── ALB (optional) ──► EC2 Instance
    │                          ├── nginx (443)
    │                          ├── client container
    │                          └── server container
    │
    └── UDP (40000-40100) ──► EC2 Instance (direct)
```

> **Note:** WebRTC UDP traffic cannot go through AWS ALB. You must expose UDP ports directly on the EC2 instance.

---

## Manual Server Deployment

For any Linux server (DigitalOcean, Linode, Hetzner, bare metal, etc.)

### Requirements

- Ubuntu 20.04+ or Debian 11+
- 2+ CPU cores, 4GB+ RAM
- Docker and Docker Compose installed
- Ports 80, 443 (TCP) and 40000-40100 (UDP) open

### Step-by-Step

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Clone repository
git clone https://github.com/vidya-hub/QuickRtc.git
cd QuickRtc/quickrtc-example

# 4. Set environment variables
export ANNOUNCED_IP=$(curl -s ifconfig.me)
echo "Public IP: $ANNOUNCED_IP"

# 5. Start with SSL
./run.sh ssl-prod

# 6. (Optional) Setup Let's Encrypt
# First, point your domain to this server's IP, then:
export DOMAIN=rtc.yourdomain.com
export EMAIL=you@example.com
./run.sh gcloud-ssl  # Works on any server, not just GCP
```

### Systemd Service (Auto-start on boot)

Create `/etc/systemd/system/quickrtc.service`:

```ini
[Unit]
Description=QuickRTC Video Conferencing
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/quickrtc-example
Environment=ANNOUNCED_IP=YOUR_PUBLIC_IP
ExecStart=/opt/quickrtc-example/run.sh ssl-prod
ExecStop=/opt/quickrtc-example/run.sh stop

[Install]
WantedBy=multi-user.target
```

Enable the service:

```bash
sudo systemctl enable quickrtc
sudo systemctl start quickrtc
```

---

## Environment Variables Reference

### WebRTC Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ANNOUNCED_IP` | Public IP for WebRTC ICE candidates | (auto-detected) |
| `RTC_MIN_PORT` | Minimum UDP port for WebRTC | `40000` |
| `RTC_MAX_PORT` | Maximum UDP port for WebRTC | `40100` |

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server HTTP port | `3000` |
| `USE_SSL` | Enable HTTPS on server | `false` |

### SSL Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DOMAIN` | Domain for Let's Encrypt | (none) |
| `EMAIL` | Email for Let's Encrypt | (none) |

---

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS |
| 3000 | TCP | Backend API/WebSocket (internal) |
| 40000-40100 | UDP | WebRTC media |

---

## Troubleshooting

### WebRTC not working over internet

1. **Check ANNOUNCED_IP**: Ensure `ANNOUNCED_IP` is set to your server's public IP
   ```bash
   # Verify your public IP
   curl ifconfig.me
   ```

2. **Check UDP ports**: Verify UDP ports 40000-40100 are open
   ```bash
   # Test from another machine
   nc -u -v YOUR_SERVER_IP 40000
   ```

3. **Check firewall rules**:
   ```bash
   # UFW
   sudo ufw status
   
   # iptables
   sudo iptables -L -n
   ```

4. **Verify RTC port range matches Docker exposed ports**

### Self-signed certificate warning

For development, accept the browser warning. For production, use Let's Encrypt:

```bash
DOMAIN=yourdomain.com EMAIL=you@example.com ./run.sh gcloud-ssl
```

### Container crashes

Check logs:
```bash
# Local Docker
./run.sh logs-server
./run.sh logs-client

# GCP
./run.sh gcloud-logs quickrtc-server
./run.sh gcloud-logs quickrtc-nginx
```

### Connection refused on port 443

1. Check nginx is running:
   ```bash
   docker ps | grep nginx
   ```

2. Check nginx logs:
   ```bash
   docker logs quickrtc-nginx
   ```

3. Verify SSL certificates exist:
   ```bash
   ls -la certs/
   ```

### High latency / Poor video quality

1. Choose a server region close to your users
2. Ensure sufficient bandwidth (minimum 1 Mbps per participant)
3. Consider using a TURN server for restrictive networks
4. Check server CPU usage - mediasoup is CPU-intensive

### Memory issues

mediasoup workers can consume significant memory. For production:

- Minimum 4GB RAM recommended
- Monitor with: `docker stats`
- Consider horizontal scaling for 10+ participants

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Keep Docker images updated** for security patches
3. **Use firewall rules** to restrict access
4. **Don't expose port 3000** directly - use nginx as reverse proxy
5. **Use Let's Encrypt** for valid SSL certificates
6. **Regularly rotate** SSL certificates
7. **Monitor logs** for suspicious activity

---

## Scaling Considerations

### Vertical Scaling

- Increase VM size for more CPU/RAM
- mediasoup uses one worker per CPU core
- Each worker can handle ~500 consumers

### Horizontal Scaling

For large deployments (100+ simultaneous users):

1. Use a load balancer for signaling (Socket.IO)
2. Implement room-based sharding
3. Consider mediasoup's pipe transports for multi-server setups
4. Use Redis for session sharing across servers

---

## Support

- GitHub Issues: https://github.com/vidya-hub/QuickRtc/issues
- mediasoup Documentation: https://mediasoup.org/documentation/

---

## License

MIT
