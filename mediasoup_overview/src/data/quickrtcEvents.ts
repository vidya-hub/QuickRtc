export interface QuickRTCEvent {
  id: number;
  title: string;
  description: string;
  source: 'client' | 'server';
  target: 'client' | 'server';
  event: string;
  category: 'connection' | 'conference' | 'transport' | 'producer' | 'consumer' | 'cleanup';
  details?: {
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
  };
}

export const quickrtcEvents: QuickRTCEvent[] = [
  // Connection
  {
    id: 1,
    title: "Socket Connection",
    description: "Client establishes WebSocket connection with QuickRTC server",
    source: "client",
    target: "server",
    event: "socket.connect()",
    category: "connection",
    details: {
      request: { url: "wss://server:3443" },
      response: { socketId: "abc123xyz" }
    }
  },

  // Join Conference
  {
    id: 2,
    title: "Join Conference",
    description: "Client requests to join a conference room with participant details",
    source: "client",
    target: "server",
    event: "joinConference",
    category: "conference",
    details: {
      request: { conferenceId: "room-123", participantName: "John Doe" },
      response: { routerCapabilities: "..." }
    }
  },
  {
    id: 3,
    title: "Create Router",
    description: "Server creates mediasoup Router for the conference with media codecs",
    source: "server",
    target: "server",
    event: "worker.createRouter()",
    category: "conference",
    details: {
      response: { routerId: "router-789", codecs: ["opus", "VP8"] }
    }
  },
  {
    id: 4,
    title: "Participant Joined Broadcast",
    description: "Server notifies all participants about the new participant",
    source: "server",
    target: "client",
    event: "participantJoined",
    category: "conference",
    details: {
      response: { participantId: "user-456", participantName: "John Doe" }
    }
  },

  // Device & Transport Setup
  {
    id: 5,
    title: "Load Device",
    description: "Client loads mediasoup Device with server's RTP capabilities",
    source: "client",
    target: "client",
    event: "device.load()",
    category: "transport",
    details: {
      response: { loaded: true, canProduce: { audio: true, video: true } }
    }
  },
  {
    id: 6,
    title: "Create Send Transport",
    description: "Client requests server to create a transport for sending media",
    source: "client",
    target: "server",
    event: "createTransport",
    category: "transport",
    details: {
      request: { direction: "send" },
      response: { transportId: "send-001", iceParameters: "..." }
    }
  },
  {
    id: 7,
    title: "Create Client Send Transport",
    description: "Client creates local SendTransport with server parameters",
    source: "client",
    target: "client",
    event: "device.createSendTransport()",
    category: "transport",
    details: {
      response: { transport: "SendTransport" }
    }
  },
  {
    id: 8,
    title: "Create Receive Transport",
    description: "Client requests server to create a transport for receiving media",
    source: "client",
    target: "server",
    event: "createTransport",
    category: "transport",
    details: {
      request: { direction: "recv" },
      response: { transportId: "recv-002", iceParameters: "..." }
    }
  },
  {
    id: 9,
    title: "Create Client Recv Transport",
    description: "Client creates local RecvTransport with server parameters",
    source: "client",
    target: "client",
    event: "device.createRecvTransport()",
    category: "transport",
    details: {
      response: { transport: "RecvTransport" }
    }
  },

  // Get User Media
  {
    id: 10,
    title: "Get User Media",
    description: "Client requests camera and microphone access from browser",
    source: "client",
    target: "client",
    event: "getUserMedia()",
    category: "producer",
    details: {
      request: { audio: true, video: { width: 1280, height: 720 } },
      response: { audioTrack: "MediaStreamTrack", videoTrack: "MediaStreamTrack" }
    }
  },

  // Produce Audio
  {
    id: 11,
    title: "Connect Send Transport",
    description: "Transport fires 'connect' event, client signals server with DTLS params",
    source: "client",
    target: "server",
    event: "connectTransport",
    category: "producer",
    details: {
      request: { dtlsParameters: "..." },
      response: { connected: true }
    }
  },
  {
    id: 12,
    title: "Produce Audio",
    description: "Client produces audio track, server creates audio Producer",
    source: "client",
    target: "server",
    event: "produce",
    category: "producer",
    details: {
      request: { kind: "audio", rtpParameters: "..." },
      response: { producerId: "audio-producer-001" }
    }
  },
  {
    id: 13,
    title: "Broadcast Audio Producer",
    description: "Server notifies other participants about new audio producer",
    source: "server",
    target: "client",
    event: "newProducer",
    category: "producer",
    details: {
      response: { producerId: "audio-producer-001", kind: "audio", participantName: "John Doe" }
    }
  },

  // Produce Video
  {
    id: 14,
    title: "Produce Video",
    description: "Client produces video track, server creates video Producer",
    source: "client",
    target: "server",
    event: "produce",
    category: "producer",
    details: {
      request: { kind: "video", rtpParameters: "..." },
      response: { producerId: "video-producer-002" }
    }
  },
  {
    id: 15,
    title: "Broadcast Video Producer",
    description: "Server notifies other participants about new video producer",
    source: "server",
    target: "client",
    event: "newProducer",
    category: "producer",
    details: {
      response: { producerId: "video-producer-002", kind: "video", participantName: "John Doe" }
    }
  },

  // Consume Remote Media
  {
    id: 16,
    title: "Get Participants",
    description: "Client requests list of existing participants in the conference",
    source: "client",
    target: "server",
    event: "getParticipants",
    category: "consumer",
    details: {
      response: { participants: [{ id: "user-789", name: "Jane Smith" }] }
    }
  },
  {
    id: 17,
    title: "Consume Participant Media",
    description: "Client requests to consume all media from a remote participant",
    source: "client",
    target: "server",
    event: "consumeParticipantMedia",
    category: "consumer",
    details: {
      request: { targetParticipantId: "user-789", rtpCapabilities: "..." },
      response: { consumers: ["audio-consumer", "video-consumer"] }
    }
  },
  {
    id: 18,
    title: "Connect Recv Transport",
    description: "Receive transport connects for the first consumption",
    source: "client",
    target: "server",
    event: "connectTransport",
    category: "consumer",
    details: {
      request: { direction: "recv", dtlsParameters: "..." },
      response: { connected: true }
    }
  },
  {
    id: 19,
    title: "Create Local Consumers",
    description: "Client creates local Consumer objects to receive media tracks",
    source: "client",
    target: "client",
    event: "recvTransport.consume()",
    category: "consumer",
    details: {
      response: { audioTrack: "MediaStreamTrack", videoTrack: "MediaStreamTrack" }
    }
  },
  {
    id: 20,
    title: "Resume Consumers",
    description: "Client requests server to resume paused consumers for media flow",
    source: "client",
    target: "server",
    event: "unpauseConsumer",
    category: "consumer",
    details: {
      response: { resumed: true, mediaFlowing: true }
    }
  },
  {
    id: 21,
    title: "Media Flowing",
    description: "Audio and video streams now flowing between participants via SFU",
    source: "server",
    target: "client",
    event: "RTP Media Stream",
    category: "consumer",
    details: {
      response: { audio: "streaming", video: "streaming" }
    }
  },

  // Cleanup
  {
    id: 22,
    title: "Close Producer",
    description: "Client closes a producer (e.g., turning off camera)",
    source: "client",
    target: "server",
    event: "closeProducer",
    category: "cleanup",
    details: {
      request: { producerId: "video-producer-002" },
      response: { closed: true }
    }
  },
  {
    id: 23,
    title: "Producer Closed Broadcast",
    description: "Server notifies all participants about closed producer",
    source: "server",
    target: "client",
    event: "producerClosed",
    category: "cleanup",
    details: {
      response: { producerId: "video-producer-002", kind: "video" }
    }
  },
  {
    id: 24,
    title: "Leave Conference",
    description: "Client leaves the conference, server cleans up resources",
    source: "client",
    target: "server",
    event: "leaveConference",
    category: "cleanup",
    details: {
      request: { conferenceId: "room-123" },
      response: { left: true }
    }
  },
  {
    id: 25,
    title: "Participant Left Broadcast",
    description: "Server notifies remaining participants and cleans up consumers",
    source: "server",
    target: "client",
    event: "participantLeft",
    category: "cleanup",
    details: {
      response: { participantId: "user-456", closedProducers: ["audio-001"], closedConsumers: ["consumer-001"] }
    }
  }
];

export const categoryColors: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  connection: { 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/50', 
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-indigo-500'
  },
  conference: { 
    bg: 'bg-purple-500/10', 
    border: 'border-purple-500/50', 
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-violet-500'
  },
  transport: { 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/50', 
    text: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-500'
  },
  producer: { 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/50', 
    text: 'text-orange-400',
    gradient: 'from-orange-500 to-amber-500'
  },
  consumer: { 
    bg: 'bg-pink-500/10', 
    border: 'border-pink-500/50', 
    text: 'text-pink-400',
    gradient: 'from-pink-500 to-rose-500'
  },
  cleanup: { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/50', 
    text: 'text-red-400',
    gradient: 'from-red-500 to-rose-600'
  }
};
