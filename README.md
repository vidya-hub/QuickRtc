# 🚀 QuickRTC

## Packages

- [![npm](https://img.shields.io/npm/v/quickrtc-server.svg?logo=npm)](https://www.npmjs.com/package/quickrtc-server) **quickrtc-server** — server-side library for QuickRTC  
- [![npm](https://img.shields.io/npm/v/quickrtc-client.svg?logo=npm)](https://www.npmjs.com/package/quickrtc-client) **quickrtc-client** — client-side library for QuickRTC  
- [![npm](https://img.shields.io/npm/v/quickrtc-types.svg?logo=npm)](https://www.npmjs.com/package/quickrtc-types) **quickrtc-types** — TypeScript type definitions for QuickRTC  

---

## Installation

Install the packages via npm:

```bash
npm install quickrtc-server quickrtc-client quickrtc-types
```
or via yarn:

```bash
yarn add quickrtc-server quickrtc-client quickrtc-types
```

A comprehensive, easy-to-use WebRTC solution built on top of **MediaSoup**, providing simple APIs for client and server applications.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Packages](#-packages)
- [Features](#-features)
- [Architecture](#-architecture)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🎯 Overview

**QuickRTC** abstracts the complexity of WebRTC and MediaSoup so you can build real-time video conferencing apps with minimal code.

### Before (Raw MediaSoup)

```typescript
const worker = await mediasoup.createWorker(workerSettings);
const router = await worker.createRouter(routerOptions);
const transport = await router.createWebRtcTransport(transportOptions);
// ... many more setup steps
```

### After (QuickRTC)

**Server**

```typescript
const mediaServer = new QuickRTCServer({
  httpServer,
  socketServer,
  mediasoup: {},
});
await mediaServer.start();
```

**Client**

```typescript
const client = new ConferenceClient({ conferenceId, participantId, socket });
await client.joinMeeting();
await client.produceMedia(audioTrack, videoTrack);
await client.consumeExistingStreams();
```

---

## ⚡ Quick Start

### Try the Example (30 Seconds)

```bash
git clone https://github.com/vidya-hub/QuickRTC.git
cd QuickRTC/quickrtc_example
npm run setup && npm run start:https
```

Then open **https://localhost:3443** and accept the self-signed certificate.

✅ Multi-participant support  
✅ Audio/Video controls  
✅ Screen sharing  
✅ Real-time events  
✅ HTTPS-ready demo

> ⚠️ HTTPS is required for WebRTC (camera, mic, screen sharing).

---

## 📦 Packages

This monorepo includes four packages:

| Package               | Description                                             |
| --------------------- | ------------------------------------------------------- |
| **quickrtc_client**  | WebRTC client library for browsers.                     |
| **quickrtc_server**  | MediaSoup server abstraction with dependency injection. |
| **quickrtc_types**   | Shared TypeScript definitions.                          |
| **quickrtc_example** | Complete working example (Express + Socket.IO).         |

---

## ✨ Features

### 🖥️ Client Features

- 🎥 Join/start conference in 3 lines of code
- 🔇 Simple mute/unmute controls
- 🖥️ Screen sharing
- 👥 Real-time participant tracking
- 📡 Auto stream consumption
- 💬 Event-driven architecture
- 🧩 TypeScript support

### 🏠 Server Features

- ⚙️ Dependency injection (Express compatible)
- 🔁 Auto conference management
- 👥 Participant tracking
- 📊 Built-in statistics
- 🛡️ Admin APIs (kick, broadcast, etc.)
- 🧼 Automatic cleanup

---

## 🏗️ Architecture

```
┌─────────────┐       ┌─────────────┐         ┌──────────────┐
│ Web Clients │◄────► │ QuickRTCServer│  ◄────► │MediaSoup Core│
│ (Browser)   │       │ + Socket.IO │         │(Routers, Tx) │
└─────────────┘       └─────────────┘         └──────────────┘
```

**Key Flow**

1. Browser connects via Socket.IO
2. QuickRTCServer manages conferences and transports
3. MediaSoup handles media routing

---

## 🛠️ Development

### Setup

```bash
git clone https://github.com/vidya-hub/QuickRTC.git
cd QuickRTC
npm install
npm run build
```

### Run Example

```bash
cd quickrtc_example
npm run setup && npm run start:https
```

### Available Scripts

| Command               | Description         |
| --------------------- | ------------------- |
| `npm run build`       | Build all packages  |
| `npm run build:watch` | Watch mode          |
| `npm test`            | Run tests           |
| `npm run start:https` | Start HTTPS example |

---

## 🔐 Production Setup

### SSL Certificates

Use real certificates from **Let’s Encrypt**:

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

### Firewall Ports

- `3443/tcp` – HTTPS
- `40000-49999/udp` – WebRTC

---

## 🤝 Contributing

We welcome contributions!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit and push your changes
4. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 📞 Support

- 📘 **Docs:** Package-specific READMEs
- 🐛 **Issues:** [GitHub Issues](https://github.com/vidya-hub/QuickRTC/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/vidya-hub/QuickRTC/discussions)

---

## 🗺️ Roadmap

- [ ] Flutter support
- [ ] React/Vue SDK
- [ ] React Native support
- [ ] Recording + RTMP Broadcasting
- [ ] SFU Cascading

---

**Made with ❤️ for developers who want simple, powerful WebRTC.**
