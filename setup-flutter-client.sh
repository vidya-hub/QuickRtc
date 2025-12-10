#!/bin/bash

# QuickRTC Flutter Client - Quick Setup Script
# This script sets up the Flutter client and example app

set -e

echo "🚀 QuickRTC Flutter Client - Quick Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}❌ Flutter is not installed. Please install Flutter first.${NC}"
    echo "Visit: https://flutter.dev/docs/get-started/install"
    exit 1
fi

echo -e "${GREEN}✓ Flutter found${NC}"
flutter --version
echo ""

# Navigate to Flutter client directory
echo -e "${BLUE}📦 Setting up quickrtc-flutter-client...${NC}"
cd quickrtc-flutter-client

# Install dependencies
echo "Installing dependencies..."
flutter pub get

# Generate code with build_runner
echo "Generating Freezed models..."
flutter pub run build_runner build --delete-conflicting-outputs

echo -e "${GREEN}✓ Client setup complete${NC}"
echo ""

# Navigate to example directory
cd ../quickrtc-flutter-example

echo -e "${BLUE}📱 Setting up quickrtc-flutter-example...${NC}"
echo "Installing dependencies..."
flutter pub get

echo -e "${GREEN}✓ Example app setup complete${NC}"
echo ""

# Analyze code
echo -e "${BLUE}🔍 Running Flutter analyze...${NC}"
cd ../quickrtc-flutter-client
flutter analyze

cd ../quickrtc-flutter-example
flutter analyze

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the QuickRTC server:"
echo -e "   ${BLUE}cd quickrtc_example${NC}"
echo -e "   ${BLUE}npm install${NC}"
echo -e "   ${BLUE}npm run start:https${NC}"
echo ""
echo "2. Run the Flutter example:"
echo -e "   ${BLUE}cd quickrtc-flutter-example${NC}"
echo -e "   ${BLUE}flutter run${NC}"
echo ""
echo "3. For iOS:"
echo -e "   ${BLUE}flutter run -d ios${NC}"
echo ""
echo "4. For Web:"
echo -e "   ${BLUE}flutter run -d chrome --web-browser-flag \"--disable-web-security\"${NC}"
echo ""
echo "📚 Documentation:"
echo "   - Client README: quickrtc-flutter-client/README.md"
echo "   - Setup Guide: quickrtc-flutter-client/SETUP.md"
echo "   - Example README: quickrtc-flutter-example/README.md"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
