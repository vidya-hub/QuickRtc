# QuickRTC Server Dockerfile
# Standalone build using published npm packages
# Using Debian-based image for mediasoup C++ compilation compatibility

FROM node:20-bookworm AS builder

# Install dependencies for mediasoup native compilation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json only (skip package-lock.json to avoid npm bugs)
COPY package.json ./

# Install dependencies (mediasoup will compile here)
RUN npm install

# Copy source files
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# ============================================================================
# Production image (smaller)
# ============================================================================
FROM node:20-slim

WORKDIR /app

# Copy built app and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Environment
ENV NODE_ENV=production
ENV USE_SSL=false
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) process.exit(1); })" || exit 1

CMD ["node", "dist/index.js"]
