#!/bin/bash
# QuickRTC Load Test Runner - Kubernetes
# 
# Usage:
#   ./run-k8s-test.sh                    # Deploy and run test
#   ./run-k8s-test.sh --build            # Build image first
#   ./run-k8s-test.sh --sessions 100     # Custom session count
#   ./run-k8s-test.sh --cleanup          # Remove all resources

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOADTEST_DIR="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$LOADTEST_DIR/k8s"
PROJECT_ROOT="$(dirname "$(dirname "$LOADTEST_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  QuickRTC Kubernetes Load Testing${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
BUILD=false
CLEANUP=false
SESSIONS=100
DURATION=120
NAMESPACE="quickrtc-loadtest"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b)
            BUILD=true
            shift
            ;;
        --cleanup|-c)
            CLEANUP=true
            shift
            ;;
        --sessions|-s)
            SESSIONS="$2"
            shift 2
            ;;
        --duration|-d)
            DURATION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --build, -b       Build Docker image first"
            echo "  --cleanup, -c     Remove all K8s resources"
            echo "  --sessions N      Number of sessions (default: 100)"
            echo "  --duration N      Test duration in seconds (default: 120)"
            echo "  --help, -h        Show this help"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

print_header

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed"
    exit 1
fi

# Check cluster connection
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    print_info "Make sure your cluster is running (minikube start, kind create cluster, etc.)"
    exit 1
fi

# Cleanup mode
if [ "$CLEANUP" = true ]; then
    print_info "Cleaning up all resources..."
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    print_info "Cleanup complete!"
    exit 0
fi

# Build Docker image if requested
if [ "$BUILD" = true ]; then
    print_info "Building QuickRTC server Docker image..."
    
    # Detect if using minikube
    if command -v minikube &> /dev/null && minikube status &> /dev/null; then
        print_info "Using Minikube Docker environment..."
        eval $(minikube docker-env)
    fi
    
    # Detect if using kind
    if command -v kind &> /dev/null; then
        print_info "Will load image into kind after build..."
        KIND_LOAD=true
    fi
    
    docker build -t quickrtc-server:latest -f "$PROJECT_ROOT/quickrtc-example/server/Dockerfile" "$PROJECT_ROOT"
    
    if [ "${KIND_LOAD:-false}" = true ]; then
        kind load docker-image quickrtc-server:latest
    fi
    
    print_info "Docker image built successfully!"
fi

# Create namespace
print_info "Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply base resources
print_info "Deploying QuickRTC server..."
kubectl apply -k "$K8S_DIR"

# Wait for server to be ready
print_info "Waiting for server to be ready..."
kubectl rollout status deployment/quickrtc-server -n $NAMESPACE --timeout=120s

# Update job with custom session count
print_info "Configuring load test: $SESSIONS sessions, ${DURATION}s duration..."
kubectl delete job quickrtc-loadtest -n $NAMESPACE --ignore-not-found=true

# Create job with custom parameters
cat << EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: quickrtc-loadtest
  namespace: $NAMESPACE
spec:
  parallelism: 1
  completions: 1
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: webrtcperf
        image: ghcr.io/vpalmisano/webrtcperf:devel
        args:
        - "--url=http://quickrtc-server:3000"
        - "--sessions=$SESSIONS"
        - "--tabs-per-session=1"
        - "--script-path=/scripts/quickrtc-load-test.js"
        - "--run-duration=$DURATION"
        - "--spawn-rate=5"
        - "--show-page-log"
        - "--use-fake-device-for-media-stream"
        volumeMounts:
        - name: scripts
          mountPath: /scripts
        - name: dshm
          mountPath: /dev/shm
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: scripts
        configMap:
          name: loadtest-scripts
      - name: dshm
        emptyDir:
          medium: Memory
          sizeLimit: "2Gi"
EOF

# Follow job logs
print_info "Starting load test..."
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Load Test: $SESSIONS users for ${DURATION}s${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Wait for job to start
sleep 5

# Follow logs
kubectl logs -f job/quickrtc-loadtest -n $NAMESPACE || true

# Check job status
JOB_STATUS=$(kubectl get job quickrtc-loadtest -n $NAMESPACE -o jsonpath='{.status.succeeded}')
if [ "$JOB_STATUS" = "1" ]; then
    print_info "Load test completed successfully!"
else
    print_warn "Load test may have encountered issues. Check logs above."
fi

# Show server metrics
echo ""
print_info "Server metrics:"
kubectl exec -n $NAMESPACE deploy/quickrtc-server -- curl -s http://localhost:3000/stats 2>/dev/null || echo "Could not fetch stats"

echo ""
print_info "To clean up resources, run:"
echo "    $0 --cleanup"
