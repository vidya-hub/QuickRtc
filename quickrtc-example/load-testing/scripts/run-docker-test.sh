#!/bin/bash
# QuickRTC Load Test Runner - Docker
# 
# Usage:
#   ./run-docker-test.sh                    # Run smoke test (10 users, 60s)
#   ./run-docker-test.sh medium             # Run medium load test (100 users)
#   ./run-docker-test.sh high               # Run high load test (500 users)
#   ./run-docker-test.sh stress             # Run stress test (1000 users)
#   ./run-docker-test.sh --monitoring       # Start with Prometheus + Grafana

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOADTEST_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$LOADTEST_DIR/docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  QuickRTC Load Testing${NC}"
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
SCENARIO="smoke-test"
MONITORING=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --monitoring|-m)
            MONITORING=true
            shift
            ;;
        smoke)
            SCENARIO="smoke-test"
            shift
            ;;
        medium)
            SCENARIO="medium-load"
            shift
            ;;
        high)
            SCENARIO="high-load"
            shift
            ;;
        stress)
            SCENARIO="stress-test"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [scenario] [options]"
            echo ""
            echo "Scenarios:"
            echo "  smoke     10 users, 60s (default)"
            echo "  medium    100 users, 120s"
            echo "  high      500 users, 300s"
            echo "  stress    1000 users, 600s"
            echo ""
            echo "Options:"
            echo "  --monitoring, -m   Start Prometheus + Grafana"
            echo "  --help, -h         Show this help"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

print_header

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available"
    exit 1
fi

# Create results directory
mkdir -p "$LOADTEST_DIR/results"

# Read config file to display info
CONFIG_FILE="$LOADTEST_DIR/configs/${SCENARIO}.json"
if [ -f "$CONFIG_FILE" ]; then
    SESSIONS=$(grep -o '"sessions":[^,}]*' "$CONFIG_FILE" | cut -d: -f2 | tr -d ' ')
    DURATION=$(grep -o '"runDuration":[^,}]*' "$CONFIG_FILE" | cut -d: -f2 | tr -d ' ')
    SPAWN_RATE=$(grep -o '"spawnRate":[^,}]*' "$CONFIG_FILE" | cut -d: -f2 | tr -d ' ')
else
    SESSIONS="?"
    DURATION="?"
    SPAWN_RATE="?"
fi

print_info "Configuration:"
echo "  Scenario:    $SCENARIO"
echo "  Sessions:    $SESSIONS"
echo "  Duration:    ${DURATION}s"
echo "  Spawn Rate:  $SPAWN_RATE/s"
echo "  Monitoring:  $MONITORING"
echo ""

# Export environment variable
export SCENARIO

# Build compose command
COMPOSE_CMD="docker compose -f $DOCKER_DIR/docker-compose.yml"

if [ "$MONITORING" = true ]; then
    COMPOSE_CMD="$COMPOSE_CMD -f $DOCKER_DIR/docker-compose.monitoring.yml"
    print_info "Starting with monitoring stack..."
    print_info "Prometheus: http://localhost:9090"
    print_info "Grafana:    http://localhost:3001 (admin/admin)"
fi

# Stop any existing containers
print_info "Stopping any existing containers..."
$COMPOSE_CMD down 2>/dev/null || true

# Rebuild server if needed (we added /loadtest endpoint)
print_info "Building QuickRTC server..."
$COMPOSE_CMD build quickrtc-server

# Start services
print_info "Starting QuickRTC server..."
$COMPOSE_CMD up -d quickrtc-server

if [ "$MONITORING" = true ]; then
    print_info "Starting monitoring stack..."
    $COMPOSE_CMD up -d prometheus grafana
fi

# Wait for server to be healthy
print_info "Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_info "Server is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Server failed to start within 30 seconds"
        $COMPOSE_CMD logs quickrtc-server
        exit 1
    fi
    sleep 1
done

# Run load test
print_info "Starting load test..."
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Load Test Running: $SESSIONS users for ${DURATION}s${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""

$COMPOSE_CMD run --rm webrtcperf

echo ""
print_info "Load test complete!"

# Cleanup option
echo ""
read -p "Stop all containers? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Stopping containers..."
    $COMPOSE_CMD down
fi

print_info "Done!"
