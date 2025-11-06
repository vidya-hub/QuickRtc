#!/bin/bash

# Script to run the MediaSoup server with ngrok configuration

echo "🌐 Starting MediaSoup server with ngrok configuration..."

# Check if ngrok URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your ngrok URL as an argument"
    echo "Usage: ./start-ngrok.sh https://your-subdomain.ngrok-free.app"
    exit 1
fi

NGROK_URL="$1"

# Extract domain from URL
DOMAIN=$(echo "$NGROK_URL" | sed -e 's|^https\?://||' -e 's|/.*||')

echo "🔍 Resolving IP address for $DOMAIN..."

# Get IP address from domain
IP_ADDRESS=$(nslookup "$DOMAIN" | grep -A 1 "Non-authoritative answer:" | grep "Address:" | head -1 | awk '{print $2}')

if [ -z "$IP_ADDRESS" ]; then
    echo "❌ Could not resolve IP address for $DOMAIN"
    exit 1
fi

echo "✅ Resolved $DOMAIN to IP: $IP_ADDRESS"

# Set environment variables for this session
export MEDIASOUP_LISTEN_IP="0.0.0.0"
export MEDIASOUP_ANNOUNCED_IP="$IP_ADDRESS"
export USE_HTTPS="true"
export HOST="0.0.0.0"

echo "🚀 Starting server with the following MediaSoup configuration:"
echo "   Listen IP: $MEDIASOUP_LISTEN_IP"
echo "   Announced IP: $MEDIASOUP_ANNOUNCED_IP"
echo "   Your ngrok URL: $NGROK_URL"
echo ""

# Start the server
npm run dev