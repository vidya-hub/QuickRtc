# QuickRTC Load Testing

Comprehensive load testing infrastructure for QuickRTC using [webrtcperf](https://github.com/vpalmisano/webrtcperf).

## Features

- **Docker Compose** setup for local testing
- **Kubernetes** manifests for scale testing
- **Prometheus + Grafana** monitoring stack
- **Configurable scenarios** (10 to 1000+ users)
- **Mac M4 Pro optimized** settings

## Quick Start

### Prerequisites

- Docker Desktop (with Compose v2)
- 16GB+ RAM recommended for high load tests
- For Kubernetes: minikube, kind, or k3s

### Run a Smoke Test (10 users)

```bash
cd quickrtc-example/load-testing
./scripts/run-docker-test.sh smoke
```

### Run with Monitoring

```bash
./scripts/run-docker-test.sh medium --monitoring
```

Then open:
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## Test Scenarios

| Scenario | Users | Rooms | Duration | Command |
|----------|-------|-------|----------|---------|
| Smoke | 10 | 1 | 60s | `./scripts/run-docker-test.sh smoke` |
| Medium | 100 | 10 | 120s | `./scripts/run-docker-test.sh medium` |
| High | 500 | 50 | 300s | `./scripts/run-docker-test.sh high` |
| Stress | 1000 | 100 | 600s | `./scripts/run-docker-test.sh stress` |
| Custom | N | N/10 | Ds | `./scripts/run-docker-test.sh custom N D` |

## Directory Structure

```
load-testing/
├── docker/
│   ├── docker-compose.yml              # Main compose file
│   ├── docker-compose.monitoring.yml   # Prometheus + Grafana
│   ├── prometheus/
│   │   └── prometheus.yml              # Scrape configuration
│   └── grafana/
│       ├── provisioning/               # Auto-provisioning
│       └── dashboards/                 # Pre-built dashboards
├── k8s/
│   ├── kustomization.yaml              # Kustomize base
│   ├── server/                         # Server deployment
│   └── loadtest/                       # Load test jobs
├── scripts/
│   ├── quickrtc-load-test.js           # webrtcperf script
│   ├── run-docker-test.sh              # Docker test runner
│   ├── run-k8s-test.sh                 # Kubernetes test runner
│   └── tune-macos.sh                   # Mac optimization
├── scenarios/
│   ├── smoke-test.yaml                 # 10 users
│   ├── medium-load.yaml                # 100 users
│   ├── high-load.yaml                  # 500 users
│   └── stress-test.yaml                # 1000 users
└── results/                            # Test results output
```

## Mac M4 Pro Optimization

For high load tests (500+ users), optimize your Mac first:

```bash
# Apply optimizations (requires sudo)
sudo ./scripts/tune-macos.sh

# Show current settings
./scripts/tune-macos.sh --show

# Docker optimization tips
./scripts/tune-macos.sh --docker
```

### Recommended Docker Desktop Settings

1. **Resources > CPUs**: 8-10 cores
2. **Resources > Memory**: 12-16 GB
3. **Resources > Swap**: 2 GB
4. Enable **Virtualization framework** (faster on Apple Silicon)

## Server Metrics

The QuickRTC server exposes Prometheus metrics at `/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `quickrtc_conferences_total` | Gauge | Active conferences |
| `quickrtc_participants_total` | Gauge | Connected participants |
| `quickrtc_socket_connections_total` | Gauge | Socket.IO connections |
| `quickrtc_participant_joins_total` | Counter | Total joins |
| `quickrtc_participant_leaves_total` | Counter | Total leaves |
| `quickrtc_server_uptime_seconds` | Gauge | Server uptime |

Plus default Node.js metrics (CPU, memory, event loop).

### View Metrics

```bash
# JSON format
curl http://localhost:3000/stats

# Prometheus format
curl http://localhost:3000/metrics
```

## Scenario Configuration

Scenarios are defined in YAML format:

```yaml
name: "Custom Test"
description: "My custom load test"

test:
  duration: 120           # seconds
  rampUpTime: 30          # seconds to reach full load

users:
  total: 100              # Total simulated users

rooms:
  strategy: "distributed" # single, distributed, random
  distributed:
    usersPerRoom: 10      # Users per room
    roomPrefix: "room-"   # Room naming

behavior:
  joinDelay: 200          # ms between joins
  logLevel: "info"        # debug, info, warn, error
```

### Room Strategies

- **single**: All users join one room (stress test single SFU)
- **distributed**: Fixed users per room (realistic multi-room)
- **random**: Random distribution across rooms

## Kubernetes Testing

### With Minikube

```bash
# Start minikube
minikube start --cpus=4 --memory=8192

# Build and load image
./scripts/run-k8s-test.sh --build

# Run test
./scripts/run-k8s-test.sh --sessions 100 --duration 120

# Cleanup
./scripts/run-k8s-test.sh --cleanup
```

### With kind

```bash
# Create cluster
kind create cluster

# Build and run
./scripts/run-k8s-test.sh --build --sessions 50
```

## Interpreting Results

Results are saved to `results/stats-<scenario>.json`:

```json
{
  "sessions": 100,
  "successful": 98,
  "failed": 2,
  "averageJoinLatency": 145,
  "p95JoinLatency": 280,
  "errors": [...]
}
```

### Key Metrics to Watch

1. **Join Latency**: Time to join a conference (<500ms is good)
2. **Error Rate**: Failed connections (< 1% is acceptable)
3. **CPU Usage**: Server CPU utilization (< 80% sustained)
4. **Memory Usage**: Heap and RSS memory
5. **Participants/Conference**: Even distribution indicates good load balancing

## Troubleshooting

### "Too many open files" error

```bash
# Apply Mac optimizations
sudo ./scripts/tune-macos.sh

# Or manually increase limit
ulimit -n 65535
```

### Docker runs out of memory

1. Increase Docker Desktop memory limit
2. Use a smaller scenario (medium instead of stress)
3. Reduce `shm_size` in docker-compose.yml

### Server not responding

```bash
# Check server logs
docker compose -f docker/docker-compose.yml logs quickrtc-server

# Check health
curl http://localhost:3000/health
```

### Kubernetes pod stuck in Pending

```bash
# Check events
kubectl get events -n quickrtc-loadtest

# Check resources
kubectl describe pod -n quickrtc-loadtest
```

## Manual webrtcperf Usage

```bash
# Pull the image
docker pull ghcr.io/vpalmisano/webrtcperf:devel

# Run with custom options
docker run --rm --network host \
  -v $(pwd)/scripts:/app/scripts:ro \
  ghcr.io/vpalmisano/webrtcperf:devel \
  --url=http://localhost:3000 \
  --sessions=50 \
  --script-path=/app/scripts/quickrtc-load-test.js \
  --run-duration=60 \
  --show-page-log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT
