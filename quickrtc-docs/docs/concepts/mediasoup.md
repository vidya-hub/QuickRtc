---
sidebar_position: 1
---

# Understanding mediasoup

mediasoup is a powerful WebRTC SFU (Selective Forwarding Unit) library. This guide explains how it works in simple terms.

## What is an SFU?

An SFU (Selective Forwarding Unit) is a server that receives media streams from participants and forwards them to others. Unlike peer-to-peer, all media flows through the server.

```
┌─────────────────────────────────────────────────────────────┐
│                    Peer-to-Peer (Mesh)                      │
│                                                             │
│         Alice ◄──────────────────────────► Bob              │
│           │ ╲                            ╱ │                │
│           │   ╲                        ╱   │                │
│           │     ╲                    ╱     │                │
│           │       ╲                ╱       │                │
│           │         ╲            ╱         │                │
│           ▼           ╲        ╱           ▼                │
│        Charlie ◄───────────────────────► Dave               │
│                                                             │
│   Problem: Each person sends to everyone (N×N connections)  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      SFU (mediasoup)                        │
│                                                             │
│                         ┌─────┐                             │
│            Alice ──────►│     │◄────── Bob                  │
│                         │     │                             │
│                         │ SFU │                             │
│                         │     │                             │
│          Charlie ──────►│     │◄────── Dave                 │
│                         └─────┘                             │
│                                                             │
│   Solution: Each person sends once, server forwards         │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Worker

A Worker is a separate process that handles media. Think of it as a "media engine."

```
┌────────────────────────────────────────────────────────────┐
│                      Node.js Server                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Your Application                   │  │
│  │        (Express, Socket.IO, Business Logic)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                               │
│                            ▼                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Worker 1  │  │  Worker 2  │  │  Worker 3  │  ...       │
│  │   (C++)    │  │   (C++)    │  │   (C++)    │            │
│  │            │  │            │  │            │            │
│  │  Handles   │  │  Handles   │  │  Handles   │            │
│  │  media for │  │  media for │  │  media for │            │
│  │  Room A    │  │  Room B    │  │  Room C    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────────────────────────────────────────┘
```

**Key points:**

- One Worker per CPU core (recommended)
- Workers are isolated - if one crashes, others continue
- Workers handle the heavy lifting of media processing

### 2. Router

A Router is like a "virtual room" inside a Worker. It routes media between participants.

```
┌───────────────────────────────────────────────────────────┐
│                         Worker                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                       Router                        │  │
│  │                  (Conference Room)                  │  │
│  │                                                     │  │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐        │  │
│  │    │Producer │    │Producer │    │Producer │        │  │
│  │    │ (Alice) │    │  (Bob)  │    │(Charlie)│        │  │
│  │    └────┬────┘    └────┬────┘    └────┬────┘        │  │
│  │         │              │              │             │  │
│  │         ▼              ▼              ▼             │  │
│  │    ┌───────────────────────────────────────┐        │  │
│  │    │         Media Routing Table           │        │  │
│  │    └───────────────────────────────────────┘        │  │
│  │         │              │              │             │  │
│  │         ▼              ▼              ▼             │  │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐        │  │
│  │    │Consumer │    │Consumer │    │Consumer │        │  │
│  │    │  (Bob)  │    │ (Alice) │    │ (Alice) │        │  │
│  │    └─────────┘    └─────────┘    └─────────┘        │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**Key points:**

- One Router per conference room (typically)
- Router knows which media goes where
- Participants in the same Router can exchange media

### 3. Transport

A Transport is the network connection between a client and the server. It carries media data.

```
┌───────────────────────────────────────────────────────────┐
│                     Transport Types                       │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  WebRtcTransport                    │  │
│  │                                                     │  │
│  │   Client ◄══════════════════════════════► Server    │  │
│  │           ICE + DTLS + SRTP (encrypted)             │  │
│  │                                                     │  │
│  │   Used for: Browser/mobile clients                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  PlainTransport                     │  │
│  │                                                     │  │
│  │   Client ◄──────────────────────────────► Server    │  │
│  │                    Plain RTP                        │  │
│  │                                                     │  │
│  │   Used for: FFmpeg, GStreamer, legacy systems       │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**Each participant typically has 2 transports:**

- **Send Transport** - for sending their media (camera, mic, screen)
- **Receive Transport** - for receiving others' media

```
┌───────────────────────────────────────────────────────────┐
│                   Alice's Connections                     │
│                                                           │
│   ┌──────────┐         ┌──────────────────────┐           │
│   │  Alice   │         │       Server         │           │
│   │ (Client) │         │                      │           │
│   │          │         │  ┌────────────────┐  │           │
│   │  Camera ─┼────────►│  │ Send Transport │  │           │
│   │  Mic    ─┼────────►│  │    (Alice)     │  │           │
│   │          │         │  └────────────────┘  │           │
│   │          │         │                      │           │
│   │          │         │  ┌────────────────┐  │           │
│   │  Screen◄─┼─────────│  │ Recv Transport │  │           │
│   │  (Bob)   │         │  │    (Alice)     │  │           │
│   │          │         │  └────────────────┘  │           │
│   └──────────┘         └──────────────────────┘           │
└───────────────────────────────────────────────────────────┘
```

### 4. Producer

A Producer sends media to the server. When you share your camera, you create a Producer.

```
┌───────────────────────────────────────────────────────────┐
│                    Producer Flow                          │
│                                                           │
│   ┌──────────────┐                                        │
│   │    Camera    │                                        │
│   │   (Device)   │                                        │
│   └──────┬───────┘                                        │
│          │                                                │
│          ▼                                                │
│   ┌──────────────┐      ┌──────────────┐                  │
│   │ MediaStream  │      │   Browser    │                  │
│   │   Track      │─────►│   encodes    │                  │
│   │  (video)     │      │   to VP8/H264│                  │
│   └──────────────┘      └──────┬───────┘                  │
│                                │                          │
│                                ▼                          │
│                         ┌──────────────┐                  │
│                         │   Producer   │                  │
│                         │              │                  │
│                         │  id: "abc"   │                  │
│                         │  kind: video │                  │
│                         └──────┬───────┘                  │
│                                │                          │
│                                ▼                          │
│                         ┌──────────────┐                  │
│                         │    Server    │                  │
│                         │   (Router)   │                  │
│                         └──────────────┘                  │
└───────────────────────────────────────────────────────────┘
```

**Producer types:**

- `audio` - Microphone
- `video` - Camera
- `video` (with `screen` label) - Screen share

### 5. Consumer

A Consumer receives media from the server. When you see someone's video, that's a Consumer.

```
┌───────────────────────────────────────────────────────────┐
│                    Consumer Flow                          │
│                                                           │
│   ┌──────────────┐                                        │
│   │    Server    │                                        │
│   │   (Router)   │                                        │
│   │              │                                        │
│   │  Producer    │                                        │
│   │  (Bob's cam) │                                        │
│   └──────┬───────┘                                        │
│          │                                                │
│          │  Server creates Consumer                       │
│          │  for each receiver                             │
│          ▼                                                │
│   ┌──────────────┐      ┌──────────────┐                  │
│   │   Consumer   │      │   Browser    │                  │
│   │              │─────►│   decodes    │                  │
│   │  Receives    │      │   VP8/H264   │                  │
│   │  Bob's video │      └──────┬───────┘                  │
│   └──────────────┘             │                          │
│                                ▼                          │
│                         ┌──────────────┐                  │
│                         │   <video>    │                  │
│                         │   element    │                  │
│                         │  (Alice's    │                  │
│                         │   screen)    │                  │
│                         └──────────────┘                  │
└───────────────────────────────────────────────────────────┘
```

**Key insight:** One Producer can have many Consumers. Bob's camera creates 1 Producer, but Alice, Charlie, and Dave each get their own Consumer for it.

## Complete Flow Diagram

Here's how everything connects when Alice joins a room and shares her camera:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Complete mediasoup Flow                           │
│                                                                          │
│  STEP 1: Alice connects                                                  │
│  ════════════════════                                                    │
│                                                                          │
│    Alice                              Server                             │
│      │                                  │                                │
│      │ ──── WebSocket connect ────────► │                                │
│      │                                  │                                │
│      │ ◄─── Router RTP Capabilities ─── │                                │
│      │                                  │                                │
│                                                                          │
│  STEP 2: Create Transports                                               │
│  ═════════════════════════                                               │
│                                                                          │
│    Alice                              Server                             │
│      │                                  │                                │
│      │ ──── "create send transport" ──► │ ─┐                             │
│      │                                  │  │ Creates WebRtcTransport     │
│      │ ◄─── transport params ────────── │ ◄┘                             │
│      │                                  │                                │
│      │ ──── "create recv transport" ──► │ ─┐                             │
│      │                                  │  │ Creates WebRtcTransport     │
│      │ ◄─── transport params ────────── │ ◄┘                             │
│      │                                  │                                │
│                                                                          │
│  STEP 3: Connect Transports (ICE/DTLS handshake)                         │
│  ═══════════════════════════════════════════════                         │
│                                                                          │
│    Alice                              Server                             │
│      │                                  │                                │
│      │ ──── "connect" + DTLS params ──► │                                │
│      │                                  │                                │
│      │ ◄════ ICE connectivity ═════════►│  (UDP packets)                 │
│      │                                  │                                │
│                                                                          │
│  STEP 4: Produce Media                                                   │
│  ═════════════════════                                                   │
│                                                                          │
│    Alice                              Server                             │
│      │                                  │                                │
│      │  getUserMedia()                  │                                │
│      │  ↓                               │                                │
│      │ ──── "produce" + RTP params ───► │ ─┐                             │
│      │                                  │  │ Creates Producer            │
│      │ ◄─── producer.id ─────────────── │ ◄┘                             │
│      │                                  │                                │
│      │ ════ Media flows (RTP) ═════════►│                                │
│      │                                  │                                │
│                                                                          │
│  STEP 5: Others Consume Alice's Media                                    │
│  ════════════════════════════════════                                    │
│                                                                          │
│    Bob                               Server                              │
│      │                                  │                                │
│      │ ◄─── "new producer" event ────── │  (Alice's producer)            │
│      │                                  │                                │
│      │ ──── "consume" (producer id) ──► │ ─┐                             │
│      │                                  │  │ Creates Consumer            │
│      │ ◄─── consumer params ─────────── │ ◄┘                             │
│      │                                  │                                │
│      │ ◄════ Media flows (RTP) ════════ │                                │
│      │                                  │                                │
│      │  Attach to <video> element       │                                │
│      │                                  │                                │
└──────────────────────────────────────────────────────────────────────────┘
```

## RTP Capabilities

Before producing or consuming, clients and server exchange "RTP Capabilities" - a list of supported codecs and features.

```
┌─────────────────────────────────────────────────────────────┐
│                   RTP Capabilities                          │
│                                                             │
│   Client Capabilities          Server Capabilities          │
│   ════════════════════        ════════════════════          │
│   ┌──────────────────┐        ┌──────────────────┐          │
│   │ Codecs:          │        │ Codecs:          │          │
│   │  - VP8           │        │  - VP8           │          │
│   │  - VP9           │   ∩    │  - H264          │          │
│   │  - H264          │  ───►  │  - VP9           │          │
│   │  - Opus          │        │  - Opus          │          │
│   │                  │        │                  │          │
│   │ Extensions:      │        │ Extensions:      │          │
│   │  - abs-send-time │        │  - abs-send-time │          │
│   └──────────────────┘        └──────────────────┘          │
│                                                             │
│                    Negotiated Result                        │
│                    ═════════════════                        │
│                   ┌──────────────────┐                      │
│                   │ Common codecs:   │                      │
│                   │  - VP8           │                      │
│                   │  - VP9           │                      │
│                   │  - H264          │                      │
│                   │  - Opus          │                      │
│                   └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Simulcast

Simulcast sends multiple quality layers of the same video. The server can forward different qualities to different receivers.

```
┌─────────────────────────────────────────────────────────────┐
│                      Simulcast                              │
│                                                             │
│                      ┌─────────────┐                        │
│                      │   Alice's   │                        │
│                      │   Camera    │                        │
│                      └──────┬──────┘                        │
│                             │                               │
│              ┌──────────────┼──────────────┐                │
│              │              │              │                │
│              ▼              ▼              ▼                │
│        ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│        │  High   │    │ Medium  │    │   Low   │            │
│        │ 1080p   │    │  480p   │    │  180p   │            │
│        │ 2.5Mbps │    │ 500Kbps │    │ 100Kbps │            │
│        └────┬────┘    └────┬────┘    └────┬────┘            │
│             │              │              │                 │
│             └──────────────┼──────────────┘                 │
│                            │                                │
│                            ▼                                │
│                     ┌──────────────┐                        │
│                     │    Server    │                        │
│                     │   (Router)   │                        │
│                     └──────┬───────┘                        │
│                            │                                │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│   ┌───────────┐      ┌───────────┐      ┌───────────┐       │
│   │    Bob    │      │  Charlie  │      │   Dave    │       │
│   │  (WiFi)   │      │  (4G)     │      │  (3G)     │       │
│   │           │      │           │      │           │       │
│   │ Gets HIGH │      │ Gets MED  │      │ Gets LOW  │       │
│   └───────────┘      └───────────┘      └───────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Summary

| Concept       | What it is                    | Analogy                       |
| ------------- | ----------------------------- | ----------------------------- |
| **Worker**    | Process handling media        | Kitchen in a restaurant       |
| **Router**    | Virtual room for participants | A private dining room         |
| **Transport** | Network connection            | The waiter serving your table |
| **Producer**  | Sends media to server         | Chef preparing your dish      |
| **Consumer**  | Receives media from server    | You eating the dish           |

## Next Steps

- [QuickRTC Architecture](/docs/concepts/quickrtc-architecture) - How QuickRTC simplifies mediasoup
- [Getting Started](/docs/getting-started) - Build your first app
