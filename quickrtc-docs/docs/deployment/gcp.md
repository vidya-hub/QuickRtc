---
sidebar_position: 3
---

# Google Cloud Platform

Deploy QuickRTC to Google Cloud Compute Engine with automated scripts.

## Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   ```
3. Set your project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
4. Enable required APIs:
   ```bash
   gcloud services enable compute.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

## Quick Deploy

```bash
# Clone the repository
git clone https://github.com/vidya-hub/QuickRtc.git
cd QuickRtc/quickrtc-example

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

## GCloud Commands

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

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GCP_PROJECT_ID` | Google Cloud project ID | (from gcloud config) |
| `GCP_REGION` | GCP region | `us-central1` |
| `GCP_ZONE` | GCP zone | `us-central1-a` |
| `GCE_INSTANCE_NAME` | VM instance name | `quickrtc-vm` |
| `GCE_MACHINE_TYPE` | VM machine type | `e2-medium` |
| `GCE_SERVICE_ACCOUNT` | Service account email | (optional) |

## Production SSL with Let's Encrypt

For production with a custom domain:

```bash
# 1. Point your domain DNS to the VM's external IP
# 2. Run SSL setup
DOMAIN=rtc.yourdomain.com EMAIL=you@example.com ./run.sh gcloud-ssl
```

This will:
- Install certbot
- Obtain Let's Encrypt certificate
- Configure nginx for HTTPS
- Setup auto-renewal

## Architecture

```
Internet
    │
    ├── HTTPS (443) ──► nginx ──► client (React app)
    │                        └──► server (Socket.IO/signaling)
    │
    └── UDP (40000-40100) ──► server (WebRTC media)
```

### Containers Running

| Container | Purpose | Ports |
|-----------|---------|-------|
| `quickrtc-nginx` | Reverse proxy, SSL termination | 80, 443 |
| `quickrtc-client` | React static files | Internal |
| `quickrtc-server` | mediasoup signaling & media | 3000, 40000-40100/UDP |

## Firewall Rules

The `gcloud-create-vm` command automatically creates these firewall rules:

| Rule | Ports | Protocol | Description |
|------|-------|----------|-------------|
| `quickrtc-http` | 80, 443, 3000 | TCP | HTTP/HTTPS access |
| `quickrtc-webrtc` | 40000-49999 | UDP/TCP | WebRTC media ports |

## Cost Estimation

| Resource | Spec | Est. Monthly Cost |
|----------|------|-------------------|
| VM (e2-medium) | 2 vCPU, 4GB RAM | ~$25-35 |
| Static IP | 1 IP | ~$3 |
| Egress | Varies | ~$0.12/GB |

:::tip Cost Optimization
- Use preemptible VMs for development (~70% cheaper)
- Choose a region close to your users
- Consider committed use discounts for production
:::

## Scaling

### Vertical Scaling

Upgrade VM size for more capacity:

```bash
# Stop VM
gcloud compute instances stop quickrtc-vm --zone=us-central1-a

# Resize
gcloud compute instances set-machine-type quickrtc-vm \
  --machine-type=e2-standard-4 \
  --zone=us-central1-a

# Start VM
gcloud compute instances start quickrtc-vm --zone=us-central1-a
```

### Horizontal Scaling

For large deployments (100+ users):

1. Use a load balancer for HTTP traffic
2. Deploy multiple server instances
3. Use Redis for session sharing
4. Implement room-based sharding

## Troubleshooting

### VM not accessible

```bash
# Check VM status
./run.sh gcloud-status

# SSH into VM
./run.sh gcloud-ssh

# Check firewall rules
gcloud compute firewall-rules list
```

### Container crashes

```bash
# View logs
./run.sh gcloud-logs quickrtc-server
./run.sh gcloud-logs quickrtc-nginx

# SSH and check Docker
./run.sh gcloud-ssh
docker ps -a
docker logs quickrtc-server
```

### WebRTC not working

1. Verify UDP ports are open in firewall
2. Check ANNOUNCED_IP matches external IP
3. Test UDP connectivity:
   ```bash
   nc -u -v EXTERNAL_IP 40000
   ```

### SSL certificate issues

```bash
# SSH into VM
./run.sh gcloud-ssh

# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew
```

## Cleanup

To delete all resources:

```bash
# Delete VM (this will prompt for confirmation)
./run.sh gcloud-delete-vm

# Delete firewall rules manually if needed
gcloud compute firewall-rules delete quickrtc-http quickrtc-webrtc

# Delete container images
gcloud container images delete gcr.io/PROJECT_ID/quickrtc-server
gcloud container images delete gcr.io/PROJECT_ID/quickrtc-client
gcloud container images delete gcr.io/PROJECT_ID/quickrtc-nginx
```
