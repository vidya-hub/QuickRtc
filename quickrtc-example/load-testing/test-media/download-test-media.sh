#!/bin/bash
# =============================================================================
# Download Test Media for WebRTC Load Testing
# =============================================================================
# 
# This script downloads sample videos at various resolutions for realistic
# WebRTC load testing. Chrome can use these files as fake camera input.
#
# Usage:
#   ./download-test-media.sh           # Download all
#   ./download-test-media.sh 720p      # Download only 720p
#   ./download-test-media.sh 1080p     # Download only 1080p
#   ./download-test-media.sh 4k        # Download only 4K
#
# Requirements:
#   - curl or wget
#   - ffmpeg (for Y4M conversion and audio generation)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEOS_DIR="$SCRIPT_DIR/videos"
Y4M_DIR="$SCRIPT_DIR/y4m"
AUDIO_DIR="$SCRIPT_DIR/audio"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check for ffmpeg
check_ffmpeg() {
    if ! command -v ffmpeg &> /dev/null; then
        error "ffmpeg is required but not installed."
        echo "Install with: brew install ffmpeg"
        exit 1
    fi
}

# =============================================================================
# Download Functions
# =============================================================================

# Download a file with progress
download() {
    local url="$1"
    local output="$2"
    
    if [ -f "$output" ]; then
        log "Already exists: $output"
        return 0
    fi
    
    log "Downloading: $output"
    if command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$output" "$url"
    else
        wget --show-progress -O "$output" "$url"
    fi
}

# Generate a test video with ffmpeg (color bars + timer)
generate_test_video() {
    local width="$1"
    local height="$2"
    local fps="$3"
    local duration="$4"
    local output="$5"
    
    if [ -f "$output" ]; then
        log "Already exists: $output"
        return 0
    fi
    
    log "Generating test video: ${width}x${height}@${fps}fps - $output"
    
    # Create a test video with:
    # - SMPTE color bars background
    # - Timestamp overlay
    # - Moving element for motion testing
    ffmpeg -y -f lavfi -i "smptebars=size=${width}x${height}:rate=${fps}" \
        -f lavfi -i "sine=frequency=1000:sample_rate=48000" \
        -t "$duration" \
        -vf "drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=$((height/15)):fontcolor=white:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=h-th-20:text='%{pts\\:hms} - ${width}x${height}'" \
        -c:v libx264 -preset fast -crf 18 \
        -c:a aac -b:a 128k \
        -pix_fmt yuv420p \
        "$output" 2>/dev/null
}

# Convert video to Y4M format (Chrome's preferred raw format)
convert_to_y4m() {
    local input="$1"
    local output="$2"
    local max_frames="${3:-300}"  # Default 10 seconds at 30fps
    
    if [ -f "$output" ]; then
        log "Already exists: $output"
        return 0
    fi
    
    log "Converting to Y4M: $output"
    ffmpeg -y -i "$input" \
        -frames:v "$max_frames" \
        -pix_fmt yuv420p \
        "$output" 2>/dev/null
}

# Generate test audio (sine wave)
generate_test_audio() {
    local output="$1"
    local duration="${2:-60}"
    
    if [ -f "$output" ]; then
        log "Already exists: $output"
        return 0
    fi
    
    log "Generating test audio: $output"
    ffmpeg -y -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=$duration" \
        -c:a pcm_s16le \
        "$output" 2>/dev/null
}

# =============================================================================
# Main Download/Generate Functions
# =============================================================================

download_720p() {
    log "=== Setting up 720p test media ==="
    
    # Generate 720p test video (30 seconds)
    generate_test_video 1280 720 30 30 "$VIDEOS_DIR/test-720p-30fps.mp4"
    
    # Generate 720p at 60fps
    generate_test_video 1280 720 60 30 "$VIDEOS_DIR/test-720p-60fps.mp4"
    
    # Convert to Y4M (10 seconds = 300 frames)
    convert_to_y4m "$VIDEOS_DIR/test-720p-30fps.mp4" "$Y4M_DIR/test-720p.y4m" 300
}

download_1080p() {
    log "=== Setting up 1080p test media ==="
    
    # Generate 1080p test video
    generate_test_video 1920 1080 30 30 "$VIDEOS_DIR/test-1080p-30fps.mp4"
    
    # Generate 1080p at 60fps
    generate_test_video 1920 1080 60 30 "$VIDEOS_DIR/test-1080p-60fps.mp4"
    
    # Convert to Y4M
    convert_to_y4m "$VIDEOS_DIR/test-1080p-30fps.mp4" "$Y4M_DIR/test-1080p.y4m" 300
}

download_4k() {
    log "=== Setting up 4K test media ==="
    
    # Generate 4K test video (shorter duration due to size)
    generate_test_video 3840 2160 30 15 "$VIDEOS_DIR/test-4k-30fps.mp4"
    
    # Convert to Y4M (5 seconds = 150 frames, 4K Y4M files are huge!)
    convert_to_y4m "$VIDEOS_DIR/test-4k-30fps.mp4" "$Y4M_DIR/test-4k.y4m" 150
    
    warn "4K Y4M files are very large. Consider using MP4 for 4K testing."
}

download_audio() {
    log "=== Setting up test audio ==="
    
    # Generate test audio (60 seconds)
    generate_test_audio "$AUDIO_DIR/test-audio.wav" 60
    
    # Generate different frequency tones for multi-user testing
    ffmpeg -y -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=60" \
        -c:a pcm_s16le "$AUDIO_DIR/tone-440hz.wav" 2>/dev/null || true
    ffmpeg -y -f lavfi -i "sine=frequency=880:sample_rate=48000:duration=60" \
        -c:a pcm_s16le "$AUDIO_DIR/tone-880hz.wav" 2>/dev/null || true
}

download_all() {
    check_ffmpeg
    download_720p
    download_1080p
    download_4k
    download_audio
    
    log ""
    log "=== Test media setup complete! ==="
    log ""
    log "Video files:"
    ls -lh "$VIDEOS_DIR"/*.mp4 2>/dev/null || true
    log ""
    log "Y4M files (for Chrome --use-file-for-fake-video-capture):"
    ls -lh "$Y4M_DIR"/*.y4m 2>/dev/null || true
    log ""
    log "Audio files:"
    ls -lh "$AUDIO_DIR"/*.wav 2>/dev/null || true
}

# =============================================================================
# Alternative: Download real sample videos from public sources
# =============================================================================

download_sample_videos() {
    log "=== Downloading sample videos from public sources ==="
    
    # Big Buck Bunny - High quality open source video
    # 720p
    download "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4" \
        "$VIDEOS_DIR/bigbuckbunny-720p.mp4"
    
    # 1080p
    download "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4" \
        "$VIDEOS_DIR/bigbuckbunny-1080p.mp4"
    
    # Sintel trailer (another open source film)
    download "https://download.blender.org/peach/trailer/trailer_400p.ogg" \
        "$VIDEOS_DIR/sintel-trailer.ogg" || true
}

# =============================================================================
# Entry Point
# =============================================================================

case "${1:-all}" in
    720p)
        check_ffmpeg
        download_720p
        ;;
    1080p)
        check_ffmpeg
        download_1080p
        ;;
    4k)
        check_ffmpeg
        download_4k
        ;;
    audio)
        check_ffmpeg
        download_audio
        ;;
    samples)
        download_sample_videos
        ;;
    all)
        download_all
        ;;
    *)
        echo "Usage: $0 [720p|1080p|4k|audio|samples|all]"
        exit 1
        ;;
esac

log ""
log "Done! Use these files with Puppeteer:"
log "  --use-file-for-fake-video-capture=\$PWD/y4m/test-720p.y4m"
log "  --use-file-for-fake-audio-capture=\$PWD/audio/test-audio.wav"
