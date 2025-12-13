# QuickRTC Client Dockerfile
# Multi-stage build: Build React app, then serve with nginx

# ============================================================================
# Stage 1: Build dependencies
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy and build quickrtc_types
COPY quickrtc_types/package*.json ./quickrtc_types/
COPY quickrtc_types/ ./quickrtc_types/
WORKDIR /app/quickrtc_types
RUN npm install && npm run build

# Copy and build quickrtc_client
WORKDIR /app
COPY quickrtc_client/package*.json ./quickrtc_client/
COPY quickrtc_client/ ./quickrtc_client/
WORKDIR /app/quickrtc_client
RUN npm install && npm run build

# Copy and build quickrtc-react-client
WORKDIR /app
COPY quickrtc-react-client/package*.json ./quickrtc-react-client/
COPY quickrtc-react-client/ ./quickrtc-react-client/
WORKDIR /app/quickrtc-react-client
RUN npm install && npm run build

# Copy and build the example client
WORKDIR /app/client
COPY quickrtc-example/client/package*.json ./
RUN npm install

COPY quickrtc-example/client/src ./src
COPY quickrtc-example/client/index.html ./
COPY quickrtc-example/client/tsconfig.json ./
COPY quickrtc-example/client/vite.config.ts ./
COPY quickrtc-example/client/tailwind.config.cjs ./
COPY quickrtc-example/client/postcss.config.cjs ./

# Build client (set NODE_ENV to skip SSL cert loading)
ENV NODE_ENV=production
RUN npm run build

# ============================================================================
# Stage 2: Production with nginx
# ============================================================================
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy nginx config
COPY quickrtc-example/client/nginx.docker.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
