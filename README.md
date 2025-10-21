# 🚀 Simple MediaSoup

A comprehensive, easy-to-use WebRTC solution built on top of MediaSoup that abstracts away complexity and provides simple APIs for both client and server applications.

## ✨ What Makes It Simple?

Instead of dealing with hundreds of lines of MediaSoup boilerplate code, you get:

**Before (Raw MediaSoup):**

```typescript
// 100+ lines of setup code
const worker = await mediasoup.createWorker(workerSettings);
const router = await worker.createRouter(routerOptions);
const transport = await router.createWebRtcTransport(transportOptions);
// ... lots more complex setup
```

**After (Simple MediaSoup):**

```typescript
// Client - Just 3 lines!
const client = new SimpleClient({ serverUrl: "http://localhost:3000" });
await client.connect("my-room", "John Doe");
// That's it! Audio, video, and events are handled automatically.

// Server - Just 2 lines!
const server = new SimpleServer({ port: 3000 });
await server.start();
// Conference management, participant tracking, everything is automatic.
```

## 🎯 Features

### 🖥️ Client Features

- **📞 One-line conference joining**
- **🎥 Automatic audio/video handling**
- **🔇 Simple mute/unmute controls**
- **🖥️ Built-in screen sharing**
- **🔔 Real-time event notifications**
- **📱 Mobile-friendly**
- **⚡ Auto-stream consumption**

### 🏠 Server Features

- **🚀 Instant server setup**
- **🏠 Automatic conference management**
- **👥 Real-time participant tracking**
- **📊 Built-in statistics and monitoring**
- **🛡️ Admin tools (kick, broadcast, etc.)**
- **🔧 Automatic cleanup**
- **📈 Performance monitoring**

## 📁 Project Structure

```
simple_mediasoup/
├── simple_ms_client/          # 🖥️ Client-side package
│   ├── src/
│   │   ├── SimpleClient.ts    # 🎯 Main easy-to-use client
│   │   ├── client.ts          # 📤 Package exports
│   │   ├── controller/        # 🎮 Socket & MediaSoup controllers
│   │   └── mediasoup/         # 🔧 Advanced MediaSoup clients
│   ├── example/               # 📋 Usage examples & HTML demo
│   └── README.md              # 📖 Client documentation
├── simple_ms_server/          # 🏠 Server-side package
│   ├── src/
│   │   ├── SimpleServer.ts    # 🎯 Main easy-to-use server
│   │   ├── index.ts           # 📤 Package exports
│   │   ├── controllers/       # 🎮 MediaSoup & Socket controllers
│   │   ├── mediasoup/         # 🔧 Advanced MediaSoup server
│   │   ├── models/            # 📊 Data models
│   │   └── workers/           # ⚙️ MediaSoup worker management
│   ├── example/               # 📋 Usage examples
│   └── README.md              # 📖 Server documentation
└── simple_ms_types/           # 📘 Shared TypeScript types
    └── src/                   # 🔗 Common interfaces
```

## 🚀 Quick Start

### 1. Client Setup (3 lines of code!)

```typescript
import { SimpleClient } from "simple_ms_client";

const client = new SimpleClient({
  serverUrl: "http://localhost:3000",
});

await client.connect("demo-room", "Your Name");
// Done! You're now in a video call with automatic media handling.
```

### 2. Server Setup (2 lines of code!)

```typescript
import { SimpleServer } from "simple_ms_server";

const server = new SimpleServer({ port: 3000 });
await server.start();
// Done! Your WebRTC server is running with automatic conference management.
```

### 3. Complete Working Example

**Server (server.js):**

```typescript
import { SimpleServer } from "simple_ms_server";

const server = new SimpleServer({
  port: 3000,
  cors: { origin: "*" },
});

// Optional: Add event logging
server.on("participantJoined", (event) => {
  console.log(`👋 ${event.detail.participant.name} joined!`);
});

await server.start();
console.log("🚀 Server running on http://localhost:3000");
```

**Client (client.js):**

```typescript
import { SimpleClient } from "simple_ms_client";

const client = new SimpleClient({
  serverUrl: "http://localhost:3000",
  enableAudio: true,
  enableVideo: true,
});

// Setup UI event handlers
client.on("localStreamReady", (event) => {
  document.getElementById("localVideo").srcObject = event.detail.stream;
});

client.on("remoteStreamAdded", (event) => {
  const video = document.createElement("video");
  video.srcObject = event.detail.stream.stream;
  video.autoplay = true;
  document.getElementById("remoteVideos").appendChild(video);
});

// Join conference
await client.connect("my-room", "John Doe");

// Simple controls
document.getElementById("muteBtn").onclick = () => client.toggleAudio();
document.getElementById("videoBtn").onclick = () => client.toggleVideo();
document.getElementById("shareBtn").onclick = () => client.startScreenShare();
```

That's it! You now have a fully functional WebRTC video conferencing application.

## 🎬 Live Demo

Run the included example:

```bash
# Terminal 1: Start the server
cd simple_ms_server
npm install && npm run build && npm start

# Terminal 2: Start the client demo
cd simple_ms_client
npm install && npm run build
# Open example/index.html in your browser
```

## 📚 Detailed Documentation

- **[📖 Client Documentation](./simple_ms_client/README.md)** - Complete client API reference
- **[📖 Server Documentation](./simple_ms_server/README.md)** - Complete server API reference
- **[🔧 Advanced Usage](./docs/)** - Custom implementations and advanced features

## 🎯 Use Cases

### 💼 Video Conferencing

```typescript
const client = new SimpleClient({ serverUrl: "ws://yourserver.com" });
await client.connect(meetingId, userName);
// Automatic audio, video, participant management
```

### 📡 Live Streaming

```typescript
const server = new SimpleServer({ port: 3000 });
server.on("producerCreated", (event) => {
  // Relay to CDN, start recording, etc.
  startStreamRecording(event.detail.participantId);
});
```

### 🎓 Online Education

```typescript
const client = new SimpleClient({ serverUrl: "ws://school.com" });
client.on("participantJoined", (event) => {
  if (event.detail.participant.name.includes("Teacher")) {
    // Give teacher controls
    showTeacherControls();
  }
});
```

### 📱 Social Apps

```typescript
const client = new SimpleClient({
  serverUrl: "ws://social.com",
  enableVideo: false, // Audio-only social rooms
});
await client.connect(roomId, username);
```

## ⚡ Performance

- **🚀 Fast Setup**: Get running in under 30 seconds
- **📈 Scalable**: Handles hundreds of participants per server
- **🔄 Auto-Optimization**: Built-in load balancing and cleanup
- **📱 Mobile Optimized**: Works great on mobile browsers
- **🌐 Cross-Platform**: Works on all modern browsers

## 🔍 Comparison

| Feature            | Simple MediaSoup | Raw MediaSoup | Other Solutions |
| ------------------ | ---------------- | ------------- | --------------- |
| **Setup Time**     | 30 seconds       | Hours         | Days            |
| **Lines of Code**  | 5 lines          | 500+ lines    | 1000+ lines     |
| **Event Handling** | Built-in         | Manual        | Custom          |
| **Error Handling** | Automatic        | Manual        | Limited         |
| **Documentation**  | Simple           | Technical     | Complex         |
| **TypeScript**     | Full support     | Partial       | Varies          |
| **Mobile Support** | Built-in         | Manual setup  | Limited         |

## 🛠️ Advanced Features

For developers who need more control, we also export all the underlying MediaSoup components:

```typescript
// Advanced client usage
import {
  SimpleClient, // ⭐ Recommended for most use cases
  MediasoupClient, // 🔧 For custom media handling
  SocketClientController, // 🎮 For custom socket logic
  ConferenceClient, // 🏠 For custom conference logic
} from "simple_ms_client";

// Advanced server usage
import {
  SimpleServer, // ⭐ Recommended for most use cases
  MediasoupController, // 🔧 For custom MediaSoup logic
  SocketController, // 🎮 For custom socket handling
  WorkerService, // ⚙️ For custom worker management
} from "simple_ms_server";
```

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 Bug fixes
- ✨ New features
- 📖 Documentation improvements
- 🧪 Testing
- 💡 Ideas and suggestions

Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 **Documentation**: Check the README files in each package
- 🐛 **Issues**: Create an issue on GitHub
- 💬 **Discussions**: Join our GitHub Discussions
- 📧 **Email**: Contact us for enterprise support

---

**Made with ❤️ for developers who want simple WebRTC**

_Stop wrestling with MediaSoup complexity. Start building amazing real-time applications today!_

## Features

### 🎥 **Core Conference Features**

- **Multi-participant video/audio conferencing**
- **Real-time media streaming** with WebRTC
- **Automatic participant management**
- **Conference lifecycle management**

### 🎛️ **Media Controls**

- **Mute/Unmute audio and video**
- **Pause/Resume producers and consumers**
- **Real-time media state synchronization**
- **Dynamic producer/consumer management**

### 🚀 **Scalability & Performance**

- **Intelligent worker load balancing**
- **Automatic resource cleanup**
- **Conference auto-cleanup when empty**
- **Performance monitoring and statistics**

### 🛡️ **Reliability**

- **Comprehensive error handling**
- **Graceful disconnect handling**
- **Memory leak prevention**
- **Event-driven architecture**

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Server App    │    │   MediaSoup     │
│                 │    │                 │    │   Workers       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ MediasoupClient │◄──►│ SocketController│◄──►│ WorkerService   │
│ SocketClient    │    │ MediasoupCtrl   │    │ Router/Transport│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Packages

- **`simple_ms_server`** - MediaSoup server implementation
- **`simple_ms_client`** - Client-side MediaSoup wrapper
- **`simple_ms_types`** - Shared TypeScript definitions

## Quick Start

### Installation

```bash
# Install all packages
pnpm install

# Build packages
pnpm run build:types
pnpm run build:server
pnpm run build:client
```

### Server Setup

```typescript
import { Server } from "socket.io";
import { createServer } from "http";
import {
  WorkerService,
  MediasoupController,
  SocketEventController,
} from "simple_ms_server";
import type { MediasoupConfig } from "@simple-mediasoup/types";

// Configure MediaSoup
const mediasoupConfig: MediasoupConfig = {
  workerConfig: {
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  },
  routerConfig: {
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
      },
    ],
  },
  transportConfig: {
    listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
};

// Create HTTP server
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Initialize MediaSoup services
const workerService = new WorkerService(mediasoupConfig);
const mediasoupController = new MediasoupController(workerService);
const socketController = new SocketEventController(mediasoupController, io);

// Start workers
await workerService.createWorkers();

// Start server
httpServer.listen(3000, () => {
  console.log("MediaSoup server listening on port 3000");
});
```

### Client Setup

```typescript
import { io } from "socket.io-client";
import { SocketClientController, MediasoupClient } from "simple_ms_client";
import type { MediasoupClientConfig } from "simple_ms_client";

// Connect to server
const socket = io("http://localhost:3000");

// Configure client
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

// Initialize client
const socketClient = new SocketClientController(socket, {
  conferenceId: "my-conference",
  participantId: "user-123",
  participantName: "John Doe",
  socketId: socket.id,
});

const mediasoupClient = new MediasoupClient(socketClient, config);

// Join conference
await mediasoupClient.joinConference();
await mediasoupClient.enableMedia(true, true); // audio, video

// Handle events
mediasoupClient.addEventListener("localStreamReady", (event) => {
  const { stream } = event.detail;
  // Attach local stream to video element
  document.getElementById("localVideo").srcObject = stream;
});

mediasoupClient.addEventListener("remoteStreamAdded", (event) => {
  const { stream, participantId } = event.detail;
  // Create video element for remote stream
  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  document.body.appendChild(video);
});
```

## Documentation

- [**Server Documentation**](./docs/server.md) - Complete server setup and API reference
- [**Client Documentation**](./docs/client.md) - Client implementation guide
- [**API Reference**](./docs/api.md) - Detailed API documentation
- [**Examples**](./examples/) - Working examples and demos

## Examples

### Basic Conference App

```bash
cd examples/basic-conference
pnpm install
pnpm run dev
```

### Advanced Features Demo

```bash
cd examples/advanced-features
pnpm install
pnpm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/vidya-hub/simple_mediasoup/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vidya-hub/simple_mediasoup/discussions)
- **Documentation**: [Full Documentation](./docs/)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.
