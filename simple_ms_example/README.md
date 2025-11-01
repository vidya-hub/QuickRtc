# 🎬 Simple MediaSoup Example

A complete working example demonstrating how to build a video conferencing application using Simple MediaSoup Client and Server packages with dependency injection architecture.

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Setup Instructions](#-setup-instructions)
- [Usage Guide](#-usage-guide)
- [Flow Diagrams](#-flow-diagrams)
- [Development](#-development)

---

## ✨ Features

- **🔌 Dependency Injection**: Server doesn't create HTTP/HTTPS servers - you control them
- **🔐 HTTPS Support**: Self-signed certificates for development
- **📱 Responsive UI**: Works on desktop and mobile browsers
- **🎥 Full Media Support**: Audio, video, and screen sharing
- **👥 Multi-Participant**: Support for multiple participants in a conference
- **🎮 Media Controls**: Mute/unmute audio and video
- **🖥️ Screen Sharing**: Built-in screen share support
- **📊 Participant List**: Real-time participant tracking
- **🔔 Notifications**: Visual notifications for participant events
- **⚡ TypeScript**: Fully typed with TypeScript

---

## ⚡ Quick Start

### One-Command Setup and Run

```bash
# Clone the repository
git clone https://github.com/vidya-hub/simple_mediasoup.git
cd simple_mediasoup/simple_ms_example

# Install, build, generate certificates, and start
npm run setup && npm run start:https
```

Then open **https://localhost:3443** in your browser and accept the certificate warning.

**That's it!** You now have a fully functional video conferencing application.

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │   HTML     │  │ JavaScript │  │   Socket   │                │
│  │   UI       │←→│   Client   │←→│    .IO     │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket + WebRTC
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │   HTTP/    │  │  Socket.IO │  │   Static   │                │
│  │   HTTPS    │←→│   Server   │  │   Files    │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Dependency Injection
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SIMPLE MEDIASOUP SERVER                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ Conference │  │Participant │  │   Media    │                │
│  │  Manager   │←→│  Manager   │←→│  Handler   │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MEDIASOUP CORE                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Workers   │  │  Routers   │  │ Transports │                │
│  │            │→ │            │→ │            │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Injection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  YOUR APPLICATION                            │
│                   (server.ts)                                │
│                                                              │
│  1. Create Express App                                       │
│  2. Create HTTP/HTTPS Server    ← YOU CONTROL THIS          │
│  3. Create Socket.IO Server     ← YOU CONTROL THIS          │
│                                                              │
│  4. Inject into SimpleServer                                 │
│     new SimpleServer({                                       │
│       httpServer,      // Your HTTP server                   │
│       socketServer,    // Your Socket.IO server              │
│       mediasoup: {}    // MediaSoup config                   │
│     })                                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               SIMPLE MEDIASOUP SERVER                        │
│                                                              │
│  • Uses YOUR HTTP server (doesn't create its own)            │
│  • Uses YOUR Socket.IO instance (doesn't create its own)     │
│  • Handles MediaSoup logic only                              │
│  • Emits events back to your app                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
simple_ms_example/
├── src/
│   └── server.ts              # TypeScript Express + MediaSoup server
├── public/
│   ├── index.html             # Client UI
│   ├── script.js              # Client JavaScript
│   └── simple_ms_client/      # Client library (symlinked)
│       └── client.js
├── certs/
│   ├── cert.pem               # SSL certificate (generated)
│   └── key.pem                # SSL private key (generated)
├── dist/                      # Compiled TypeScript output
│   └── server.js
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── setup.sh                   # Setup script
└── README.md                  # This file
```

---

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
npm run setup

# This will:
# 1. Install dependencies
# 2. Build all packages
# 3. Generate SSL certificates
# 4. Test HTTPS setup
```

### Option 2: Manual Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Build Packages

```bash
# Build all related packages
npm run build
```

This builds:

- `simple_ms_types` - Shared TypeScript types
- `simple_ms_server` - Server package
- `simple_ms_client` - Client package
- `simple_ms_example` - This example app

#### 3. Generate SSL Certificates

**For HTTPS (Required for WebRTC):**

```bash
npm run generate-certs
```

This creates self-signed certificates in the `certs/` directory.

#### 4. Test HTTPS Setup (Optional)

```bash
npm run test-https
```

---

## 🚀 Usage Guide

### Starting the Server

**HTTP (Development - Limited WebRTC features):**

```bash
npm start
# or
npm run dev
```

Server runs at: **http://localhost:3000**

**HTTPS (Recommended - Full WebRTC features):**

```bash
npm run start:https
# or
npm run dev:https
```

Server runs at: **https://localhost:3443**

> ⚠️ **Note**: When using HTTPS with self-signed certificates, your browser will show a security warning. Click "Advanced" → "Proceed to localhost" to access the app.

---

### Using the Application

#### 1. Join a Conference

1. Open the application in your browser
2. Click **"Join Conference"** button
3. Allow camera and microphone access when prompted
4. Your video will appear in the "Local Video" section

#### 2. Invite Others

1. Open the same URL in another browser tab or device
2. Click **"Join Conference"**
3. Both participants will see each other's video

#### 3. Media Controls

- **🔇 Mute/Unmute Audio**: Toggle your microphone
- **📹 Turn Off/On Video**: Toggle your camera
- **🖥️ Share Screen**: Start/stop screen sharing
- **👁️ Stop Watching**: Stop receiving a specific participant's stream

#### 4. Leave Conference

Click **"Leave Conference"** to disconnect and clean up resources.

---

## 📊 Flow Diagrams

### Application Startup Flow

```
User Starts App
      │
      ▼
┌─────────────────┐
│  npm start:https│
└─────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Load TypeScript Server (server.ts) │
└─────────────────────────────────────┘
      │
      ├─→ Create Express App
      │
      ├─→ Load SSL Certificates
      │
      ├─→ Create HTTPS Server
      │
      ├─→ Create Socket.IO Server
      │
      ├─→ Create SimpleServer
      │   (with dependency injection)
      │
      ├─→ Setup API Routes
      │   • GET /api/conferences
      │   • GET /api/participants
      │   • GET /api/stats
      │   • POST /api/conferences/:id/close
      │   • POST /api/participants/:id/kick
      │
      ├─→ Serve Static Files
      │   • index.html
      │   • script.js
      │   • client.js
      │
      └─→ Start Listening on Port 3443
          │
          ▼
    ┌─────────────────┐
    │  Server Running │
    │  ✅ Ready!      │
    └─────────────────┘
```

### User Join Conference Flow

```
User Opens Browser
      │
      ▼
Load index.html
      │
      ├─→ Load script.js
      ├─→ Load ConferenceClient library
      │
      ▼
User Clicks "Join Conference"
      │
      ▼
┌─────────────────────────────────────┐
│  1. Create Socket.IO Connection     │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  2. Create ConferenceClient         │
│     {                                │
│       conferenceId: "my-room"        │
│       participantId: random()        │
│       participantName: random()      │
│       socket: io()                   │
│     }                                │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  3. Setup Event Listeners           │
│     • participantJoined              │
│     • participantLeft                │
│     • remoteStreamAdded              │
│     • remoteStreamRemoved            │
│     • localStreamAdded               │
│     • error                          │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  4. Join Meeting                     │
│     await client.joinMeeting()       │
└─────────────────────────────────────┘
      │
      ├─→ Server creates/gets conference
      ├─→ Client receives router capabilities
      ├─→ Client creates send/recv transports
      │
      ▼
┌─────────────────────────────────────┐
│  5. Get User Media                   │
│     getUserMedia({audio, video})     │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  6. Produce Media                    │
│     await client.produceMedia(       │
│       audioTrack, videoTrack)        │
└─────────────────────────────────────┘
      │
      ├─→ Create audio producer
      ├─→ Create video producer
      ├─→ Notify other participants
      │
      ▼
┌─────────────────────────────────────┐
│  7. Consume Existing Streams         │
│     await client.                    │
│       consumeExistingStreams()       │
└─────────────────────────────────────┘
      │
      ├─→ Get list of participants
      ├─→ Create consumers for each participant
      ├─→ Display remote streams
      │
      ▼
┌─────────────────────────────────────┐
│  ✅ In Conference                    │
│     • Can see/hear others            │
│     • Others can see/hear you        │
│     • Can toggle audio/video         │
│     • Can share screen               │
└─────────────────────────────────────┘
```

### Media Toggle Flow (Audio Example)

```
User Clicks "Mute Audio"
      │
      ▼
┌─────────────────────────────────────┐
│  Check Current State                 │
│  • localAudioStreamId exists?        │
└─────────────────────────────────────┘
      │
      ├─── YES (Audio is ON) ──→ MUTE
      │                          │
      │                          ▼
      │               ┌──────────────────────┐
      │               │ Close Audio Producer │
      │               │ Stop Audio Track     │
      │               │ Remove from array    │
      │               └──────────────────────┘
      │                          │
      │                          ├─→ Server closes producer
      │                          ├─→ Notify other participants
      │                          ├─→ Event: localAudioToggled
      │                          │    (enabled: false)
      │                          ▼
      │               ┌──────────────────────┐
      │               │ Update UI            │
      │               │ Button: "🔊 Unmute"  │
      │               └──────────────────────┘
      │
      └─── NO (Audio is OFF) ──→ UNMUTE
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ Get New Audio Track  │
                      │ getUserMedia({audio})│
                      └──────────────────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ Produce Audio        │
                      │ Create New Producer  │
                      └──────────────────────┘
                                 │
                                 ├─→ Server creates producer
                                 ├─→ Notify other participants
                                 ├─→ Event: localAudioToggled
                                 │    (enabled: true)
                                 ▼
                      ┌──────────────────────┐
                      │ Update UI            │
                      │ Button: "🔇 Mute"    │
                      └──────────────────────┘
```

---

## 💻 Development

### Running in Development Mode

```bash
# Watch mode for TypeScript
npm run dev:https

# In another terminal, build client in watch mode
cd ../simple_ms_client
npm run build:watch
```

### Environment Variables

Create a `.env` file:

```env
# Server Configuration
PORT=3000
HTTPS_PORT=3443
USE_HTTPS=true
HOST=0.0.0.0

# SSL Certificates
SSL_CERT=./certs/cert.pem
SSL_KEY=./certs/key.pem

# MediaSoup Configuration
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999
ANNOUNCED_IP=YOUR_PUBLIC_IP
```

### API Endpoints

The server exposes these REST API endpoints:

| Method | Endpoint                            | Description                 |
| ------ | ----------------------------------- | --------------------------- |
| GET    | `/`                                 | Serve main application      |
| GET    | `/health`                           | Health check                |
| GET    | `/api/conferences`                  | Get all conferences         |
| GET    | `/api/participants`                 | Get all participants        |
| GET    | `/api/stats`                        | Get server statistics       |
| GET    | `/api/conferences/:id/participants` | Get conference participants |
| POST   | `/api/conferences/:id/close`        | Close a conference          |
| POST   | `/api/participants/:id/kick`        | Kick a participant          |

### Testing the API

```bash
# Get all conferences
curl http://localhost:3000/api/conferences

# Get server stats
curl http://localhost:3000/api/stats

# Get participants in a conference
curl http://localhost:3000/api/conferences/my-room/participants

# Close a conference
curl -X POST http://localhost:3000/api/conferences/my-room/close

# Kick a participant
curl -X POST http://localhost:3000/api/participants/user-123/kick \
  -H "Content-Type: application/json" \
  -d '{"reason": "Violated rules"}'
```

---

## 🔧 Customization

### Changing MediaSoup Configuration

Edit `src/server.ts`:

```typescript
const mediaServerConfig: SimpleServerConfig = {
  httpServer,
  socketServer,
  mediasoup: {
    workerSettings: {
      logLevel: "debug", // Change to "debug" for more logs
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
    routerOptions: {
      mediaCodecs: [
        // Add/modify codecs here
      ],
    },
    transportOptions: {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: "YOUR_PUBLIC_IP", // Change to your public IP
        },
      ],
    },
  },
};
```

### Customizing the UI

Edit `public/index.html` and `public/script.js` to customize the user interface.

---

## 🐛 Troubleshooting

### Issue: SSL Certificate Warning

**Solution**: This is expected with self-signed certificates. Click "Advanced" → "Proceed to localhost".

For production, use real SSL certificates from Let's Encrypt.

---

### Issue: Camera/Microphone Access Denied

**Solution**:

1. Use HTTPS (required for WebRTC)
2. Grant browser permissions for camera/microphone
3. Check if another application is using the camera

---

### Issue: No Remote Video

**Solution**:

1. Check if both clients are on HTTPS
2. Check firewall settings for UDP ports 40000-49999
3. Check console for errors
4. Ensure `announcedIp` is set correctly in production

---

### Issue: Port Already in Use

**Solution**:

```bash
# Find process using port
lsof -i :3443

# Kill the process
kill -9 <PID>
```

---

## 📚 Learn More

- [Client API Documentation](../simple_ms_client/README.md)
- [Server API Documentation](../simple_ms_server/README.md)
- [Main Project Documentation](../README.md)

---

## 🤝 Contributing

Contributions are welcome! Please see the main project README for guidelines.

---

## 📄 License

MIT License - see LICENSE file for details.
