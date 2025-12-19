#!/bin/bash

# QuickRTC Example - Docker Run Script
# Usage: ./run.sh [dev|prod|ssl|stop|logs|clean|gcloud-*]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[QuickRTC]${NC} $1"; }
warn() { echo -e "${YELLOW}[QuickRTC]${NC} $1"; }
error() { echo -e "${RED}[QuickRTC]${NC} $1"; }
info() { echo -e "${BLUE}[QuickRTC]${NC} $1"; }

# Google Cloud Configuration (all configurable via environment variables)
GCP_REGION="${GCP_REGION:-us-central1}"
GCP_ZONE="${GCP_ZONE:-us-central1-a}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
GCE_INSTANCE_NAME="${GCE_INSTANCE_NAME:-quickrtc-vm}"
GCE_MACHINE_TYPE="${GCE_MACHINE_TYPE:-e2-medium}"
GCE_SERVICE_ACCOUNT="${GCE_SERVICE_ACCOUNT:-}"

# Generate certs if not exist
generate_certs() {
    if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
        log "Generating SSL certificates..."
        mkdir -p certs
        
        # Get public IP for SAN if available
        local PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
        local SAN="DNS:localhost,IP:127.0.0.1"
        if [ -n "$PUBLIC_IP" ]; then
            SAN="$SAN,IP:$PUBLIC_IP"
            log "Including public IP $PUBLIC_IP in certificate"
        fi
        
        openssl req -x509 -newkey rsa:4096 \
            -keyout certs/key.pem \
            -out certs/cert.pem \
            -sha256 -days 365 -nodes \
            -subj '/CN=localhost' \
            -addext "subjectAltName=$SAN"
        log "Certificates generated in ./certs/"
    else
        log "SSL certificates already exist"
    fi
}

# Get public IP
get_public_ip() {
    if [ -z "$ANNOUNCED_IP" ]; then
        # Try to get public IP
        ANNOUNCED_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
        if [ -n "$ANNOUNCED_IP" ]; then
            warn "Detected public IP: $ANNOUNCED_IP"
            warn "Set ANNOUNCED_IP env var to override"
        fi
    fi
}

case "${1:-dev}" in
    dev)
        log "Starting in development mode..."
        generate_certs
        docker-compose up --build
        ;;
    
    prod)
        log "Starting in production mode..."
        generate_certs
        get_public_ip
        
        if [ -n "$ANNOUNCED_IP" ]; then
            export ANNOUNCED_IP
            log "Using ANNOUNCED_IP=$ANNOUNCED_IP"
        else
            warn "ANNOUNCED_IP not set - WebRTC may not work over internet"
        fi
        
        docker-compose up -d --build
        log "Services started in background"
        log "Client: http://localhost"
        log "Server: http://localhost:3000"
        log "Run './run.sh logs' to view logs"
        ;;
    
    ssl)
        log "Starting with SSL (nginx reverse proxy)..."
        generate_certs
        get_public_ip
        
        if [ -n "$ANNOUNCED_IP" ]; then
            export ANNOUNCED_IP
        fi
        
        docker-compose --profile ssl up --build
        ;;
    
    ssl-prod)
        log "Starting with SSL in production mode..."
        generate_certs
        get_public_ip
        
        if [ -n "$ANNOUNCED_IP" ]; then
            export ANNOUNCED_IP
            log "Using ANNOUNCED_IP=$ANNOUNCED_IP"
        else
            warn "ANNOUNCED_IP not set - WebRTC may not work over internet"
        fi
        
        docker-compose --profile ssl up -d --build
        log "Services started in background"
        log "HTTPS: https://localhost"
        log "Run './run.sh logs' to view logs"
        ;;
    
    stop)
        log "Stopping all services..."
        docker-compose --profile ssl down
        log "Services stopped"
        ;;
    
    logs)
        docker-compose logs -f
        ;;
    
    logs-server)
        docker-compose logs -f server
        ;;
    
    logs-client)
        docker-compose logs -f client
        ;;
    
    clean)
        log "Stopping and removing all containers, volumes, and images..."
        docker-compose --profile ssl down -v --rmi local
        log "Cleaned up"
        ;;
    
    status)
        docker-compose ps
        ;;
    
    # ==========================================================================
    # Google Cloud Commands
    # ==========================================================================
    
    gcloud-build)
        log "Building Docker images with Google Cloud Build..."
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        if [ -z "$GCP_PROJECT_ID" ]; then
            error "GCP_PROJECT_ID not set. Run: export GCP_PROJECT_ID=your-project-id"
            exit 1
        fi
        log "Project: $GCP_PROJECT_ID"
        log "Region: $GCP_REGION"
        
        # Build from quickrtc-example directory (standalone build)
        gcloud builds submit \
            --config cloudbuild.yaml \
            --substitutions="_PROJECT_ID=$GCP_PROJECT_ID" \
            .
        log "Build complete! Images pushed to gcr.io/$GCP_PROJECT_ID/"
        ;;
    
    gcloud-create-vm)
        log "Creating GCE VM for QuickRTC..."
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        if [ -z "$GCP_PROJECT_ID" ]; then
            error "GCP_PROJECT_ID not set. Run: export GCP_PROJECT_ID=your-project-id"
            exit 1
        fi
        
        info "Project: $GCP_PROJECT_ID"
        info "Zone: $GCP_ZONE"
        info "Instance: $GCE_INSTANCE_NAME"
        info "Machine Type: $GCE_MACHINE_TYPE"
        if [ -n "$GCE_SERVICE_ACCOUNT" ]; then
            info "Service Account: $GCE_SERVICE_ACCOUNT"
        fi
        
        # Create firewall rules if they don't exist
        log "Creating firewall rules..."
        gcloud compute firewall-rules create quickrtc-http \
            --project=$GCP_PROJECT_ID \
            --allow=tcp:80,tcp:443,tcp:3000 \
            --target-tags=quickrtc \
            --description="QuickRTC HTTP/HTTPS access" 2>/dev/null || warn "Firewall rule 'quickrtc-http' already exists"
        
        gcloud compute firewall-rules create quickrtc-webrtc \
            --project=$GCP_PROJECT_ID \
            --allow=udp:40000-49999,tcp:40000-49999 \
            --target-tags=quickrtc \
            --description="QuickRTC WebRTC media ports" 2>/dev/null || warn "Firewall rule 'quickrtc-webrtc' already exists"
        
        # Build the gcloud command
        CREATE_CMD="gcloud compute instances create $GCE_INSTANCE_NAME \
            --project=$GCP_PROJECT_ID \
            --zone=$GCP_ZONE \
            --machine-type=$GCE_MACHINE_TYPE \
            --image-family=cos-stable \
            --image-project=cos-cloud \
            --boot-disk-size=20GB \
            --tags=quickrtc,http-server,https-server \
            --scopes=cloud-platform \
            --metadata=google-logging-enabled=true"
        
        # Add service account if specified
        if [ -n "$GCE_SERVICE_ACCOUNT" ]; then
            CREATE_CMD="$CREATE_CMD --service-account=$GCE_SERVICE_ACCOUNT"
        fi
        
        # Create VM with Container-Optimized OS
        log "Creating VM instance..."
        eval $CREATE_CMD
        
        # Get external IP
        EXTERNAL_IP=$(gcloud compute instances describe $GCE_INSTANCE_NAME \
            --zone=$GCP_ZONE \
            --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
        
        log "VM created successfully!"
        log "External IP: $EXTERNAL_IP"
        log ""
        log "Next steps:"
        log "  1. SSH into VM: ./run.sh gcloud-ssh"
        log "  2. Deploy app: ./run.sh gcloud-deploy"
        ;;
    
    gcloud-ssh)
        log "SSH into GCE VM..."
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        gcloud compute ssh $GCE_INSTANCE_NAME \
            --project=$GCP_PROJECT_ID \
            --zone=$GCP_ZONE
        ;;
    
    gcloud-deploy)
        log "Deploying QuickRTC to GCE VM..."
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        if [ -z "$GCP_PROJECT_ID" ]; then
            error "GCP_PROJECT_ID not set. Run: export GCP_PROJECT_ID=your-project-id"
            exit 1
        fi
        
        # Get external IP
        EXTERNAL_IP=$(gcloud compute instances describe $GCE_INSTANCE_NAME \
            --zone=$GCP_ZONE \
            --project=$GCP_PROJECT_ID \
            --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
        
        log "Deploying to $GCE_INSTANCE_NAME ($EXTERNAL_IP)..."
        
        # Copy nginx configs to VM
        gcloud compute scp \
            nginx.gcloud.conf \
            nginx.client.conf \
            $GCE_INSTANCE_NAME:~ \
            --zone=$GCP_ZONE \
            --project=$GCP_PROJECT_ID
        
        # Run deployment commands on VM using plain docker commands
        gcloud compute ssh $GCE_INSTANCE_NAME \
            --zone=$GCP_ZONE \
            --project=$GCP_PROJECT_ID \
            --command="
                # Configure Docker to use GCR
                docker-credential-gcr configure-docker
                
                # Pull latest images
                docker pull gcr.io/$GCP_PROJECT_ID/quickrtc-server:latest || { echo 'Failed to pull server image'; exit 1; }
                docker pull gcr.io/$GCP_PROJECT_ID/quickrtc-client:latest || { echo 'Failed to pull client image'; exit 1; }
                
                # Stop and remove existing containers
                docker stop quickrtc-nginx quickrtc-server quickrtc-client 2>/dev/null || true
                docker rm quickrtc-nginx quickrtc-server quickrtc-client 2>/dev/null || true
                
                # Create network if not exists
                docker network create quickrtc-net 2>/dev/null || true
                
                # Create directories
                mkdir -p ssl certbot/conf certbot/www
                
                # Generate self-signed SSL certificate if not exists
                if [ ! -f ssl/cert.pem ]; then
                    echo 'Generating self-signed SSL certificate...'
                    openssl req -x509 -newkey rsa:4096 \
                        -keyout ssl/key.pem \
                        -out ssl/cert.pem \
                        -sha256 -days 365 -nodes \
                        -subj '/CN=$EXTERNAL_IP' \
                        -addext 'subjectAltName=IP:$EXTERNAL_IP,DNS:localhost'
                    echo 'SSL certificate generated'
                fi
                
                # Start server container (internal only, no port exposure except WebRTC UDP)
                docker run -d \
                    --name quickrtc-server \
                    --network quickrtc-net \
                    -p 40000-40100:40000-40100/udp \
                    -e ANNOUNCED_IP=$EXTERNAL_IP \
                    -e RTC_MIN_PORT=40000 \
                    -e RTC_MAX_PORT=40100 \
                    gcr.io/$GCP_PROJECT_ID/quickrtc-server:latest
                
                # Start client container with simple static-only nginx config
                docker run -d \
                    --name quickrtc-client \
                    --network quickrtc-net \
                    -v \$(pwd)/nginx.client.conf:/etc/nginx/conf.d/default.conf:ro \
                    gcr.io/$GCP_PROJECT_ID/quickrtc-client:latest
                
                # Wait for containers to be ready
                sleep 2
                
                # Start nginx reverse proxy with HTTPS
                docker run -d \
                    --name quickrtc-nginx \
                    --network quickrtc-net \
                    -p 80:80 \
                    -p 443:443 \
                    -v \$(pwd)/nginx.gcloud.conf:/etc/nginx/nginx.conf:ro \
                    -v \$(pwd)/ssl:/etc/nginx/ssl:ro \
                    -v \$(pwd)/certbot/conf:/etc/letsencrypt:ro \
                    -v \$(pwd)/certbot/www:/var/www/certbot:ro \
                    nginx:alpine
                
                echo ''
                echo 'QuickRTC deployed successfully!'
                docker ps --filter name=quickrtc
            "
        
        log "Deployment complete!"
        log "App: https://$EXTERNAL_IP (self-signed certificate)"
        log "WebRTC UDP ports: 40000-40100"
        log ""
        warn "Note: Browser will show security warning for self-signed cert."
        warn "For production, use: DOMAIN=your-domain.com EMAIL=you@email.com ./run.sh gcloud-ssl"
        ;;
    
    gcloud-logs)
        log "Viewing logs from GCE VM..."
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        CONTAINER="${2:-quickrtc-server}"
        log "Showing logs for: $CONTAINER (use './run.sh gcloud-logs quickrtc-nginx' for nginx logs)"
        gcloud compute ssh $GCE_INSTANCE_NAME \
            --zone=$GCP_ZONE \
            --project=$GCP_PROJECT_ID \
            --command="docker logs -f $CONTAINER"
        ;;
    
    gcloud-stop)
        log "Stopping containers on GCE VM..."
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        gcloud compute ssh $GCE_INSTANCE_NAME \
            --zone=$GCP_ZONE \
            --project=$GCP_PROJECT_ID \
            --command="docker stop quickrtc-nginx quickrtc-server quickrtc-client 2>/dev/null; docker rm quickrtc-nginx quickrtc-server quickrtc-client 2>/dev/null"
        log "Containers stopped"
        ;;
    
    gcloud-delete-vm)
        warn "This will delete the VM and all data!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ -z "$GCP_PROJECT_ID" ]; then
                GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
            fi
            log "Deleting VM..."
            gcloud compute instances delete $GCE_INSTANCE_NAME \
                --zone=$GCP_ZONE \
                --project=$GCP_PROJECT_ID \
                --quiet
            log "VM deleted"
        else
            log "Cancelled"
        fi
        ;;
    
    gcloud-status)
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        log "GCE VM Status:"
        gcloud compute instances describe $GCE_INSTANCE_NAME \
            --zone=$GCP_ZONE \
            --project=$GCP_PROJECT_ID \
            --format="table(name,status,networkInterfaces[0].accessConfigs[0].natIP:label=EXTERNAL_IP)"
        ;;
    
    gcloud-ssl)
        log "Setting up SSL with Let's Encrypt on GCE VM..."
        if [ -z "$DOMAIN" ]; then
            error "DOMAIN not set. Run: DOMAIN=your-domain.com EMAIL=your@email.com ./run.sh gcloud-ssl"
            exit 1
        fi
        if [ -z "$EMAIL" ]; then
            error "EMAIL not set. Run: DOMAIN=your-domain.com EMAIL=your@email.com ./run.sh gcloud-ssl"
            exit 1
        fi
        if [ -z "$GCP_PROJECT_ID" ]; then
            GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        fi
        
        log "Domain: $DOMAIN"
        log "Email: $EMAIL"
        
        gcloud compute ssh $GCE_INSTANCE_NAME \
            --zone=$GCP_ZONE \
            --project=$GCP_PROJECT_ID \
            --command="
                # Create directories
                mkdir -p certbot/conf certbot/www
                
                # Get initial certificate
                docker run --rm \
                    -v \$(pwd)/certbot/conf:/etc/letsencrypt \
                    -v \$(pwd)/certbot/www:/var/www/certbot \
                    certbot/certbot certonly \
                    --webroot \
                    --webroot-path=/var/www/certbot \
                    --email $EMAIL \
                    --agree-tos \
                    --no-eff-email \
                    -d $DOMAIN
                
                # Update nginx config with domain
                sed -i 's/\${DOMAIN:-localhost}/$DOMAIN/g' nginx.gcloud.conf
                
                # Restart with SSL
                docker-compose -f docker-compose.gcloud.yml up -d
                
                echo ''
                echo 'SSL configured!'
                echo 'HTTPS: https://$DOMAIN'
            "
        log "SSL setup complete!"
        ;;
    
    *)
        echo "QuickRTC Docker Runner"
        echo ""
        echo "Usage: ./run.sh [command]"
        echo ""
        echo "Local Commands:"
        echo "  dev          Start in development mode (foreground, default)"
        echo "  prod         Start in production mode (background)"
        echo "  ssl          Start with SSL/nginx (foreground)"
        echo "  ssl-prod     Start with SSL in production mode (background)"
        echo "  stop         Stop all services"
        echo "  logs         View all logs"
        echo "  logs-server  View server logs"
        echo "  logs-client  View client logs"
        echo "  status       Show container status"
        echo "  clean        Stop and remove all containers/images"
        echo ""
        echo "Google Cloud Commands:"
        echo "  gcloud-build      Build & push images to GCR"
        echo "  gcloud-create-vm  Create a GCE VM instance"
        echo "  gcloud-deploy     Deploy to GCE VM"
        echo "  gcloud-ssh        SSH into GCE VM"
        echo "  gcloud-logs       View logs on GCE VM"
        echo "  gcloud-stop       Stop containers on GCE VM"
        echo "  gcloud-status     Show GCE VM status"
        echo "  gcloud-ssl        Setup Let's Encrypt SSL"
        echo "  gcloud-delete-vm  Delete GCE VM (destructive!)"
        echo ""
        echo "Environment variables:"
        echo "  ANNOUNCED_IP       Public IP for WebRTC (auto-detected if not set)"
        echo "  GCP_PROJECT_ID     Google Cloud project ID"
        echo "  GCP_REGION         GCP region (default: us-central1)"
        echo "  GCP_ZONE           GCP zone (default: us-central1-a)"
        echo "  GCE_INSTANCE_NAME  VM name (default: quickrtc-vm)"
        echo "  GCE_MACHINE_TYPE   VM type (default: e2-medium)"
        echo "  GCE_SERVICE_ACCOUNT Service account email (optional)"
        echo "  DOMAIN             Domain for SSL (for gcloud-ssl)"
        echo "  EMAIL              Email for Let's Encrypt (for gcloud-ssl)"
        echo ""
        echo "Examples:"
        echo "  ./run.sh                              # Start dev mode"
        echo "  ./run.sh prod                         # Start production mode"
        echo "  ANNOUNCED_IP=1.2.3.4 ./run.sh prod    # With custom IP"
        echo ""
        echo "  # Google Cloud deployment"
        echo "  export GCP_PROJECT_ID=my-project"
        echo "  ./run.sh gcloud-build                 # Build images"
        echo "  ./run.sh gcloud-create-vm             # Create VM"
        echo "  ./run.sh gcloud-deploy                # Deploy to VM"
        echo "  DOMAIN=rtc.example.com EMAIL=me@example.com ./run.sh gcloud-ssl"
        ;;
esac
