#!/bin/bash
# Mac M4 Pro System Tuning for WebRTC Load Testing
#
# This script optimizes macOS settings for handling 1000+ concurrent
# WebSocket and WebRTC connections.
#
# Usage:
#   sudo ./tune-macos.sh          # Apply optimizations
#   sudo ./tune-macos.sh --reset  # Reset to defaults
#
# NOTE: Some changes require sudo and may need a restart to take full effect.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Mac M4 Pro - WebRTC Load Testing Optimization${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run with sudo: sudo $0"
        exit 1
    fi
}

# Default optimization values for M4 Pro (high performance)
FILE_LIMIT=65535
MAX_FILES_PER_PROC=65535
SOMAXCONN=2048
TCP_KEEPALIVE=60

show_current() {
    print_header
    echo ""
    print_info "Current System Settings:"
    echo ""
    
    echo "  File Descriptors:"
    echo "    - Soft limit: $(ulimit -Sn)"
    echo "    - Hard limit: $(ulimit -Hn)"
    echo "    - kern.maxfiles: $(sysctl -n kern.maxfiles 2>/dev/null || echo 'N/A')"
    echo "    - kern.maxfilesperproc: $(sysctl -n kern.maxfilesperproc 2>/dev/null || echo 'N/A')"
    echo ""
    
    echo "  Network:"
    echo "    - kern.ipc.somaxconn: $(sysctl -n kern.ipc.somaxconn 2>/dev/null || echo 'N/A')"
    echo "    - net.inet.tcp.keepidle: $(sysctl -n net.inet.tcp.keepidle 2>/dev/null || echo 'N/A')"
    echo "    - net.inet.tcp.keepintvl: $(sysctl -n net.inet.tcp.keepintvl 2>/dev/null || echo 'N/A')"
    echo ""
    
    echo "  Memory:"
    echo "    - Total RAM: $(sysctl -n hw.memsize | awk '{print $1/1024/1024/1024 " GB"}')"
    echo "    - CPU cores: $(sysctl -n hw.ncpu)"
    echo ""
}

apply_optimizations() {
    check_root
    print_header
    echo ""
    print_info "Applying optimizations for WebRTC load testing..."
    echo ""
    
    # File descriptor limits
    print_info "Setting file descriptor limits..."
    sysctl -w kern.maxfiles=$FILE_LIMIT 2>/dev/null || print_warn "Could not set kern.maxfiles"
    sysctl -w kern.maxfilesperproc=$MAX_FILES_PER_PROC 2>/dev/null || print_warn "Could not set kern.maxfilesperproc"
    
    # Network optimizations
    print_info "Optimizing network settings..."
    sysctl -w kern.ipc.somaxconn=$SOMAXCONN 2>/dev/null || print_warn "Could not set somaxconn"
    sysctl -w net.inet.tcp.keepidle=$((TCP_KEEPALIVE * 1000)) 2>/dev/null || print_warn "Could not set keepidle"
    sysctl -w net.inet.tcp.keepintvl=$((TCP_KEEPALIVE * 1000 / 2)) 2>/dev/null || print_warn "Could not set keepintvl"
    
    # Create launchd plist for persistent limits
    PLIST_FILE="/Library/LaunchDaemons/limit.maxfiles.plist"
    print_info "Creating persistent file limit configuration..."
    
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>limit.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
      <string>launchctl</string>
      <string>limit</string>
      <string>maxfiles</string>
      <string>$FILE_LIMIT</string>
      <string>$FILE_LIMIT</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>ServiceIPC</key>
    <false/>
  </dict>
</plist>
EOF
    
    # Load the plist
    launchctl load -w "$PLIST_FILE" 2>/dev/null || print_warn "Could not load plist (may already be loaded)"
    
    # Set current session limits
    launchctl limit maxfiles $FILE_LIMIT $FILE_LIMIT 2>/dev/null || true
    
    echo ""
    print_info "Optimizations applied!"
    echo ""
    
    show_current
    
    print_warn "Some changes may require a restart to take full effect."
    echo ""
    
    # Create a helper script for setting ulimit in shells
    PROFILE_LINE="ulimit -n $FILE_LIMIT"
    
    print_info "To set ulimit in your current shell, run:"
    echo "    ulimit -n $FILE_LIMIT"
    echo ""
    
    print_info "To make this permanent, add to your ~/.zshrc or ~/.bashrc:"
    echo "    echo 'ulimit -n $FILE_LIMIT' >> ~/.zshrc"
    echo ""
}

reset_defaults() {
    check_root
    print_header
    echo ""
    print_info "Resetting to macOS defaults..."
    echo ""
    
    # Remove persistent plist
    PLIST_FILE="/Library/LaunchDaemons/limit.maxfiles.plist"
    if [ -f "$PLIST_FILE" ]; then
        launchctl unload "$PLIST_FILE" 2>/dev/null || true
        rm -f "$PLIST_FILE"
        print_info "Removed persistent file limit configuration"
    fi
    
    # Reset sysctl values to typical defaults
    sysctl -w kern.maxfiles=12288 2>/dev/null || true
    sysctl -w kern.maxfilesperproc=10240 2>/dev/null || true
    sysctl -w kern.ipc.somaxconn=128 2>/dev/null || true
    
    print_info "Reset complete. Restart recommended."
    echo ""
    
    show_current
}

docker_optimize() {
    print_header
    echo ""
    print_info "Docker Desktop Optimization Tips for M4 Pro:"
    echo ""
    echo "  1. Open Docker Desktop > Settings > Resources"
    echo ""
    echo "  2. Recommended settings for load testing:"
    echo "     - CPUs: 8-10 (leave 2-4 for host)"
    echo "     - Memory: 12-16 GB"
    echo "     - Swap: 2 GB"
    echo "     - Disk image size: 64+ GB"
    echo ""
    echo "  3. Enable 'Use Virtualization framework' (faster on Apple Silicon)"
    echo ""
    echo "  4. Enable 'Use Rosetta for x86/amd64 emulation' if using x86 images"
    echo ""
    print_info "After changes, restart Docker Desktop"
    echo ""
}

# Main
case "${1:-}" in
    --reset|-r)
        reset_defaults
        ;;
    --show|-s)
        show_current
        ;;
    --docker|-d)
        docker_optimize
        ;;
    --help|-h)
        echo "Usage: sudo $0 [option]"
        echo ""
        echo "Options:"
        echo "  (none)      Apply optimizations"
        echo "  --reset     Reset to defaults"
        echo "  --show      Show current settings"
        echo "  --docker    Show Docker optimization tips"
        echo "  --help      Show this help"
        echo ""
        echo "This script optimizes macOS for handling 1000+ concurrent"
        echo "WebSocket and WebRTC connections during load testing."
        ;;
    *)
        apply_optimizations
        ;;
esac
