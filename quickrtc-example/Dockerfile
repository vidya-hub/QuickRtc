# QuickRTC Server Dockerfile
# Server-only build - client is mounted via volume (pre-built locally)
# Using Debian-based image for mediasoup C++ compilation compatibility

FROM node:20-bookworm AS builder

# Install dependencies for mediasoup native compilation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Build Server
# ============================================================================
WORKDIR /app/server

COPY server/package*.json ./
RUN npm install

COPY server/src ./src
COPY server/tsconfig.json ./
RUN npm run build

# ============================================================================
# Production image (smaller)
# ============================================================================
FROM node:20-slim

WORKDIR /app

# Copy built server
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package*.json ./

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
