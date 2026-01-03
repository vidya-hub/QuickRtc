#!/bin/bash
# Generate SSL certificates with SAN (Subject Alternative Name) for local network access
# This allows devices on your local network to connect without SSL errors

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/certs"

echo "Creating certificates directory..."
mkdir -p "$CERTS_DIR"

# Get all local IPv4 addresses (excluding loopback)
echo "Detecting local network IPs..."
LOCAL_IPS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | tr '\n' ' ')

# Build SAN (Subject Alternative Name) string
SAN="DNS:localhost,IP:127.0.0.1"
for ip in $LOCAL_IPS; do
  SAN="$SAN,IP:$ip"
  echo "  Found IP: $ip"
done

echo ""
echo "Generating certificate with SAN: $SAN"
echo ""

# Generate certificate with SAN
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout "$CERTS_DIR/key.pem" \
  -out "$CERTS_DIR/cert.pem" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=$SAN"

echo ""
echo "Certificates generated successfully!"
echo "  Key:  $CERTS_DIR/key.pem"
echo "  Cert: $CERTS_DIR/cert.pem"
echo ""
echo "Certificate details:"
openssl x509 -in "$CERTS_DIR/cert.pem" -noout -text | grep -A1 "Subject Alternative Name"
echo ""
echo "Note: Devices on your local network will still need to accept the self-signed certificate"
echo "      the first time they connect."
