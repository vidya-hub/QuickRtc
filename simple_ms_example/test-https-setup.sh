#!/bin/bash

echo "🔧 Testing Simple MediaSoup HTTPS Setup..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the simple_ms_example directory"
    exit 1
fi

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo "❌ Error: OpenSSL is not installed. Please install OpenSSL first."
    echo "   macOS: brew install openssl"
    echo "   Ubuntu: sudo apt-get install openssl"
    echo "   CentOS: sudo yum install openssl"
    exit 1
fi

# Generate certificates
echo "📜 Generating SSL certificates..."
npm run generate-certs

if [ $? -eq 0 ]; then
    echo "✅ SSL certificates generated successfully"
    echo "   - Private key: certs/key.pem"
    echo "   - Certificate: certs/cert.pem"
else
    echo "❌ Failed to generate SSL certificates"
    exit 1
fi

# Check if certificates were created
if [ -f "certs/key.pem" ] && [ -f "certs/cert.pem" ]; then
    echo "🔍 Certificate details:"
    openssl x509 -in certs/cert.pem -text -noout | grep -E "(Subject:|Not Before|Not After|DNS:|IP Address:)"
    echo ""
    echo "🚀 Setup complete! You can now run:"
    echo "   npm run start:https"
    echo ""
    echo "   Then open: https://localhost:3443"
    echo "   (Accept the self-signed certificate warning in your browser)"
else
    echo "❌ Certificate files not found after generation"
    exit 1
fi