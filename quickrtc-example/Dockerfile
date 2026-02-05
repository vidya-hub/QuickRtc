# QuickRTC Server Dockerfile
# Server-only build - client is mounted via volume (pre-built locally)
# Using Debian-based image for mediasoup C++ compilation compatibility
# Build context should be the repo root (simple_mediasoup/)

FROM node:20-bookworm AS builder

# Install dependencies for mediasoup native compilation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Copy and install local quickrtc packages (using local builds, not npm)
# ============================================================================
WORKDIR /app

# Copy quickrtc-types package and install its deps
COPY quickrtc_types/package*.json ./quickrtc_types/
COPY quickrtc_types/dist ./quickrtc_types/dist
WORKDIR /app/quickrtc_types
RUN npm install --production

# Copy quickrtc-server package and install its deps  
WORKDIR /app
COPY quickrtc_server/package*.json ./quickrtc_server/
COPY quickrtc_server/dist ./quickrtc_server/dist
WORKDIR /app/quickrtc_server
RUN npm install --production

# ============================================================================
# Build Server
# ============================================================================
WORKDIR /app/server

COPY quickrtc-example/server/package*.json ./

# Update package.json to use local packages instead of npm registry
RUN npm pkg set dependencies.quickrtc-server=file:../quickrtc_server
RUN npm pkg set dependencies.quickrtc-types=file:../quickrtc_types

RUN npm install

COPY quickrtc-example/server/src ./src
COPY quickrtc-example/server/tsconfig.json ./
RUN npm run build

# ============================================================================
# Production image
# ============================================================================
FROM node:20-bookworm-slim

# Install minimal runtime dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire builder app directory to preserve symlinks and node_modules
COPY --from=builder /app /app

WORKDIR /app/server

# Client will be mounted at /app/client/dist via docker-compose volume
# Create the directory so server doesn't fail if mount is missing
RUN mkdir -p /app/client/dist

# Environment
ENV NODE_ENV=production
ENV USE_SSL=false
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) process.exit(1); })" || exit 1

CMD ["node", "dist/index.js"]
