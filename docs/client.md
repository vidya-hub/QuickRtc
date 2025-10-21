# Client Documentation

The Simple MediaSoup Client provides an easy-to-use interface for connecting to MediaSoup conferences with full media control capabilities.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Components](#core-components)
- [API Reference](#api-reference)
- [Events](#events)
- [Media Management](#media-management)
- [Advanced Usage](#advanced-usage)

## Installation

```bash
# Install the client package
pnpm add simple_ms_client @simple-mediasoup/types

# Peer dependencies
pnpm add mediasoup-client socket.io-client
```

## Quick Start

### Basic Client Setup

```typescript
import { io } from "socket.io-client";
import { SocketClientController, MediasoupClient } from "simple_ms_client";
import type { MediasoupClientConfig } from "simple_ms_client";

// Connect to MediaSoup server
const socket = io("http://localhost:3000");

// Configure the client
const config: MediasoupClientConfig = {
  enableAudio: true,
  enableVideo: true,
  videoConstraints: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audioConstraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

// Initialize client components
const socketClient = new SocketClientController(socket, {
  conferenceId: "my-conference",
  participantId: "user-123",
  participantName: "John Doe",
  socketId: socket.id,
});

const mediasoupClient = new MediasoupClient(socketClient, config);

async function joinConference() {
  try {
    // Join the conference
    await mediasoupClient.joinConference();

    // Enable media (camera and microphone)
    await mediasoupClient.enableMedia(true, true);

    console.log("Successfully joined conference!");
  } catch (error) {
    console.error("Failed to join conference:", error);
  }
}

// Start the conference
joinConference();
```

### HTML Setup

```html
<!DOCTYPE html>
<html>
  <head>
    <title>MediaSoup Conference</title>
  </head>
  <body>
    <div id="conference">
      <video id="localVideo" autoplay muted></video>
      <div id="remoteVideos"></div>

      <div id="controls">
        <button id="muteAudio">Mute Audio</button>
        <button id="muteVideo">Mute Video</button>
        <button id="leaveConference">Leave</button>
      </div>
    </div>

    <script src="app.js"></script>
  </body>
</html>
```

## Core Components

### SocketClientController

Handles WebSocket communication with the server:

```typescript
import { SocketClientController } from "simple_ms_client";

const socketClient = new SocketClientController(socket, {
  conferenceId: "conference-123",
  participantId: "user-456",
  participantName: "Alice Smith",
  socketId: socket.id,
  webRtcTransportOptions: {
    // Optional transport options
  },
});

// Setup event listeners for real-time updates
socketClient.setupEventListeners();
```

### MediasoupClient

Main client class for media management:

```typescript
import { MediasoupClient } from "simple_ms_client";

const client = new MediasoupClient(socketClient, {
  enableAudio: true,
  enableVideo: true,
  videoConstraints: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 30, max: 60 },
  },
  audioConstraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
});
```

## API Reference

### MediasoupClient Methods

#### Conference Management

```typescript
// Join conference and initialize device
async joinConference(): Promise<void>

// Leave conference and cleanup resources
async leaveConference(): Promise<void>

// Enable media (camera/microphone)
async enableMedia(audio: boolean = true, video: boolean = true): Promise<void>
```

#### Media Controls

```typescript
// Audio controls
async muteAudio(): Promise<void>
async unmuteAudio(): Promise<void>
isAudioMuted(): boolean

// Video controls
async muteVideo(): Promise<void>
async unmuteVideo(): Promise<void>
isVideoMuted(): boolean
```

#### Stream Management

```typescript
// Get local media stream
getLocalStream(): MediaStream | undefined

// Get all remote streams
getRemoteStreams(): Map<string, MediaStream>

// Get current media state
getMediaState(): MediaState

// Consume remote media
async consumeMedia(producerId: string): Promise<void>
```

### SocketClientController Methods

#### Transport Operations

```typescript
// Create transports for sending and receiving media
async createTransports(): Promise<{
  sendTransport: any;
  recvTransport: any;
} | undefined>

// Join conference
async joinConference(): Promise<RtpCapabilities | undefined>

// Get existing producers in the conference
async getProducers(): Promise<string[] | undefined>
```

#### Producer Management

```typescript
// Pause/Resume producers
async pauseProducer(producerId: string): Promise<void>
async resumeProducer(producerId: string): Promise<void>

// Close producers
async closeProducer(producerId: string): Promise<void>
```

#### Consumer Management

```typescript
// Consume media from a producer
async consumeMedia(
  producerId: string,
  rtpCapabilities: RtpCapabilities
): Promise<any>

// Pause/Resume consumers
async pauseConsumer(consumerId: string): Promise<void>
async resumeConsumer(consumerId: string): Promise<void>

// Close consumers
async closeConsumer(consumerId: string): Promise<void>
```

#### Media State Operations

```typescript
// Server-side mute/unmute (affects all participants)
async muteAudio(): Promise<any>
async unmuteAudio(): Promise<any>
async muteVideo(): Promise<any>
async unmuteVideo(): Promise<any>

// Get media states from server
async getMediaStates(): Promise<any>

// Leave conference
async leaveConference(): Promise<void>
```

## Events

### MediasoupClient Events

#### Connection Events

```typescript
// Successfully connected to conference
client.addEventListener("connected", () => {
  console.log("Connected to conference");
});

// Disconnected from conference
client.addEventListener("disconnected", () => {
  console.log("Disconnected from conference");
});

// Connection error
client.addEventListener("error", (event) => {
  console.error("Client error:", event.detail);
});
```

#### Media Stream Events

```typescript
// Local media stream is ready
client.addEventListener("localStreamReady", (event) => {
  const { stream } = event.detail;
  const video = document.getElementById("localVideo");
  video.srcObject = stream;
});

// Remote stream added
client.addEventListener("remoteStreamAdded", (event) => {
  const { stream, consumerId, producerId, kind } = event.detail;

  // Create video element for remote stream
  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.id = `remote-${consumerId}`;

  if (kind === "video") {
    document.getElementById("remoteVideos").appendChild(video);
  }
});
```

#### Producer/Consumer Events

```typescript
// Producer created
client.addEventListener("producerCreated", (event) => {
  const { producerId, kind } = event.detail;
  console.log(`Producer created: ${producerId} (${kind})`);
});

// Producer closed
client.addEventListener("producerClosed", (event) => {
  const { producerId } = event.detail;
  console.log(`Producer closed: ${producerId}`);
});

// Consumer closed
client.addEventListener("consumerClosed", (event) => {
  const { consumerId } = event.detail;
  // Remove video element
  const video = document.getElementById(`remote-${consumerId}`);
  if (video) video.remove();
});
```

#### Participant Events

```typescript
// Participant left the conference
client.addEventListener("participantLeft", (event) => {
  const { participantId, closedConsumerIds } = event.detail;
  console.log(`Participant ${participantId} left`);

  // Clean up their video elements
  closedConsumerIds.forEach((consumerId) => {
    const video = document.getElementById(`remote-${consumerId}`);
    if (video) video.remove();
  });
});
```

#### Media Control Events

```typescript
// Local media muted/unmuted
client.addEventListener("audioMuted", () => {
  document.getElementById("muteAudio").textContent = "Unmute Audio";
});

client.addEventListener("audioUnmuted", () => {
  document.getElementById("muteAudio").textContent = "Mute Audio";
});

// Remote participant muted/unmuted
client.addEventListener("remoteAudioMuted", (event) => {
  const { participantId } = event.detail;
  console.log(`${participantId} muted their audio`);
});

client.addEventListener("remoteVideoMuted", (event) => {
  const { participantId } = event.detail;
  // You might want to show a "video off" indicator
});
```

## Media Management

### Camera and Microphone

```typescript
// Get user media with specific constraints
const config: MediasoupClientConfig = {
  videoConstraints: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: "user", // or 'environment' for back camera
  },
  audioConstraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2,
  },
};

// Enable media with custom constraints
await client.enableMedia(true, true);
```

### Screen Sharing

```typescript
// Enable screen sharing (you'll need to extend the client)
async function enableScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: true, // Include system audio
    });

    // Replace video track in existing producer
    const videoTrack = screenStream.getVideoTracks()[0];
    const videoProducer = client
      .getMediaState()
      .producers.get(client.getMediaState().videoProducerId);

    if (videoProducer) {
      await videoProducer.replaceTrack({ track: videoTrack });
    }

    // Handle screen share ending
    videoTrack.onended = () => {
      // Switch back to camera
      enableCamera();
    };
  } catch (error) {
    console.error("Screen share failed:", error);
  }
}
```

### Audio/Video Quality Control

```typescript
// Monitor connection quality
client.addEventListener('connected', async () => {
  const sendTransport = /* get send transport */;

  // Monitor stats every 2 seconds
  setInterval(async () => {
    const stats = await sendTransport.getStats();

    // Adjust quality based on stats
    stats.forEach(stat => {
      if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
        const packetLoss = stat.packetsLost / stat.packetsSent;

        if (packetLoss > 0.05) { // 5% packet loss
          // Reduce video quality
          adjustVideoQuality('low');
        }
      }
    });
  }, 2000);
});

function adjustVideoQuality(quality: 'low' | 'medium' | 'high') {
  // Implement quality adjustment logic
  const constraints = {
    low: { width: 320, height: 240, frameRate: 15 },
    medium: { width: 640, height: 480, frameRate: 24 },
    high: { width: 1280, height: 720, frameRate: 30 }
  };

  // Apply new constraints to video track
}
```

## Advanced Usage

### Complete Conference App

```typescript
class ConferenceApp {
  private client: MediasoupClient;
  private socketClient: SocketClientController;
  private localVideo: HTMLVideoElement;
  private remoteContainer: HTMLElement;

  constructor(serverUrl: string, conferenceId: string, userId: string) {
    const socket = io(serverUrl);

    this.socketClient = new SocketClientController(socket, {
      conferenceId,
      participantId: userId,
      participantName: `User ${userId}`,
      socketId: socket.id,
    });

    this.client = new MediasoupClient(this.socketClient, {
      enableAudio: true,
      enableVideo: true,
    });

    this.setupUI();
    this.setupEventListeners();
  }

  private setupUI() {
    this.localVideo = document.getElementById("localVideo") as HTMLVideoElement;
    this.remoteContainer = document.getElementById("remoteVideos");

    // Setup control buttons
    document.getElementById("muteAudio").onclick = () => this.toggleAudio();
    document.getElementById("muteVideo").onclick = () => this.toggleVideo();
    document.getElementById("leaveConference").onclick = () => this.leave();
  }

  private setupEventListeners() {
    this.client.addEventListener("localStreamReady", (event) => {
      this.localVideo.srcObject = event.detail.stream;
    });

    this.client.addEventListener("remoteStreamAdded", (event) => {
      this.addRemoteVideo(event.detail);
    });

    this.client.addEventListener("participantLeft", (event) => {
      this.removeParticipantVideos(event.detail);
    });

    this.client.addEventListener("error", (event) => {
      console.error("Conference error:", event.detail);
      this.showError(event.detail.message);
    });
  }

  async join() {
    try {
      await this.client.joinConference();
      await this.client.enableMedia(true, true);

      // Get existing producers and consume them
      const producers = await this.socketClient.getProducers();
      if (producers) {
        for (const producerId of producers) {
          await this.client.consumeMedia(producerId);
        }
      }
    } catch (error) {
      console.error("Failed to join conference:", error);
      this.showError("Failed to join conference");
    }
  }

  private async toggleAudio() {
    if (this.client.isAudioMuted()) {
      await this.client.unmuteAudio();
    } else {
      await this.client.muteAudio();
    }
    this.updateAudioButton();
  }

  private async toggleVideo() {
    if (this.client.isVideoMuted()) {
      await this.client.unmuteVideo();
    } else {
      await this.client.muteVideo();
    }
    this.updateVideoButton();
  }

  private addRemoteVideo(data: any) {
    const { stream, consumerId, participantId } = data;

    const videoContainer = document.createElement("div");
    videoContainer.className = "remote-video-container";
    videoContainer.id = `container-${consumerId}`;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.id = `video-${consumerId}`;

    const label = document.createElement("div");
    label.className = "participant-label";
    label.textContent = `Participant ${participantId}`;

    videoContainer.appendChild(video);
    videoContainer.appendChild(label);
    this.remoteContainer.appendChild(videoContainer);
  }

  private removeParticipantVideos(data: any) {
    const { closedConsumerIds } = data;

    closedConsumerIds.forEach((consumerId) => {
      const container = document.getElementById(`container-${consumerId}`);
      if (container) {
        container.remove();
      }
    });
  }

  private updateAudioButton() {
    const button = document.getElementById("muteAudio");
    button.textContent = this.client.isAudioMuted()
      ? "Unmute Audio"
      : "Mute Audio";
  }

  private updateVideoButton() {
    const button = document.getElementById("muteVideo");
    button.textContent = this.client.isVideoMuted()
      ? "Unmute Video"
      : "Mute Video";
  }

  private async leave() {
    await this.client.leaveConference();
    // Redirect or cleanup UI
  }

  private showError(message: string) {
    // Show error to user
    alert(`Error: ${message}`);
  }
}

// Usage
const app = new ConferenceApp(
  "http://localhost:3000",
  "my-conference",
  "user123"
);
app.join();
```

### Error Handling

```typescript
// Comprehensive error handling
client.addEventListener("error", (event) => {
  const error = event.detail;

  switch (error.name) {
    case "NotAllowedError":
      showError("Camera/microphone access denied");
      break;
    case "NotFoundError":
      showError("Camera/microphone not found");
      break;
    case "OverconstrainedError":
      showError("Camera/microphone constraints not supported");
      break;
    default:
      showError(`Unexpected error: ${error.message}`);
  }
});

// Network error handling
socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    // Server disconnected the client
    showError("Disconnected by server");
  } else {
    // Network issues
    showError("Network connection lost");
    // Attempt to reconnect
    socket.connect();
  }
});

// Reconnection handling
socket.on("reconnect", () => {
  // Rejoin conference after reconnection
  client.joinConference().catch(console.error);
});
```

### TypeScript Configuration

For optimal TypeScript support, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Browser Compatibility

The client requires browsers that support:

- WebRTC APIs
- MediaStream APIs
- ES2020 features

**Supported Browsers:**

- Chrome 74+
- Firefox 66+
- Safari 12.1+
- Edge 79+

**Note:** HTTPS is required for getUserMedia API in production.
