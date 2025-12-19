# QuickRTC Client Dockerfile
# Standalone build using published npm packages

FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package.json (skip package-lock.json to avoid npm bugs)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY src ./src
COPY index.html ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.cjs ./
COPY postcss.config.cjs ./

# Build client (set NODE_ENV to skip SSL cert loading in vite config)
ENV NODE_ENV=production
RUN npm run build

# ============================================================================
# Production image with nginx
# ============================================================================
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
