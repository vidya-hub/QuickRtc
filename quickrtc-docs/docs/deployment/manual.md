---
sidebar_position: 5
---

# Manual Server Deployment

Deploy QuickRTC to any Linux server (DigitalOcean, Linode, Hetzner, bare metal, etc.).

## Requirements

- Ubuntu 20.04+ or Debian 11+
- 2+ CPU cores
- 4GB+ RAM
- Ports 80, 443 (TCP) and 40000-40100 (UDP) open
- Root or sudo access

## Step-by-Step Installation

### 1. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker
```

### 2. Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 3. Clone and Deploy

```bash
# Clone repository
git clone https://github.com/vidya-hub/QuickRtc.git
cd QuickRtc/quickrtc-example

# Set environment variables
export ANNOUNCED_IP=$(curl -s ifconfig.me)
echo "Public IP: $ANNOUNCED_IP"

# Start with SSL
./run.sh ssl-prod
```

Your app is now available at `https://YOUR_SERVER_IP`.

## Firewall Configuration

### UFW (Ubuntu)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow WebRTC
sudo ufw allow 40000:40100/udp

# Enable firewall
sudo ufw enable
```

### iptables

```bash
# Allow HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow WebRTC
sudo iptables -A INPUT -p udp --dport 40000:40100 -j ACCEPT

# Save rules
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

## Let's Encrypt SSL

For production with a custom domain:

```bash
# 1. Point your domain's DNS A record to your server IP

# 2. Set environment variables
export DOMAIN=rtc.yourdomain.com
export EMAIL=you@example.com

# 3. Run SSL setup
./run.sh gcloud-ssl  # Works on any server
```

This will:
- Install certbot
- Obtain a Let's Encrypt certificate
- Configure nginx for HTTPS
- Setup automatic renewal

## Auto-Start on Boot

Create a systemd service to start QuickRTC automatically:

```bash
# Create service file
sudo tee /etc/systemd/system/quickrtc.service << 'EOF'
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
EOF

# Move app to /opt (optional but recommended)
sudo mv ~/QuickRtc/quickrtc-example /opt/

# Update ANNOUNCED_IP in service file
sudo sed -i "s/YOUR_PUBLIC_IP/$(curl -s ifconfig.me)/" /etc/systemd/system/quickrtc.service

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable quickrtc
sudo systemctl start quickrtc
```

### Service Management

```bash
# Check status
sudo systemctl status quickrtc

# View logs
sudo journalctl -u quickrtc -f

# Restart
sudo systemctl restart quickrtc

# Stop
sudo systemctl stop quickrtc
```

## Provider-Specific Guides

### DigitalOcean

1. Create a Droplet (2GB+ RAM, Ubuntu 22.04)
2. Enable "Monitoring" for metrics
3. Add firewall via UI or `doctl`:
   ```bash
   doctl compute firewall create \
     --name quickrtc \
     --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0 protocol:tcp,ports:80,address:0.0.0.0/0 protocol:tcp,ports:443,address:0.0.0.0/0 protocol:udp,ports:40000-40100,address:0.0.0.0/0"
   ```

### Linode

1. Create a Linode (Shared CPU 2GB+)
2. Configure Cloud Firewall:
   - TCP: 22, 80, 443
   - UDP: 40000-40100

### Hetzner

1. Create a server (CX21 or higher)
2. Configure firewall in Cloud Console
3. Hetzner blocks some ports by default - ensure UDP is allowed

### Vultr

1. Deploy Ubuntu 22.04 instance
2. Configure firewall group with required ports
3. Attach firewall group to instance

## Security Hardening

### SSH Key Only

```bash
# Disable password authentication
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### Fail2ban

```bash
# Install
sudo apt install fail2ban

# Configure
sudo tee /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = 22
filter = sshd
maxretry = 3
bantime = 3600
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Automatic Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Enable
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Monitoring

### Basic Monitoring with htop

```bash
sudo apt install htop
htop
```

### Docker Stats

```bash
# Real-time container metrics
docker stats
```

### Log Rotation

Docker logs can grow large. Configure log rotation:

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## Backup

### Backup SSL Certificates

```bash
# Create backup directory
mkdir -p ~/backups

# Backup Let's Encrypt certs
sudo tar -czvf ~/backups/letsencrypt-$(date +%Y%m%d).tar.gz /etc/letsencrypt
```

### Automated Backups

```bash
# Create backup script
cat > ~/backup-quickrtc.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d)

# Backup certs
sudo tar -czvf $BACKUP_DIR/letsencrypt-$DATE.tar.gz /etc/letsencrypt

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x ~/backup-quickrtc.sh

# Add to crontab (daily at 2am)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-quickrtc.sh") | crontab -
```

## Troubleshooting

### Check Service Status

```bash
# Systemd service
sudo systemctl status quickrtc

# Docker containers
docker ps

# Docker logs
docker logs quickrtc-server
docker logs quickrtc-nginx
```

### Test UDP Connectivity

```bash
# On server
nc -u -l 40000

# On client (another machine)
nc -u SERVER_IP 40000
```

### Check Port Bindings

```bash
# See what's listening
sudo netstat -tulpn | grep -E '(80|443|3000|40000)'

# Or with ss
sudo ss -tulpn | grep -E '(80|443|3000|40000)'
```

### Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Memory Issues

```bash
# Check memory usage
free -h

# Check Docker memory
docker stats --no-stream

# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
