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

## 🎬 Live Demo

**Try it now in 30 seconds with HTTPS:**

```bash
# Clone and run the example
git clone https://github.com/vidya-hub/simple_mediasoup.git
cd simple_mediasoup/simple_ms_example

# One-command setup and start
npm run setup && npm run start:https

# Open https://localhost:3443 in your browser
# Accept the self-signed certificate warning
```

**That's it!** You now have a fully functional video conferencing app with HTTPS support.

> **⚠️ Important:** HTTPS is required for WebRTC features like camera, microphone, and screen sharing to work in modern browsers. The example above uses self-signed certificates which are perfect for development.

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
│   └── README.md              # 📖 Client documentation
├── simple_ms_server/          # 🏠 Server-side package
│   ├── src/
│   │   ├── SimpleServer.ts    # 🎯 Main easy-to-use server
│   │   ├── index.ts           # 📤 Package exports
│   │   ├── controllers/       # 🎮 MediaSoup & Socket controllers
│   │   ├── mediasoup/         # 🔧 Advanced MediaSoup server
│   │   ├── models/            # 📊 Data models
│   │   └── workers/           # ⚙️ MediaSoup worker management
│   └── README.md              # 📖 Server documentation
├── simple_ms_types/           # 📘 Shared TypeScript types
│   └── src/                   # 🔗 Common interfaces
└── simple_ms_example/         # 🎬 Complete working example
    ├── server.js              # Express + MediaSoup server
    ├── public/
    │   └── index.html         # Web client interface
    └── README.md              # Example usage guide
```

## 🚀 Quick Start

### Option 1: Run the Complete Example (Recommended)

**One-Command Setup:**

```bash
# Clone the repository
git clone https://github.com/vidya-hub/simple_mediasoup.git
cd simple_mediasoup/simple_ms_example

# Setup everything and start HTTPS server
npm run setup && npm run start:https

# Open https://localhost:3443 in your browser
# Accept the self-signed certificate warning
```

**Step-by-Step Setup:**

```bash
# Clone the repository
git clone https://github.com/vidya-hub/simple_mediasoup.git
cd simple_mediasoup/simple_ms_example

# Install dependencies and build
npm install && npm run build

# Generate SSL certificates for HTTPS (required for WebRTC)
npm run generate-certs

# Test HTTPS setup (optional)
npm run test-https

# Start the HTTPS server
npm run start:https

# Open https://localhost:3443 in your browser
# Accept the self-signed certificate warning
```

🎉 **That's it!** You now have a fully functional video conferencing application running locally with HTTPS.

### Option 2: Build Your Own Implementation

#### Server Setup (2 lines of code!)

```typescript
import { SimpleServer } from "simple_ms_server";

const server = new SimpleServer({ port: 3000 });
await server.start();
// Done! Your WebRTC server is running with automatic conference management.
```

#### Client Setup (3 lines of code!)

```typescript
import { SimpleClient } from "simple_ms_client";

const client = new SimpleClient({
  serverUrl: "http://localhost:3000",
});

await client.connect("demo-room", "Your Name");
// Done! You're now in a video call with automatic media handling.
```

## 📱 Complete Working Example

The `simple_ms_example` folder contains a complete Express.js application demonstrating both server and client usage:

**Features:**

- 🎥 Multi-participant video conferencing
- 🎤 Audio/video controls (mute/unmute)
- 🖥️ Screen sharing support
- 👥 Real-time participant tracking
- 📊 Statistics and monitoring APIs
- 🛡️ Admin controls (kick, close conferences)
- 📱 Responsive web interface

**Quick Demo:**

```bash
cd simple_ms_example
npm install && npm run build && npm start
# Open multiple browser tabs to http://localhost:3000
# Join the same room name to test multi-participant features
```

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

## 🔧 Advanced Usage

For developers who need more control, all underlying MediaSoup components are available:

```typescript
// Advanced server usage
import {
  SimpleServer, // ⭐ Recommended for most use cases
  MediasoupController, // 🔧 Custom MediaSoup logic
  SocketController, // � Custom socket handling
  WorkerService, // ⚙️ Custom worker management
} from "simple_ms_server";

// Advanced client usage
import {
  SimpleClient, // ⭐ Recommended for most use cases
  MediasoupClient, // � Custom media handling
  SocketClientController, // 🎮 Custom socket logic
  ConferenceClient, // 🏠 Custom conference logic
} from "simple_ms_client";
```

### Custom Server Implementation

```typescript
import { WorkerService, MediasoupController } from "simple_ms_server";

const workerService = new WorkerService(customConfig);
const controller = new MediasoupController(workerService);

// Implement custom conference logic
controller.on("newProducer", (producer) => {
  // Custom producer handling
  relayToCDN(producer);
  startRecording(producer);
});
```

### Custom Client Implementation

```typescript
import { MediasoupClient, SocketClientController } from "simple_ms_client";

const socketController = new SocketClientController(socket, config);
const mediasoupClient = new MediasoupClient(socketController, options);

// Custom event handling
mediasoupClient.on("newConsumer", (consumer) => {
  // Custom consumer logic
  applyVideoFilter(consumer.track);
  updateUI(consumer);
});
```

## 🚀 Production Deployment

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=your-public-ip

# SSL Configuration (required for HTTPS)
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY simple_ms_example/ .
RUN npm install && npm run build
EXPOSE 3000 10000-10100/udp
CMD ["npm", "start"]
```

### HTTPS Setup (Required for Production)

```typescript
import https from "https";
import fs from "fs";

const server = new SimpleServer({
  port: 443,
  https: {
    cert: fs.readFileSync("cert.pem"),
    key: fs.readFileSync("key.pem"),
  },
});
```

### Scaling for High Load

```typescript
const server = new SimpleServer({
  mediasoup: {
    workerSettings: {
      rtcMinPort: 10000,
      rtcMaxPort: 20000, // Increase port range
    },
    // Use multiple workers for CPU distribution
    numWorkers: 4,
  },
});
```

## 🆘 Support & Contributing

- 📖 **Documentation**: Package README files and this guide
- 🐛 **Issues**: [GitHub Issues](https://github.com/vidya-hub/simple_mediasoup/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/vidya-hub/simple_mediasoup/discussions)
- 🤝 **Contributing**: We welcome PRs! See [CONTRIBUTING.md](CONTRIBUTING.md)
- 📧 **Enterprise**: Contact us for commercial support

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

## 🏗️ Architecture

Simple MediaSoup uses a modular architecture that makes WebRTC development straightforward:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Express +     │    │   MediaSoup     │
│   (Browser)     │    │   Simple Server │    │   Workers       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ SimpleClient    │◄──►│ SocketController│◄──►│ WorkerService   │
│ MediasoupClient │    │ MediasoupCtrl   │    │ Router/Transport│
│ SocketClient    │    │ Conference Mgmt │    │ Producer/Consumer│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Packages

- **`simple_ms_server`** - High-level MediaSoup server with automatic conference management
- **`simple_ms_client`** - Browser-ready MediaSoup client with simple APIs
- **`simple_ms_types`** - Shared TypeScript definitions across all packages
- **`simple_ms_example`** - Complete working example with Express.js integration

## 📚 API Documentation

### 🏠 SimpleServer API

The server provides a high-level abstraction for MediaSoup server operations:

```typescript
import { SimpleServer } from "simple_ms_server";

const server = new SimpleServer({
  port: 3000,
  cors: { origin: "*" },
  mediasoup: {
    workerSettings: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
    },
  },
});

// Event handling
server.on("participantJoined", (event) => {
  console.log(`${event.detail.participant.name} joined!`);
});

// Start server
await server.start();
```

**Key Methods:**

- `start()` - Start the MediaSoup server
- `stop()` - Stop and cleanup
- `getConferences()` - List active conferences
- `getParticipants()` - List all participants
- `kickParticipant(id, reason)` - Remove a participant
- `closeConference(id, reason)` - Close entire conference
- `getStats()` - Server statistics

**Events:**

- `participantJoined/Left` - Participant lifecycle
- `conferenceCreated/Destroyed` - Conference lifecycle
- `producerCreated/Closed` - Media stream events
- `audioMuted/Unmuted` - Audio state changes
- `videoMuted/Unmuted` - Video state changes

### 🖥️ SimpleClient API

The client provides easy-to-use WebRTC functionality:

```typescript
import { SimpleClient } from "simple_ms_client";

const client = new SimpleClient({
  serverUrl: "http://localhost:3000",
  enableAudio: true,
  enableVideo: true,
  autoConsume: true,
});

// Connect to room
await client.connect("room-name", "Your Name");

// Media controls
await client.toggleAudio(); // Mute/unmute audio
await client.toggleVideo(); // Mute/unmute video
await client.startScreenShare(); // Share screen
```

**Key Methods:**

- `connect(roomId, name)` - Join conference
- `disconnect()` - Leave conference
- `enableMedia(audio, video)` - Enable local media
- `toggleAudio(mute?)` - Control audio
- `toggleVideo(mute?)` - Control video
- `startScreenShare()` - Share screen
- `getParticipants()` - List participants
- `getRemoteStreams()` - Get remote streams

**Events:**

- `connected/disconnected` - Connection state
- `participantJoined/Left` - Other participants
- `localStreamReady` - Your media ready
- `remoteStreamAdded/Removed` - Other streams
- `audioMuted/Unmuted` - Audio state changes
- `videoMuted/Unmuted` - Video state changes
- `screenShareStarted/Stopped` - Screen sharing

### 🔗 REST API Endpoints

The example server exposes monitoring and admin APIs:

```bash
# Monitoring
GET /api/conferences              # List conferences
GET /api/participants            # List participants
GET /api/stats                   # Server statistics
GET /api/conferences/:id/participants  # Conference participants

# Administration
POST /api/participants/:id/kick  # Kick participant
POST /api/conferences/:id/close  # Close conference
```

## 🔧 Troubleshooting

### MediaSoup Worker Binary Issues

**Error:** `mediasoup-worker ENOENT` - Binary not found

**Solution:** MediaSoup requires native binary compilation. Use npm instead of pnpm:

```bash
# In the example directory
cd simple_ms_example
rm -rf node_modules pnpm-lock.yaml
npm install
npm run start:https
```

**Alternative:** Rebuild MediaSoup manually:

```bash
cd node_modules/mediasoup
npm run worker:build
```

### HTTPS Certificate Issues

**Error:** Certificate warnings in browser

**Solution:** For development, accept the self-signed certificate warning. For production, use trusted certificates:

```bash
# Development certificates
npm run generate-certs

# Production with Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com
export SSL_CERT=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
export SSL_KEY=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### WebRTC Media Access Issues

**Error:** Camera/microphone not working

**Solution:**

- Ensure HTTPS is enabled (required for WebRTC)
- Grant browser permissions for camera/microphone
- Check browser compatibility (Chrome 74+, Firefox 66+, Safari 12.1+)

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⭐ Star History

If this project helped you, please give it a star! ⭐

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.
