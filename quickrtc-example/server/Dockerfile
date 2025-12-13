# QuickRTC Server Dockerfile
FROM node:20-alpine AS builder

# Install dependencies for mediasoup (including pip for building worker)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers

WORKDIR /app

# Copy local packages that server depends on
COPY quickrtc_types/package*.json ./quickrtc_types/
COPY quickrtc_server/package*.json ./quickrtc_server/
COPY quickrtc-example/server/package*.json ./server/

# Install and build quickrtc_types
WORKDIR /app/quickrtc_types
COPY quickrtc_types/ ./
RUN npm install && npm run build

# Install and build quickrtc_server
WORKDIR /app/quickrtc_server
COPY quickrtc_server/ ./
RUN npm install && npm run build

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Copy server source and build
COPY quickrtc-example/server/src ./src
COPY quickrtc-example/server/tsconfig.json ./
RUN npm run build

# ============================================================================
# Production image
# ============================================================================
FROM node:20-alpine

# Install runtime dependencies for mediasoup
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers

WORKDIR /app

# Copy built packages
COPY --from=builder /app/quickrtc_types ./quickrtc_types
COPY --from=builder /app/quickrtc_server ./quickrtc_server
COPY --from=builder /app/server ./server

WORKDIR /app/server

# Environment
ENV NODE_ENV=production
ENV USE_SSL=false
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "dist/index.js"]
