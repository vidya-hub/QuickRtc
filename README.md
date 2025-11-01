# 🚀 Simple MediaSoup# 🚀 Simple MediaSoup

A comprehensive, production-ready WebRTC solution built on MediaSoup. Simplifies video conferencing with dependency injection architecture, comprehensive APIs, and complete TypeScript support.A comprehensive, easy-to-use WebRTC solution built on top of MediaSoup that abstracts away complexity and provides simple APIs for both client and server applications.

---## ✨ What Makes It Simple?

## 📋 Table of ContentsInstead of dealing with hundreds of lines of MediaSoup boilerplate code, you get:

- [Overview](#-overview)**Before (Raw MediaSoup):**

- [Quick Start](#-quick-start)

- [Packages](#-packages)```typescript

- [Features](#-features)// 100+ lines of setup code

- [Architecture](#-architecture)const worker = await mediasoup.createWorker(workerSettings);

- [Documentation](#-documentation)const router = await worker.createRouter(routerOptions);

- [Examples](#-examples)const transport = await router.createWebRtcTransport(transportOptions);

- [Contributing](#-contributing)// ... lots more complex setup

````

---

**After (Simple MediaSoup):**

## 🎯 Overview

```typescript

Simple MediaSoup provides an easy-to-use abstraction layer over MediaSoup, allowing you to build video conferencing applications without dealing with complex WebRTC and MediaSoup internals.// Client - Just 3 lines!

const client = new SimpleClient({ serverUrl: "http://localhost:3000" });

### Why Simple MediaSoup?await client.connect("my-room", "John Doe");

// That's it! Audio, video, and events are handled automatically.

**Before (Raw MediaSoup):**

// Server - Just 2 lines!

```typescriptconst server = new SimpleServer({ port: 3000 });

// 100+ lines of complex setup codeawait server.start();

const worker = await mediasoup.createWorker(workerSettings);// Conference management, participant tracking, everything is automatic.

const router = await worker.createRouter(routerOptions);```

const transport = await router.createWebRtcTransport(transportOptions);

// ... lots more complex setup and event handling## 🎬 Live Demo

````

**Try it now in 30 seconds with HTTPS:**

**After (Simple MediaSoup):**

````bash

```typescript# Clone and run the example

// SERVER - Just inject your servers!git clone https://github.com/vidya-hub/simple_mediasoup.git

const mediaServer = new SimpleServer({cd simple_mediasoup/simple_ms_example

  httpServer,      // Your HTTP/HTTPS server

  socketServer,    // Your Socket.IO server# One-command setup and start

  mediasoup: {}    // Optional MediaSoup confignpm run setup && npm run start:https

});

await mediaServer.start();# Open https://localhost:3443 in your browser

# Accept the self-signed certificate warning

// CLIENT - Just 3 methods!```

const client = new ConferenceClient({ conferenceId, participantId, socket });

await client.joinMeeting();**That's it!** You now have a fully functional video conferencing app with HTTPS support.

await client.produceMedia(audioTrack, videoTrack);

await client.consumeExistingStreams();> **⚠️ Important:** HTTPS is required for WebRTC features like camera, microphone, and screen sharing to work in modern browsers. The example above uses self-signed certificates which are perfect for development.

````

## 🎯 Features

---

### 🖥️ Client Features

## ⚡ Quick Start

- **📞 One-line conference joining**

### Try the Complete Example (30 seconds)- **🎥 Automatic audio/video handling**

- **🔇 Simple mute/unmute controls**

````bash- **🖥️ Built-in screen sharing**

# Clone and run- **🔔 Real-time event notifications**

git clone https://github.com/vidya-hub/simple_mediasoup.git- **📱 Mobile-friendly**

cd simple_mediasoup/simple_ms_example- **⚡ Auto-stream consumption**



# One-command setup and start### 🏠 Server Features

npm run setup && npm run start:https

- **🚀 Instant server setup**

# Open https://localhost:3443 in your browser- **🏠 Automatic conference management**

```- **👥 Real-time participant tracking**

- **📊 Built-in statistics and monitoring**

**That's it!** You now have a fully functional video conferencing app with:- **🛡️ Admin tools (kick, broadcast, etc.)**

- ✅ Multi-participant support- **🔧 Automatic cleanup**

- ✅ Audio/Video controls- **📈 Performance monitoring**

- ✅ Screen sharing

- ✅ Participant management## 📁 Project Structure

- ✅ Real-time events

````

> **⚠️ HTTPS Required**: Modern browsers require HTTPS for WebRTC features (camera, microphone, screen sharing). The example includes self-signed certificates for development.simple_mediasoup/

├── simple_ms_client/ # 🖥️ Client-side package

---│ ├── src/

│ │ ├── client.ts # 📤 Package exports

## 📦 Packages│ │ ├── controller/ # 🎮 Socket & MediaSoup controllers

│ │ └── mediasoup/ # 🔧 MediaSoup clients

This monorepo contains four packages:│ │ └── ConferenceClient.ts # 🎯 Main comprehensive client

│ └── README.md # 📖 Client documentation

### 1. **simple_ms_client** 🎥├── simple_ms_server/ # 🏠 Server-side package

│ ├── src/

Client-side WebRTC library for building video conferencing UIs.│ │ ├── SimpleServer.ts # 🎯 Main easy-to-use server

│ │ ├── index.ts # 📤 Package exports

````bash│ │   ├── controllers/       # 🎮 MediaSoup & Socket controllers

npm install simple_ms_client│   │   ├── mediasoup/         # 🔧 Advanced MediaSoup server

```│   │   ├── models/            # 📊 Data models

│   │   └── workers/           # ⚙️ MediaSoup worker management

**Key Features:**│   └── README.md              # 📖 Server documentation

- Event-driven architecture├── simple_ms_types/           # 📘 Shared TypeScript types

- Auto stream consumption│   └── src/                   # 🔗 Common interfaces

- Media controls (mute/unmute)└── simple_ms_example/         # 🎬 Complete working example

- Screen sharing support    ├── server.js              # Express + MediaSoup server

- TypeScript support    ├── public/

    │   └── index.html         # Web client interface

[📖 Client Documentation](./simple_ms_client/README.md)    └── README.md              # Example usage guide

````

---

## 🚀 Quick Start

### 2. **simple_ms_server** 🏠

### Option 1: Run the Complete Example (Recommended)

Server-side MediaSoup wrapper with dependency injection.

**One-Command Setup:**

````bash

npm install simple_ms_server```bash

```# Clone the repository

git clone https://github.com/vidya-hub/simple_mediasoup.git

**Key Features:**cd simple_mediasoup/simple_ms_example

- Dependency injection (bring your own HTTP/Socket.IO servers)

- Auto conference management# Setup everything and start HTTPS server

- Participant trackingnpm run setup && npm run start:https

- Event system

- Admin APIs# Open https://localhost:3443 in your browser

# Accept the self-signed certificate warning

[📖 Server Documentation](./simple_ms_server/README.md)```



---**Step-by-Step Setup:**



### 3. **simple_ms_types** 📘```bash

# Clone the repository

Shared TypeScript types for client and server.git clone https://github.com/vidya-hub/simple_mediasoup.git

cd simple_mediasoup/simple_ms_example

```bash

npm install simple_ms_types# Install dependencies and build

```npm install && npm run build



**Includes:**# Generate SSL certificates for HTTPS (required for WebRTC)

- Socket event typesnpm run generate-certs

- Conference types

- Participant types# Test HTTPS setup (optional)

- MediaSoup typesnpm run test-https



---# Start the HTTPS server

npm run start:https

### 4. **simple_ms_example** 🎬

# Open https://localhost:3443 in your browser

Complete working example application.# Accept the self-signed certificate warning

````

**Features:**

- Express + HTTPS server🎉 **That's it!** You now have a fully functional video conferencing application running locally with HTTPS.

- Multi-participant conferencing

- Responsive web UI### Option 2: Build Your Own Implementation

- API endpoints

- Admin controls#### Server Setup (2 lines of code!)

[📖 Example Documentation](./simple_ms_example/README.md)```typescript

import { SimpleServer } from "simple_ms_server";

---

const server = new SimpleServer({ port: 3000 });

## ✨ Featuresawait server.start();

// Done! Your WebRTC server is running with automatic conference management.

### 🖥️ Client Features```

| Feature | Description |#### Client Setup (3 lines of code!)

|---------|-------------|

| **Simple API** | Just 3 methods to join and start streaming |```typescript

| **Event-Driven** | Comprehensive event system for all actions |import { ConferenceClient } from "simple_ms_client";

| **Media Controls** | Toggle audio/video with single method calls |import { io } from "socket.io-client";

| **Screen Sharing** | Built-in screen share support |

| **Auto Consumption** | Automatically receive remote participant streams |// Connect to server

| **Participant Tracking** | Real-time participant list and events |const socket = io("http://localhost:3000");

| **TypeScript** | Full type safety and IntelliSense |

| **Error Handling** | Comprehensive error management |// Create conference client

const client = new ConferenceClient({

### 🏠 Server Features conferenceId: "demo-room",

participantId: "participant-123",

| Feature | Description | participantName: "Your Name",

|---------|-------------| socket,

| **Dependency Injection** | Inject your own HTTP and Socket.IO servers | conferenceName: "Demo Conference",

| **Auto Conference Management** | Automatic conference lifecycle handling | enableAudio: true,

| **Participant Management** | Track and manage participants | enableVideo: true,

| **Event System** | Emit events for all server activities |});

| **Statistics API** | Built-in performance monitoring |

| **Admin Tools** | Kick participants, close conferences |// Join and enable media

| **Auto Cleanup** | Automatic resource cleanup |await client.joinConference();

| **Multi-Framework** | Works with Express, Fastify, or any Node.js server |await client.enableMedia(true, true);

// Done! You're now in a video call with comprehensive event handling.

---```

## 🏗️ Architecture## 📱 Complete Working Example

### System OverviewThe `simple_ms_example` folder contains a complete Express.js application demonstrating both server and client usage:

````**Features:**

┌─────────────────────────────────────────────────────────────────┐

│                      BROWSER CLIENTS                             │- 🎥 Multi-participant video conferencing

│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │- 🎤 Audio/video controls (mute/unmute)

│  │   Client 1   │  │   Client 2   │  │   Client 3   │          │- 🖥️ Screen sharing support

│  │ Conference   │  │ Conference   │  │ Conference   │          │- 👥 Real-time participant tracking

│  │   Client     │  │   Client     │  │   Client     │          │- 📊 Statistics and monitoring APIs

│  └──────────────┘  └──────────────┘  └──────────────┘          │- 🛡️ Admin controls (kick, close conferences)

└─────────────────────────────────────────────────────────────────┘- 📱 Responsive web interface

         │                  │                  │

         └──────────────────┴──────────────────┘**Quick Demo:**

                            │ WebSocket + WebRTC

                            ▼```bash

┌─────────────────────────────────────────────────────────────────┐cd simple_ms_example

│                   YOUR APPLICATION SERVER                        │npm install && npm run build && npm start

│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │# Open multiple browser tabs to http://localhost:3000

│  │  Express/  │  │ Socket.IO  │  │   Your     │                │# Join the same room name to test multi-participant features

│  │  Fastify   │→ │  Server    │→ │   Logic    │                │```

│  └────────────┘  └────────────┘  └────────────┘                │

└─────────────────────────────────────────────────────────────────┘## 🎯 Use Cases

                            │ Dependency Injection

                            ▼### 💼 Video Conferencing

┌─────────────────────────────────────────────────────────────────┐

│                    SIMPLE MEDIASOUP SERVER                       │```typescript

│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │const client = new SimpleClient({ serverUrl: "ws://yourserver.com" });

│  │ Conference │  │Participant │  │   Media    │                │await client.connect(meetingId, userName);

│  │  Manager   │→ │  Manager   │→ │  Handler   │                │// Automatic audio, video, participant management

│  └────────────┘  └────────────┘  └────────────┘                │```

└─────────────────────────────────────────────────────────────────┘

                            │### 📡 Live Streaming

                            ▼

┌─────────────────────────────────────────────────────────────────┐```typescript

│                      MEDIASOUP CORE                              │const server = new SimpleServer({ port: 3000 });

│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │server.on("producerCreated", (event) => {

│  │  Workers   │  │  Routers   │  │ Transports │                │  // Relay to CDN, start recording, etc.

│  │  (C++)     │→ │            │→ │  (WebRTC)  │                │  startStreamRecording(event.detail.participantId);

│  └────────────┘  └────────────┘  └────────────┘                │});

└─────────────────────────────────────────────────────────────────┘```

````

### 🎓 Online Education

### Dependency Injection Pattern

````typescript

```const client = new SimpleClient({ serverUrl: "ws://school.com" });

┌─────────────────────────────────────────────────────────┐client.on("participantJoined", (event) => {

│              YOU CREATE AND CONTROL:                     │  if (event.detail.participant.name.includes("Teacher")) {

│                                                          │    // Give teacher controls

│  • HTTP/HTTPS Server (Express, Fastify, etc.)           │    showTeacherControls();

│  • Socket.IO Server                                      │  }

│  • Application Routes                                    │});

│  • Authentication/Authorization                          │```

│  • Database Integration                                  │

│                                                          │### 📱 Social Apps

│  Then inject into SimpleServer                          │

└─────────────────────────────────────────────────────────┘```typescript

                         │const client = new SimpleClient({

                         ▼  serverUrl: "ws://social.com",

┌─────────────────────────────────────────────────────────┐  enableVideo: false, // Audio-only social rooms

│           SIMPLE MEDIASOUP HANDLES:                      │});

│                                                          │await client.connect(roomId, username);

│  • MediaSoup Worker Management                           │```

│  • Conference Lifecycle                                  │

│  • Participant Management                                │## ⚡ Performance

│  • WebRTC Transport Creation                             │

│  • Producer/Consumer Management                          │- **🚀 Fast Setup**: Get running in under 30 seconds

│  • Real-time Events                                      │- **📈 Scalable**: Handles hundreds of participants per server

└─────────────────────────────────────────────────────────┘- **🔄 Auto-Optimization**: Built-in load balancing and cleanup

```- **📱 Mobile Optimized**: Works great on mobile browsers

- **🌐 Cross-Platform**: Works on all modern browsers

---

## 🔍 Comparison

## 📚 Documentation

| Feature            | Simple MediaSoup | Raw MediaSoup | Other Solutions |

### Package Documentation| ------------------ | ---------------- | ------------- | --------------- |

| **Setup Time**     | 30 seconds       | Hours         | Days            |

- **[Client API Reference](./simple_ms_client/README.md)** - Complete client API, events, and examples| **Lines of Code**  | 5 lines          | 500+ lines    | 1000+ lines     |

- **[Server API Reference](./simple_ms_server/README.md)** - Complete server API, configuration, and integration| **Event Handling** | Built-in         | Manual        | Custom          |

- **[Example Application](./simple_ms_example/README.md)** - Full working example with setup instructions| **Error Handling** | Automatic        | Manual        | Limited         |

| **Documentation**  | Simple           | Technical     | Complex         |

### Key Concepts| **TypeScript**     | Full support     | Partial       | Varies          |

| **Mobile Support** | Built-in         | Manual setup  | Limited         |

#### Client-Side Flow

## 🛠️ Advanced Features

````

1. Create Socket ConnectionFor developers who need more control, we also export all the underlying MediaSoup components:

2. Create ConferenceClient

3. Setup Event Listeners```typescript

4. Join Meeting// Advanced client usage

5. Produce Media (Audio/Video)import {

6. Consume Existing Streams SimpleClient, // ⭐ Recommended for most use cases

7. Handle Events (participants, streams, etc.) MediasoupClient, // 🔧 For custom media handling

8. Leave Meeting SocketClientController, // 🎮 For custom socket logic

````ConferenceClient, // 🏠 For custom conference logic

} from "simple_ms_client";

#### Server-Side Flow

// Advanced server usage

```import {

1. Create HTTP/HTTPS Server  SimpleServer, // ⭐ Recommended for most use cases

2. Create Socket.IO Server  MediasoupController, // 🔧 For custom MediaSoup logic

3. Create SimpleServer (inject servers)  SocketController, // 🎮 For custom socket handling

4. Start SimpleServer  WorkerService, // ⚙️ For custom worker management

5. Handle Events (conferences, participants, etc.)} from "simple_ms_server";

6. Optionally: Add Admin APIs```

7. Graceful Shutdown

```## 🤝 Contributing



---We welcome contributions! Whether it's:



## 💡 Examples- 🐛 Bug fixes

- ✨ New features

### Basic Server Setup- 📖 Documentation improvements

- 🧪 Testing

```typescript- 💡 Ideas and suggestions

import express from "express";

import https from "https";Please see our [Contributing Guide](CONTRIBUTING.md) for details.

import { Server as SocketIOServer } from "socket.io";

import { SimpleServer } from "simple_ms_server";## 📄 License



// Your Express appMIT License - see [LICENSE](LICENSE) file for details.

const app = express();

## 🔧 Advanced Usage

// Your HTTPS server

const httpsServer = https.createServer(sslOptions, app);For developers who need more control, all underlying MediaSoup components are available:



// Your Socket.IO server```typescript

const socketServer = new SocketIOServer(httpsServer, {// Advanced server usage

  cors: { origin: "*" }import {

});  SimpleServer, // ⭐ Recommended for most use cases

  MediasoupController, // 🔧 Custom MediaSoup logic

// Inject into SimpleServer  SocketController, // � Custom socket handling

const mediaServer = new SimpleServer({  WorkerService, // ⚙️ Custom worker management

  httpServer: httpsServer,} from "simple_ms_server";

  socketServer,

  mediasoup: {// Advanced client usage

    workerSettings: {import {

      logLevel: "warn",  SimpleClient, // ⭐ Recommended for most use cases

      rtcMinPort: 40000,  MediasoupClient, // � Custom media handling

      rtcMaxPort: 49999,  SocketClientController, // 🎮 Custom socket logic

    },  ConferenceClient, // 🏠 Custom conference logic

    transportOptions: {} from "simple_ms_client";

      listenIps: [```

        {

          ip: "0.0.0.0",### Custom Server Implementation

          announcedIp: "YOUR_PUBLIC_IP",

        },```typescript

      ],import { WorkerService, MediasoupController } from "simple_ms_server";

    },

  },const workerService = new WorkerService(customConfig);

});const controller = new MediasoupController(workerService);



// Start everything// Implement custom conference logic

await mediaServer.start();controller.on("newProducer", (producer) => {

httpsServer.listen(3443);  // Custom producer handling

```  relayToCDN(producer);

  startRecording(producer);

### Basic Client Usage});

````

````typescript

import { ConferenceClient } from "simple_ms_client";### Custom Client Implementation

import io from "socket.io-client";

```typescript

// Connect to serverimport { MediasoupClient, SocketClientController } from "simple_ms_client";

const socket = io("https://localhost:3443");

const socketController = new SocketClientController(socket, config);

// Create clientconst mediasoupClient = new MediasoupClient(socketController, options);

const client = new ConferenceClient({

  conferenceId: "my-room",// Custom event handling

  participantId: "user-123",mediasoupClient.on("newConsumer", (consumer) => {

  participantName: "John Doe",  // Custom consumer logic

  socket,  applyVideoFilter(consumer.track);

});  updateUI(consumer);

});

// Setup event listeners```

client.addEventListener("participantJoined", (event) => {

  console.log(`${event.detail.participantName} joined`);## 🚀 Production Deployment

});

### Environment Variables

client.addEventListener("remoteStreamAdded", (event) => {

  const { stream, participantId } = event.detail;```bash

  // Display remote video# Server Configuration

  videoElement.srcObject = stream;PORT=3000

});NODE_ENV=production

MEDIASOUP_MIN_PORT=10000

// Join meetingMEDIASOUP_MAX_PORT=10100

await client.joinMeeting();MEDIASOUP_LISTEN_IP=0.0.0.0

MEDIASOUP_ANNOUNCED_IP=your-public-ip

// Get and produce media

const stream = await navigator.mediaDevices.getUserMedia({# SSL Configuration (required for HTTPS)

  audio: true,SSL_CERT_PATH=/path/to/cert.pem

  video: true,SSL_KEY_PATH=/path/to/key.pem

});```



const audioTrack = stream.getAudioTracks()[0];### Docker Deployment

const videoTrack = stream.getVideoTracks()[0];

```dockerfile

await client.produceMedia(audioTrack, videoTrack);FROM node:18-alpine

WORKDIR /app

// Consume existing participant streamsCOPY simple_ms_example/ .

await client.consumeExistingStreams();RUN npm install && npm run build

```EXPOSE 3000 10000-10100/udp

CMD ["npm", "start"]

### Screen Sharing```



```typescript### HTTPS Setup (Required for Production)

// Start screen share

const screenStream = await navigator.mediaDevices.getDisplayMedia({```typescript

  video: true,import https from "https";

});import fs from "fs";



const screenTrack = screenStream.getVideoTracks()[0];const server = new SimpleServer({

  port: 443,

const { videoStreamId } = await client.produceMedia(  https: {

  undefined,    cert: fs.readFileSync("cert.pem"),

  screenTrack,    key: fs.readFileSync("key.pem"),

  "screenshare"  },

);});

````

// Stop screen share later

await client.stopLocalStream(videoStreamId);### Scaling for High Load

````

```typescript

### Media Controlsconst server = new SimpleServer({

  mediasoup: {

```typescript    workerSettings: {

// Toggle audio (mute/unmute)      rtcMinPort: 10000,

const isEnabled = await client.toggleAudio();      rtcMaxPort: 20000, // Increase port range

    },

// Toggle video (on/off)    // Use multiple workers for CPU distribution

const isVideoOn = await client.toggleVideo();    numWorkers: 4,

  },

// Stop watching a specific participant});

await client.stopWatchingStream(participantId);```



// Leave meeting## 🆘 Support & Contributing

await client.leaveMeeting();

```- 📖 **Documentation**: Package README files and this guide

- 🐛 **Issues**: [GitHub Issues](https://github.com/vidya-hub/simple_mediasoup/issues)

---- 💬 **Discussions**: [GitHub Discussions](https://github.com/vidya-hub/simple_mediasoup/discussions)

- 🤝 **Contributing**: We welcome PRs! See [CONTRIBUTING.md](CONTRIBUTING.md)

## 🛠️ Development- 📧 **Enterprise**: Contact us for commercial support



### Setup Development Environment---



```bash**Made with ❤️ for developers who want simple WebRTC**

# Clone the repository

git clone https://github.com/vidya-hub/simple_mediasoup.git_Stop wrestling with MediaSoup complexity. Start building amazing real-time applications today!_

cd simple_mediasoup

## Features

# Install dependencies for all packages

npm install### 🎥 **Core Conference Features**



# Build all packages- **Multi-participant video/audio conferencing**

npm run build- **Real-time media streaming** with WebRTC

```- **Automatic participant management**

- **Conference lifecycle management**

### Project Structure

### 🎛️ **Media Controls**

````

simple_mediasoup/- **Mute/Unmute audio and video**

├── simple_ms_client/ # Client package- **Pause/Resume producers and consumers**

│ ├── src/- **Real-time media state synchronization**

│ │ ├── mediasoup/- **Dynamic producer/consumer management**

│ │ │ └── ConferenceClient.ts # Main client class

│ │ ├── controller/### 🚀 **Scalability & Performance**

│ │ │ └── SocketClientController.ts

│ │ └── client.ts # Package exports- **Intelligent worker load balancing**

│ ├── dist/ # Compiled output- **Automatic resource cleanup**

│ └── package.json- **Conference auto-cleanup when empty**

│- **Performance monitoring and statistics**

├── simple_ms_server/ # Server package

│ ├── src/### 🛡️ **Reliability**

│ │ ├── SimpleServer.ts # Main server class

│ │ ├── mediasoup/- **Comprehensive error handling**

│ │ │ └── MediaSoupServer.ts- **Graceful disconnect handling**

│ │ ├── controllers/- **Memory leak prevention**

│ │ │ ├── MediasoupController.ts- **Event-driven architecture**

│ │ │ └── SocketController.ts

│ │ ├── models/## 🏗️ Architecture

│ │ │ ├── conference.ts

│ │ │ └── participant.tsSimple MediaSoup uses a modular architecture that makes WebRTC development straightforward:

│ │ ├── workers/

│ │ │ └── WorkerService.ts```

│ │ └── index.ts # Package exports┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐

│ ├── dist/ # Compiled output│ Web Client │ │ Express + │ │ MediaSoup │

│ └── package.json│ (Browser) │ │ Simple Server │ │ Workers │

│├─────────────────┤ ├─────────────────┤ ├─────────────────┤

├── simple_ms_types/ # Shared types│ SimpleClient │◄──►│ SocketController│◄──►│ WorkerService │

│ ├── src/│ MediasoupClient │ │ MediasoupCtrl │ │ Router/Transport│

│ │ ├── client.ts│ SocketClient │ │ Conference Mgmt │ │ Producer/Consumer│

│ │ ├── server.ts└─────────────────┘ └─────────────────┘ └─────────────────┘

│ │ ├── socket_client.ts```

│ │ ├── socket_server.ts

│ │ └── index.ts## 📦 Packages

│ └── package.json

│- **`simple_ms_server`** - High-level MediaSoup server with automatic conference management

└── simple_ms_example/ # Example application- **`simple_ms_client`** - Browser-ready MediaSoup client with simple APIs

    ├── src/- **`simple_ms_types`** - Shared TypeScript definitions across all packages

    │   └── server.ts          # Express + MediaSoup server- **`simple_ms_example`** - Complete working example with Express.js integration

    ├── public/

    │   ├── index.html         # Client UI## 📚 API Documentation

    │   └── script.js          # Client logic

    ├── certs/                 # SSL certificates### 🏠 SimpleServer API

    └── package.json

````The server provides a high-level abstraction for MediaSoup server operations:



### Available Scripts```typescript

import { SimpleServer } from "simple_ms_server";

```bash

# Build all packagesconst server = new SimpleServer({

npm run build  port: 3000,

  cors: { origin: "*" },

# Build in watch mode  mediasoup: {

npm run build:watch    workerSettings: {

      rtcMinPort: 10000,

# Run tests (if available)      rtcMaxPort: 10100,

npm test    },

  },

# Run example application});

cd simple_ms_example

npm run start:https// Event handling

```server.on("participantJoined", (event) => {

  console.log(`${event.detail.participant.name} joined!`);

---});



## 🌟 Key Advantages// Start server

await server.start();

### 1. **Dependency Injection Architecture**```

- Bring your own HTTP server (Express, Fastify, etc.)

- Bring your own Socket.IO instance**Key Methods:**

- Full control over server lifecycle

- Easy integration with existing applications- `start()` - Start the MediaSoup server

- `stop()` - Stop and cleanup

### 2. **Production Ready**- `getConferences()` - List active conferences

- Comprehensive error handling- `getParticipants()` - List all participants

- Automatic resource cleanup- `kickParticipant(id, reason)` - Remove a participant

- Event-driven architecture- `closeConference(id, reason)` - Close entire conference

- Built-in monitoring and statistics- `getStats()` - Server statistics



### 3. **Developer Friendly****Events:**

- Simple, intuitive API

- Complete TypeScript support- `participantJoined/Left` - Participant lifecycle

- Comprehensive documentation- `conferenceCreated/Destroyed` - Conference lifecycle

- Working examples included- `producerCreated/Closed` - Media stream events

- `audioMuted/Unmuted` - Audio state changes

### 4. **Flexible & Extensible**- `videoMuted/Unmuted` - Video state changes

- Customize MediaSoup configuration

- Add custom logic via events### 🖥️ SimpleClient API

- Integrate with existing auth systems

- Scale as neededThe client provides easy-to-use WebRTC functionality:



---```typescript

import { SimpleClient } from "simple_ms_client";

## 🔐 Production Deployment

const client = new SimpleClient({

### SSL Certificates  serverUrl: "http://localhost:3000",

  enableAudio: true,

For production, use real SSL certificates from Let's Encrypt:  enableVideo: true,

  autoConsume: true,

```bash});

# Using Certbot

sudo certbot certonly --standalone -d yourdomain.com// Connect to room

```await client.connect("room-name", "Your Name");



### Environment Configuration// Media controls

await client.toggleAudio(); // Mute/unmute audio

```envawait client.toggleVideo(); // Mute/unmute video

# Production environmentawait client.startScreenShare(); // Share screen

PORT=3000```

HTTPS_PORT=3443

USE_HTTPS=true**Key Methods:**

ANNOUNCED_IP=YOUR_PUBLIC_IP

RTC_MIN_PORT=40000- `connect(roomId, name)` - Join conference

RTC_MAX_PORT=49999- `disconnect()` - Leave conference

```- `enableMedia(audio, video)` - Enable local media

- `toggleAudio(mute?)` - Control audio

### Firewall Configuration- `toggleVideo(mute?)` - Control video

- `startScreenShare()` - Share screen

Open these ports:- `getParticipants()` - List participants

- `getRemoteStreams()` - Get remote streams

- **3443** (HTTPS web server)

- **40000-49999** (UDP/TCP for WebRTC)**Events:**



```bash- `connected/disconnected` - Connection state

# Example: UFW firewall- `participantJoined/Left` - Other participants

sudo ufw allow 3443/tcp- `localStreamReady` - Your media ready

sudo ufw allow 40000:49999/udp- `remoteStreamAdded/Removed` - Other streams

sudo ufw allow 40000:49999/tcp- `audioMuted/Unmuted` - Audio state changes

```- `videoMuted/Unmuted` - Video state changes

- `screenShareStarted/Stopped` - Screen sharing

---

### 🔗 REST API Endpoints

## 🤝 Contributing

The example server exposes monitoring and admin APIs:

Contributions are welcome! Please follow these guidelines:

```bash

1. Fork the repository# Monitoring

2. Create a feature branch (`git checkout -b feature/amazing-feature`)GET /api/conferences              # List conferences

3. Commit your changes (`git commit -m 'Add amazing feature'`)GET /api/participants            # List participants

4. Push to the branch (`git push origin feature/amazing-feature`)GET /api/stats                   # Server statistics

5. Open a Pull RequestGET /api/conferences/:id/participants  # Conference participants



### Development Guidelines# Administration

POST /api/participants/:id/kick  # Kick participant

- Write TypeScript with proper typesPOST /api/conferences/:id/close  # Close conference

- Follow existing code style```

- Add tests for new features

- Update documentation## 🔧 Troubleshooting

- Ensure all packages build successfully

### MediaSoup Worker Binary Issues

---

**Error:** `mediasoup-worker ENOENT` - Binary not found

## 📄 License

**Solution:** MediaSoup requires native binary compilation. Use npm instead of pnpm:

MIT License - see [LICENSE](./LICENSE) file for details.

```bash

---# In the example directory

cd simple_ms_example

## 🙏 Acknowledgmentsrm -rf node_modules pnpm-lock.yaml

npm install

- Built on top of [MediaSoup](https://mediasoup.org/)npm run start:https

- Uses [Socket.IO](https://socket.io/) for signaling```

- Inspired by the need for simpler WebRTC solutions

**Alternative:** Rebuild MediaSoup manually:

---

```bash

## 📞 Supportcd node_modules/mediasoup

npm run worker:build

- **Documentation**: See package-specific READMEs```

- **Issues**: [GitHub Issues](https://github.com/vidya-hub/simple_mediasoup/issues)

- **Discussions**: [GitHub Discussions](https://github.com/vidya-hub/simple_mediasoup/discussions)### HTTPS Certificate Issues



---**Error:** Certificate warnings in browser



## 🗺️ Roadmap**Solution:** For development, accept the self-signed certificate warning. For production, use trusted certificates:



- [ ] React/Vue component libraries```bash

- [ ] Mobile SDK (React Native)# Development certificates

- [ ] Recording supportnpm run generate-certs

- [ ] Broadcasting to RTMP

- [ ] SFU cascading for large scale# Production with Let's Encrypt

- [ ] Advanced simulcast supportsudo certbot certonly --standalone -d yourdomain.com

- [ ] E2E encryptionexport SSL_CERT=/etc/letsencrypt/live/yourdomain.com/fullchain.pem

- [ ] Admin dashboard UIexport SSL_KEY=/etc/letsencrypt/live/yourdomain.com/privkey.pem

````

---

### WebRTC Media Access Issues

**Made with ❤️ for developers who want simple, powerful WebRTC solutions.**

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
