#!/bin/bash

echo "🚀 QuickRTC Setup Script"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the quickrtc_example directory"
    exit 1
fi

echo "📦 Installing dependencies with npm (MediaSoup compatible)..."

# Remove existing installations
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning existing node_modules..."
    rm -rf node_modules
fi

if [ -f "pnpm-lock.yaml" ]; then
    echo "🧹 Removing pnpm lock file..."
    rm -f pnpm-lock.yaml
fi

# Install with npm
echo "📥 Installing dependencies with npm..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if MediaSoup worker was built
WORKER_PATH="node_modules/mediasoup/worker/out/Release/mediasoup-worker"
if [ -f "$WORKER_PATH" ]; then
    echo "✅ MediaSoup worker binary found"
else
    echo "⚠️  MediaSoup worker binary not found, attempting to build..."
    cd node_modules/mediasoup
    npm run worker:build
    cd ../..
    
    if [ -f "$WORKER_PATH" ]; then
        echo "✅ MediaSoup worker binary built successfully"
    else
        echo "❌ Failed to build MediaSoup worker binary"
        exit 1
    fi
fi

# Build the packages
echo "🔨 Building packages..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build packages"
    exit 1
fi

# Generate certificates
echo "📜 Generating SSL certificates..."
npm run generate-certs

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate SSL certificates"
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the server:"
echo "   npm run start:https      # HTTPS (recommended)"
echo "   npm start                # HTTP (limited features)"
echo ""
echo "🌐 Then open in your browser:"
echo "   https://localhost:3443   # HTTPS"
echo "   http://localhost:3000    # HTTP"
echo ""
echo "⚠️  For HTTPS, you'll need to accept the self-signed certificate warning"
echo ""
echo "📖 For more information, see README.md"