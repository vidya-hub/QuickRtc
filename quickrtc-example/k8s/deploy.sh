#!/bin/bash
# QuickRTC Kubernetes Deployment Script
# 
# Prerequisites:
#   - kubectl configured with cluster access
#   - Docker image built and available
#
# Usage:
#   ./deploy.sh [command]
#
# Commands:
#   build     - Build Docker image
#   push      - Push to registry
#   deploy    - Deploy to Kubernetes
#   status    - Check deployment status
#   logs      - View logs
#   scale     - Scale replicas
#   delete    - Delete deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NAMESPACE="quickrtc"
IMAGE_NAME="quickrtc-server"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"  # Set your registry, e.g., gcr.io/project-id

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Build Docker image
build() {
  log "Building Docker image..."
  cd "$PROJECT_ROOT"
  docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" -f Dockerfile .
  log "Image built: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# Push to registry
push() {
  if [ -z "$REGISTRY" ]; then
    error "REGISTRY not set. Export REGISTRY=your-registry first."
  fi
  
  log "Tagging image for registry..."
  docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
  
  log "Pushing to registry..."
  docker push "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
  log "Pushed: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
}

# Deploy to Kubernetes
deploy() {
  log "Deploying QuickRTC to Kubernetes..."
  
  # Check if kubectl is configured
  if ! kubectl cluster-info &>/dev/null; then
    error "kubectl not configured or cluster not reachable"
  fi
  
  # Apply kustomization
  cd "$SCRIPT_DIR"
  
  # If using a registry, update the image
  if [ -n "$REGISTRY" ]; then
    log "Using registry: ${REGISTRY}"
    kubectl kustomize . | \
      sed "s|image: quickrtc-server|image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}|g" | \
      kubectl apply -f -
  else
    kubectl apply -k .
  fi
  
  log "Waiting for deployment to be ready..."
  kubectl -n $NAMESPACE rollout status deployment/quickrtc-server --timeout=300s
  
  log "Deployment complete!"
  status
}

# Check status
status() {
  log "QuickRTC Deployment Status"
  echo ""
  
  echo "=== Pods ==="
  kubectl -n $NAMESPACE get pods -l app=quickrtc -o wide
  echo ""
  
  echo "=== Services ==="
  kubectl -n $NAMESPACE get svc
  echo ""
  
  echo "=== HPA ==="
  kubectl -n $NAMESPACE get hpa
  echo ""
  
  echo "=== Ingress ==="
  kubectl -n $NAMESPACE get ingress
  echo ""
  
  # Get external access info
  NODE_PORT=$(kubectl -n $NAMESPACE get svc quickrtc-server-external -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")
  NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || \
            kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
  
  echo "=== Access URLs ==="
  echo "  NodePort:  http://${NODE_IP}:${NODE_PORT}"
  echo "  Ingress:   http://quickrtc.local (add to /etc/hosts)"
  echo ""
  
  echo "=== Room URLs for Load Testing ==="
  echo "  High Quality:   http://${NODE_IP}:${NODE_PORT}?room=quickrtc-high-quality"
  echo "  Medium Quality: http://${NODE_IP}:${NODE_PORT}?room=quickrtc-medium-quality"
  echo "  Low Quality:    http://${NODE_IP}:${NODE_PORT}?room=quickrtc-low-quality"
}

# View logs
logs() {
  POD="${1:-}"
  if [ -z "$POD" ]; then
    log "Streaming logs from all pods..."
    kubectl -n $NAMESPACE logs -l app=quickrtc -f --all-containers
  else
    kubectl -n $NAMESPACE logs -f "$POD"
  fi
}

# Scale deployment
scale() {
  REPLICAS="${1:-3}"
  log "Scaling to $REPLICAS replicas..."
  kubectl -n $NAMESPACE scale deployment quickrtc-server --replicas="$REPLICAS"
  kubectl -n $NAMESPACE rollout status deployment/quickrtc-server
  status
}

# Delete deployment
delete() {
  warn "This will delete the entire QuickRTC deployment!"
  read -p "Are you sure? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Deleting QuickRTC deployment..."
    kubectl delete -k "$SCRIPT_DIR" --ignore-not-found
    log "Deleted."
  else
    log "Cancelled."
  fi
}

# Port forward for local testing
port_forward() {
  log "Port forwarding to local machine..."
  log "Access at: http://localhost:3000"
  kubectl -n $NAMESPACE port-forward svc/quickrtc-server 3000:3000
}

# Main
case "${1:-help}" in
  build)
    build
    ;;
  push)
    push
    ;;
  deploy)
    deploy
    ;;
  status)
    status
    ;;
  logs)
    logs "$2"
    ;;
  scale)
    scale "$2"
    ;;
  delete)
    delete
    ;;
  port-forward|pf)
    port_forward
    ;;
  help|*)
    echo "QuickRTC Kubernetes Deployment"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build         Build Docker image locally"
    echo "  push          Push image to registry (set REGISTRY env var)"
    echo "  deploy        Deploy to Kubernetes cluster"
    echo "  status        Show deployment status"
    echo "  logs [pod]    View logs (all pods or specific pod)"
    echo "  scale N       Scale to N replicas"
    echo "  port-forward  Forward port 3000 to localhost"
    echo "  delete        Delete deployment"
    echo ""
    echo "Environment Variables:"
    echo "  REGISTRY      Container registry (e.g., gcr.io/my-project)"
    echo "  IMAGE_TAG     Image tag (default: latest)"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  REGISTRY=gcr.io/my-project $0 push"
    echo "  $0 deploy"
    echo "  $0 scale 10"
    ;;
esac
