#!/bin/bash

# QuickRTC Example - Docker Run Script
# Usage: ./run.sh [dev|prod|ssl|stop|logs|clean]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[QuickRTC]${NC} $1"; }
warn() { echo -e "${YELLOW}[QuickRTC]${NC} $1"; }
error() { echo -e "${RED}[QuickRTC]${NC} $1"; }

# Generate certs if not exist
generate_certs() {
    if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
        log "Generating SSL certificates..."
        mkdir -p certs
        openssl req -x509 -newkey rsa:4096 \
            -keyout certs/key.pem \
            -out certs/cert.pem \
            -sha256 -days 365 -nodes \
            -subj '/CN=localhost'
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
    
    *)
        echo "QuickRTC Docker Runner"
        echo ""
        echo "Usage: ./run.sh [command]"
        echo ""
        echo "Commands:"
        echo "  dev        Start in development mode (foreground, default)"
        echo "  prod       Start in production mode (background)"
        echo "  ssl        Start with SSL/nginx (foreground)"
        echo "  ssl-prod   Start with SSL in production mode (background)"
        echo "  stop       Stop all services"
        echo "  logs       View all logs"
        echo "  logs-server View server logs"
        echo "  logs-client View client logs"
        echo "  status     Show container status"
        echo "  clean      Stop and remove all containers/images"
        echo ""
        echo "Environment variables:"
        echo "  ANNOUNCED_IP  Public IP for WebRTC (auto-detected if not set)"
        echo ""
        echo "Examples:"
        echo "  ./run.sh                     # Start dev mode"
        echo "  ./run.sh prod                # Start production mode"
        echo "  ANNOUNCED_IP=1.2.3.4 ./run.sh prod  # With custom IP"
        ;;
esac
