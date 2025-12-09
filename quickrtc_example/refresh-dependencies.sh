#!/bin/bash

# QuickRTC - Refresh Dependencies Script
# This script builds all the modules and installs them in the example folder

set -e

echo "🔄 QuickRTC - Refreshing Dependencies"
echo "============================================="

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE_DIR="$PROJECT_ROOT/quickrtc_example"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Example directory: $EXAMPLE_DIR"

# Function to print colored output
print_step() {
    echo ""
    echo "🔧 $1"
    echo "----------------------------------------"
}

print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
    exit 1
}

# Check if we're in the right directory
if [ ! -d "$PROJECT_ROOT/quickrtc_types" ] || [ ! -d "$PROJECT_ROOT/quickrtc_server" ] || [ ! -d "$PROJECT_ROOT/quickrtc_client" ]; then
    print_error "Required directories not found. Make sure you're running this from the quickrtc_example directory."
fi

# Clean previous builds
print_step "Cleaning previous builds"
cd "$PROJECT_ROOT"
for dir in quickrtc_types quickrtc_server quickrtc_client quickrtc_example; do
    if [ -d "$dir/dist" ]; then
        echo "Cleaning $dir/dist"
        rm -rf "$dir/dist"
    fi
    if [ -d "$dir/node_modules" ]; then
        echo "Cleaning $dir/node_modules"
        rm -rf "$dir/node_modules"
    fi
done
print_success "Previous builds cleaned"

# Install dependencies and build each module in dependency order
print_step "Building quickrtc_types"
cd "$PROJECT_ROOT/quickrtc_types"
npm install
npm run build
print_success "quickrtc_types built successfully"

print_step "Building quickrtc_server"
cd "$PROJECT_ROOT/quickrtc_server"
npm install
npm run build
print_success "quickrtc_server built successfully"

print_step "Building quickrtc_client"
cd "$PROJECT_ROOT/quickrtc_client"
npm install
npm run build
print_success "quickrtc_client built successfully"

# Install dependencies in example project
print_step "Installing dependencies in example project"
cd "$EXAMPLE_DIR"
npm install
print_success "Example project dependencies installed"

# Build the example project
print_step "Building example project"
npm run build:example
print_success "Example project built successfully"


# Final verification
print_step "Verifying builds"
for module in quickrtc_types quickrtc_server quickrtc_client quickrtc_example; do
    if [ -d "$PROJECT_ROOT/$module/dist" ]; then
        echo "✅ $module/dist exists"
    else
        print_error "$module/dist not found"
    fi
done

echo ""
echo "🎉 All dependencies refreshed successfully!"
echo ""
echo "📋 What was done:"
echo "  • Cleaned all previous builds and node_modules"
echo "  • Built quickrtc_types"
echo "  • Built quickrtc_server"
echo "  • Built quickrtc_client"
echo "  • Installed example project dependencies"
echo "  • Built example project"
echo "  • Created development symlinks"
echo ""
echo "🚀 You can now run the example server:"
echo "  npm start        # HTTP server"
echo "  npm start:https  # HTTPS server"
echo ""
echo "🔧 For development with auto-rebuild:"
echo "  npm run watch        # HTTP with auto-reload"
echo "  npm run watch:https  # HTTPS with auto-reload"