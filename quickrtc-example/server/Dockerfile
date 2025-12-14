# QuickRTC Server Dockerfile
# Using Debian-based image for better mediasoup C++ compilation compatibility
FROM node:20-bookworm AS builder

# Install dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ============================================================================
# Build quickrtc_types first (dependency for others)
# ============================================================================
COPY quickrtc_types/package*.json ./quickrtc_types/
WORKDIR /app/quickrtc_types
RUN npm install
COPY quickrtc_types/ ./
RUN npm run build

# ============================================================================
# Build quickrtc_server (depends on quickrtc_types)
# This is the slow step - mediasoup compiles C++ worker
# ============================================================================
WORKDIR /app
COPY quickrtc_server/package*.json ./quickrtc_server/
WORKDIR /app/quickrtc_server
RUN npm install
COPY quickrtc_server/ ./
RUN npm run build

# ============================================================================
# Build example server
# ============================================================================
WORKDIR /app/server
COPY quickrtc-example/server/package*.json ./
RUN npm install
COPY quickrtc-example/server/src ./src
COPY quickrtc-example/server/tsconfig.json ./
RUN npm run build

# ============================================================================
# Production image (smaller)
# ============================================================================
FROM node:20-slim

WORKDIR /app

# Copy only what's needed
COPY --from=builder /app/quickrtc_types ./quickrtc_types
COPY --from=builder /app/quickrtc_server ./quickrtc_server
COPY --from=builder /app/server ./server

WORKDIR /app/server

# Environment
ENV NODE_ENV=production
ENV USE_SSL=false
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
