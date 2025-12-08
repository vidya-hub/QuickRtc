export interface MediasoupEvent {
  id: number;
  title: string;
  description: string;
  event: string;
  source: 'client' | 'server';
  target: 'client' | 'server';
  category: 'setup' | 'device' | 'transport' | 'producer' | 'consumer';
  client?: {
    action: string;
    code?: string;
    data?: Record<string, unknown>;
  };
  server?: {
    action: string;
    code?: string;
    data?: Record<string, unknown>;
  };
}

export const rawMediasoupEvents: MediasoupEvent[] = [
  // === SERVER SETUP ===
  {
    id: 1,
    title: "Create Worker",
    description: "Server initializes a mediasoup Worker - a separate process that handles all media operations.",
    event: "mediasoup.createWorker()",
    source: "server",
    target: "server",
    category: "setup",
    server: {
      action: "Spawns Worker subprocess",
      code: "const worker = await mediasoup.createWorker()",
      data: { pid: 12345, rtcMinPort: 40000, rtcMaxPort: 49999 }
    }
  },
  {
    id: 2,
    title: "Create Router",
    description: "A Router is created within the Worker to handle media routing and codec negotiation.",
    event: "worker.createRouter()",
    source: "server",
    target: "server",
    category: "setup",
    server: {
      action: "Creates Router with media codecs",
      code: "const router = await worker.createRouter({ mediaCodecs })",
      data: { routerId: "router-abc123", codecs: ["opus", "VP8", "H264"] }
    }
  },

  // === CLIENT CONNECTS ===
  {
    id: 3,
    title: "Client Connects",
    description: "Client establishes WebSocket connection to the signaling server.",
    event: "socket.connect()",
    source: "client",
    target: "server",
    category: "setup",
    client: {
      action: "Opens WebSocket connection",
      code: "const socket = io('wss://server.com')",
      data: { url: "wss://server.com", protocol: "websocket" }
    },
    server: {
      action: "Accepts connection",
      code: "io.on('connection', (socket) => {...})",
      data: { socketId: "socket-xyz", connected: true }
    }
  },

  // === GET ROUTER CAPABILITIES ===
  {
    id: 4,
    title: "Request Router Capabilities",
    description: "Client requests the Router's RTP capabilities to know which codecs the server supports.",
    event: "getRouterRtpCapabilities",
    source: "client",
    target: "server",
    category: "device",
    client: {
      action: "Requests RTP capabilities",
      code: "socket.emit('getRouterRtpCapabilities')",
      data: { request: "getRouterRtpCapabilities" }
    },
    server: {
      action: "Returns Router capabilities",
      code: "socket.emit('routerRtpCapabilities', router.rtpCapabilities)",
      data: { codecs: ["opus", "VP8"], headerExtensions: ["..."] }
    }
  },
  {
    id: 5,
    title: "Receive Router Capabilities",
    description: "Server sends back the RTP capabilities to the client.",
    event: "routerRtpCapabilities",
    source: "server",
    target: "client",
    category: "device",
    server: {
      action: "Sends capabilities",
      data: { codecs: ["opus", "VP8", "H264"], headerExtensions: 14 }
    },
    client: {
      action: "Receives capabilities",
      code: "socket.on('routerRtpCapabilities', (caps) => {...})",
      data: { received: true }
    }
  },

  // === CREATE & LOAD DEVICE ===
  {
    id: 6,
    title: "Create Device",
    description: "Client creates a mediasoup Device to manage browser media capabilities.",
    event: "new Device()",
    source: "client",
    target: "client",
    category: "device",
    client: {
      action: "Creates Device instance",
      code: "const device = new mediasoupClient.Device()",
      data: { handlerName: "Chrome111" }
    }
  },
  {
    id: 7,
    title: "Load Device",
    description: "Device loads Router capabilities to negotiate compatible media formats.",
    event: "device.load()",
    source: "client",
    target: "client",
    category: "device",
    client: {
      action: "Loads RTP capabilities into Device",
      code: "await device.load({ routerRtpCapabilities })",
      data: { loaded: true, canProduce: { audio: true, video: true } }
    }
  },

  // === CREATE SEND TRANSPORT ===
  {
    id: 8,
    title: "Request Send Transport",
    description: "Client requests the server to create a WebRTC transport for sending media.",
    event: "createTransport (send)",
    source: "client",
    target: "server",
    category: "transport",
    client: {
      action: "Requests transport creation",
      code: "socket.emit('createTransport', { direction: 'send' })",
      data: { direction: "send", sctpCapabilities: null }
    },
    server: {
      action: "Creates WebRTC transport",
      code: "const transport = await router.createWebRtcTransport(options)",
      data: { id: "transport-send-001" }
    }
  },
  {
    id: 9,
    title: "Receive Transport Params",
    description: "Server returns transport parameters (ICE candidates, DTLS fingerprints) to the client.",
    event: "transportCreated",
    source: "server",
    target: "client",
    category: "transport",
    server: {
      action: "Sends transport params",
      data: { 
        id: "transport-send-001",
        iceParameters: { usernameFragment: "xxxx" },
        iceCandidates: [{ ip: "192.168.1.1", port: 44444 }],
        dtlsParameters: { fingerprints: ["sha-256:..."] }
      }
    },
    client: {
      action: "Receives transport params",
      data: { received: true }
    }
  },
  {
    id: 10,
    title: "Create Send Transport",
    description: "Client creates local SendTransport using server's parameters.",
    event: "device.createSendTransport()",
    source: "client",
    target: "client",
    category: "transport",
    client: {
      action: "Creates SendTransport locally",
      code: "const sendTransport = device.createSendTransport(params)",
      data: { id: "transport-send-001", direction: "send" }
    }
  },

  // === CONNECT TRANSPORT ===
  {
    id: 11,
    title: "Connect Transport",
    description: "When producing, transport fires 'connect' event. Client sends DTLS params to server.",
    event: "transport.on('connect')",
    source: "client",
    target: "server",
    category: "transport",
    client: {
      action: "Sends DTLS parameters",
      code: "transport.on('connect', ({ dtlsParameters }, cb) => {...})",
      data: { dtlsParameters: { role: "client", fingerprints: ["..."] } }
    },
    server: {
      action: "Connects transport",
      code: "await transport.connect({ dtlsParameters })",
      data: { connected: true }
    }
  },
  {
    id: 12,
    title: "Transport Connected",
    description: "Server confirms transport connection. DTLS handshake complete.",
    event: "transportConnected",
    source: "server",
    target: "client",
    category: "transport",
    server: {
      action: "Confirms connection",
      data: { success: true, dtlsState: "connected" }
    },
    client: {
      action: "Calls callback",
      code: "callback()",
      data: { transportConnected: true }
    }
  },

  // === PRODUCE MEDIA ===
  {
    id: 13,
    title: "Produce Media",
    description: "Client produces media. Transport fires 'produce' event with RTP parameters.",
    event: "transport.produce()",
    source: "client",
    target: "server",
    category: "producer",
    client: {
      action: "Sends RTP parameters",
      code: "const producer = await transport.produce({ track })",
      data: { kind: "video", rtpParameters: { codecs: [{ mimeType: "video/VP8" }] } }
    },
    server: {
      action: "Creates Producer",
      code: "const producer = await transport.produce({ kind, rtpParameters })",
      data: { producerId: "producer-001" }
    }
  },
  {
    id: 14,
    title: "Producer Created",
    description: "Server confirms Producer creation and returns producer ID.",
    event: "producerCreated",
    source: "server",
    target: "client",
    category: "producer",
    server: {
      action: "Returns producer ID",
      data: { producerId: "producer-001", kind: "video" }
    },
    client: {
      action: "Receives producer ID",
      code: "callback({ id: producerId })",
      data: { producerId: "producer-001", producing: true }
    }
  },

  // === CREATE RECV TRANSPORT ===
  {
    id: 15,
    title: "Request Recv Transport",
    description: "Client requests a transport for receiving media from other participants.",
    event: "createTransport (recv)",
    source: "client",
    target: "server",
    category: "transport",
    client: {
      action: "Requests recv transport",
      code: "socket.emit('createTransport', { direction: 'recv' })",
      data: { direction: "recv" }
    },
    server: {
      action: "Creates WebRTC transport",
      code: "const transport = await router.createWebRtcTransport(options)",
      data: { id: "transport-recv-002" }
    }
  },
  {
    id: 16,
    title: "Receive Recv Transport Params",
    description: "Server returns receive transport parameters to client.",
    event: "transportCreated",
    source: "server",
    target: "client",
    category: "transport",
    server: {
      action: "Sends transport params",
      data: { id: "transport-recv-002", iceParameters: {}, iceCandidates: [] }
    },
    client: {
      action: "Receives params",
      data: { received: true }
    }
  },
  {
    id: 17,
    title: "Create Recv Transport",
    description: "Client creates local RecvTransport for incoming media.",
    event: "device.createRecvTransport()",
    source: "client",
    target: "client",
    category: "transport",
    client: {
      action: "Creates RecvTransport locally",
      code: "const recvTransport = device.createRecvTransport(params)",
      data: { id: "transport-recv-002", direction: "recv" }
    }
  },

  // === CONSUME MEDIA ===
  {
    id: 18,
    title: "Request to Consume",
    description: "Client requests to consume a specific producer's media.",
    event: "consume",
    source: "client",
    target: "server",
    category: "consumer",
    client: {
      action: "Requests to consume producer",
      code: "socket.emit('consume', { producerId, rtpCapabilities })",
      data: { producerId: "producer-001", rtpCapabilities: "..." }
    },
    server: {
      action: "Checks if can consume",
      code: "router.canConsume({ producerId, rtpCapabilities })",
      data: { canConsume: true }
    }
  },
  {
    id: 19,
    title: "Create Consumer",
    description: "Server creates Consumer (paused) to forward producer's media.",
    event: "transport.consume()",
    source: "server",
    target: "server",
    category: "consumer",
    server: {
      action: "Creates Consumer",
      code: "const consumer = await transport.consume({ producerId, rtpCapabilities, paused: true })",
      data: { consumerId: "consumer-001", kind: "video", paused: true }
    }
  },
  {
    id: 20,
    title: "Send Consumer Params",
    description: "Server sends consumer parameters to client.",
    event: "consumerCreated",
    source: "server",
    target: "client",
    category: "consumer",
    server: {
      action: "Sends consumer params",
      data: { consumerId: "consumer-001", producerId: "producer-001", kind: "video", rtpParameters: {} }
    },
    client: {
      action: "Receives consumer params",
      data: { received: true }
    }
  },
  {
    id: 21,
    title: "Create Local Consumer",
    description: "Client creates local Consumer and gets MediaStreamTrack.",
    event: "recvTransport.consume()",
    source: "client",
    target: "client",
    category: "consumer",
    client: {
      action: "Creates Consumer & gets track",
      code: "const consumer = await recvTransport.consume({ id, producerId, kind, rtpParameters })",
      data: { track: "MediaStreamTrack", kind: "video" }
    }
  },
  {
    id: 22,
    title: "Request Resume",
    description: "Client requests server to resume the consumer and start media flow.",
    event: "resumeConsumer",
    source: "client",
    target: "server",
    category: "consumer",
    client: {
      action: "Requests resume",
      code: "socket.emit('resumeConsumer', { consumerId })",
      data: { consumerId: "consumer-001" }
    },
    server: {
      action: "Resumes consumer",
      code: "await consumer.resume()",
      data: { paused: false }
    }
  },
  {
    id: 23,
    title: "Consumer Resumed",
    description: "Server confirms consumer resumed. Media now flowing to client.",
    event: "consumerResumed",
    source: "server",
    target: "client",
    category: "consumer",
    server: {
      action: "Confirms resumed",
      data: { success: true, paused: false }
    },
    client: {
      action: "Displays video",
      code: "videoEl.srcObject = new MediaStream([consumer.track])",
      data: { playing: true }
    }
  },
  {
    id: 24,
    title: "Media Flowing",
    description: "Video/audio is now streaming between participants through the mediasoup server.",
    event: "Media Stream Active",
    source: "server",
    target: "client",
    category: "consumer",
    server: {
      action: "Forwarding RTP packets",
      data: { rtp: "forwarding", rtcp: "active" }
    },
    client: {
      action: "Rendering media",
      code: "// Video playing in <video> element",
      data: { videoPlaying: true, audioPlaying: true }
    }
  }
];
