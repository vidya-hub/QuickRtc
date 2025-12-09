export interface EventStep {
  id: number;
  title: string;
  description: string;
  source: 'client' | 'server';
  target: 'client' | 'server';
  event: string;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  category: 'connection' | 'conference' | 'transport' | 'producer' | 'consumer' | 'cleanup';
}

export const eventSteps: EventStep[] = [
  // Connection Phase
  {
    id: 1,
    title: "Socket Connection",
    description: "Client establishes WebSocket connection with server using Socket.IO",
    source: "client",
    target: "server",
    event: "socket.connect()",
    requestData: { url: "wss://server:3443" },
    responseData: { socketId: "abc123xyz" },
    category: "connection"
  },
  
  // Join Conference Phase
  {
    id: 2,
    title: "Join Conference Request",
    description: "Client requests to join a conference room with participant details",
    source: "client",
    target: "server",
    event: "joinConference",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      participantName: "John Doe",
      conferenceName: "Team Meeting"
    },
    category: "conference"
  },
  {
    id: 3,
    title: "Worker Selection",
    description: "Server selects optimal mediasoup Worker based on CPU usage and router count",
    source: "server",
    target: "server",
    event: "WorkerService.getWorker()",
    requestData: { workerCount: 4 },
    responseData: { selectedWorkerPid: 12345, cpuUsage: 15, routerCount: 2 },
    category: "conference"
  },
  {
    id: 4,
    title: "Router Creation",
    description: "Server creates a mediasoup Router on the selected Worker with media codecs",
    source: "server",
    target: "server",
    event: "worker.createRouter()",
    requestData: {
      mediaCodecs: [
        { kind: "audio", mimeType: "audio/opus" },
        { kind: "video", mimeType: "video/VP8" },
        { kind: "video", mimeType: "video/H264" }
      ]
    },
    responseData: { routerId: "router-789" },
    category: "conference"
  },
  {
    id: 5,
    title: "Conference Created",
    description: "Server creates Conference object and adds participant to it",
    source: "server",
    target: "server",
    event: "new MediasoupConference()",
    responseData: {
      conferenceId: "room-123",
      participantId: "user-456",
      routerRtpCapabilities: { codecs: ["opus", "VP8", "H264"] }
    },
    category: "conference"
  },
  {
    id: 6,
    title: "Join Conference Response",
    description: "Server returns Router RTP capabilities needed for device loading",
    source: "server",
    target: "client",
    event: "joinConference (response)",
    responseData: {
      status: "ok",
      routerCapabilities: {
        codecs: [
          { mimeType: "audio/opus", clockRate: 48000, channels: 2 },
          { mimeType: "video/VP8", clockRate: 90000 }
        ]
      }
    },
    category: "conference"
  },
  {
    id: 7,
    title: "Notify Other Participants",
    description: "Server broadcasts participantJoined event to all other participants in the room",
    source: "server",
    target: "client",
    event: "participantJoined (broadcast)",
    responseData: {
      participantId: "user-456",
      participantName: "John Doe",
      conferenceId: "room-123"
    },
    category: "conference"
  },
  
  // Device Loading
  {
    id: 8,
    title: "Load mediasoup Device",
    description: "Client creates and loads mediasoup-client Device with router capabilities",
    source: "client",
    target: "client",
    event: "device.load()",
    requestData: { routerRtpCapabilities: "..." },
    responseData: { canProduce: { audio: true, video: true } },
    category: "transport"
  },
  
  // Create Send Transport
  {
    id: 9,
    title: "Create Send Transport Request",
    description: "Client requests creation of WebRTC transport for sending media",
    source: "client",
    target: "server",
    event: "createTransport",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      direction: "producer"
    },
    category: "transport"
  },
  {
    id: 10,
    title: "Server Creates WebRTC Transport",
    description: "Server creates WebRtcTransport on the Router for producing media",
    source: "server",
    target: "server",
    event: "router.createWebRtcTransport()",
    requestData: {
      listenIps: [{ ip: "0.0.0.0", announcedIp: "192.168.1.100" }],
      enableUdp: true,
      enableTcp: true
    },
    responseData: { transportId: "send-transport-001" },
    category: "transport"
  },
  {
    id: 11,
    title: "Send Transport Response",
    description: "Server returns transport parameters for client-side transport creation",
    source: "server",
    target: "client",
    event: "createTransport (response)",
    responseData: {
      id: "send-transport-001",
      iceParameters: { usernameFragment: "abc", password: "xyz" },
      iceCandidates: [{ ip: "192.168.1.100", port: 40000, protocol: "udp" }],
      dtlsParameters: { fingerprints: ["sha-256:..."], role: "auto" }
    },
    category: "transport"
  },
  {
    id: 12,
    title: "Create Client Send Transport",
    description: "Client creates local SendTransport using server parameters",
    source: "client",
    target: "client",
    event: "device.createSendTransport()",
    requestData: { transportParams: "..." },
    responseData: { sendTransport: "Transport object" },
    category: "transport"
  },
  
  // Create Receive Transport
  {
    id: 13,
    title: "Create Receive Transport Request",
    description: "Client requests creation of WebRTC transport for receiving media",
    source: "client",
    target: "server",
    event: "createTransport",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      direction: "consumer"
    },
    category: "transport"
  },
  {
    id: 14,
    title: "Server Creates Receive Transport",
    description: "Server creates WebRtcTransport on the Router for consuming media",
    source: "server",
    target: "server",
    event: "router.createWebRtcTransport()",
    responseData: { transportId: "recv-transport-002" },
    category: "transport"
  },
  {
    id: 15,
    title: "Receive Transport Response",
    description: "Server returns transport parameters for receiving media",
    source: "server",
    target: "client",
    event: "createTransport (response)",
    responseData: {
      id: "recv-transport-002",
      iceParameters: { usernameFragment: "def", password: "uvw" },
      iceCandidates: [{ ip: "192.168.1.100", port: 40001, protocol: "udp" }],
      dtlsParameters: { fingerprints: ["sha-256:..."], role: "auto" }
    },
    category: "transport"
  },
  {
    id: 16,
    title: "Create Client Receive Transport",
    description: "Client creates local RecvTransport using server parameters",
    source: "client",
    target: "client",
    event: "device.createRecvTransport()",
    responseData: { recvTransport: "Transport object" },
    category: "transport"
  },
  
  // Get User Media
  {
    id: 17,
    title: "Get User Media",
    description: "Client requests access to camera and microphone",
    source: "client",
    target: "client",
    event: "navigator.mediaDevices.getUserMedia()",
    requestData: { audio: true, video: { width: 1280, height: 720 } },
    responseData: { 
      audioTrack: "MediaStreamTrack (audio)",
      videoTrack: "MediaStreamTrack (video)"
    },
    category: "producer"
  },
  
  // Produce Audio
  {
    id: 18,
    title: "Produce Audio - Transport Connect",
    description: "SendTransport triggers 'connect' event when first producing",
    source: "client",
    target: "server",
    event: "connectTransport",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      direction: "producer",
      dtlsParameters: { role: "client", fingerprints: ["sha-256:..."] }
    },
    category: "producer"
  },
  {
    id: 19,
    title: "Server Connects Send Transport",
    description: "Server completes DTLS handshake for send transport",
    source: "server",
    target: "server",
    event: "transport.connect()",
    requestData: { dtlsParameters: "..." },
    responseData: { status: "connected" },
    category: "producer"
  },
  {
    id: 20,
    title: "Connect Transport Response",
    description: "Server confirms transport connection success",
    source: "server",
    target: "client",
    event: "connectTransport (response)",
    responseData: { status: "ok" },
    category: "producer"
  },
  {
    id: 21,
    title: "Produce Audio Request",
    description: "Client initiates audio production, triggering 'produce' event",
    source: "client",
    target: "server",
    event: "produce",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      transportId: "send-transport-001",
      kind: "audio",
      rtpParameters: {
        codecs: [{ mimeType: "audio/opus", payloadType: 111 }],
        encodings: [{ ssrc: 12345678 }]
      }
    },
    category: "producer"
  },
  {
    id: 22,
    title: "Server Creates Audio Producer",
    description: "Server creates Producer on the transport for audio track",
    source: "server",
    target: "server",
    event: "transport.produce()",
    requestData: { kind: "audio", rtpParameters: "..." },
    responseData: { producerId: "audio-producer-001" },
    category: "producer"
  },
  {
    id: 23,
    title: "Produce Audio Response",
    description: "Server returns producer ID to client",
    source: "server",
    target: "client",
    event: "produce (response)",
    responseData: { status: "ok", producerId: "audio-producer-001" },
    category: "producer"
  },
  {
    id: 24,
    title: "Broadcast New Audio Producer",
    description: "Server notifies other participants about new audio producer",
    source: "server",
    target: "client",
    event: "newProducer (broadcast)",
    responseData: {
      producerId: "audio-producer-001",
      participantId: "user-456",
      participantName: "John Doe",
      kind: "audio"
    },
    category: "producer"
  },
  
  // Produce Video
  {
    id: 25,
    title: "Produce Video Request",
    description: "Client initiates video production",
    source: "client",
    target: "server",
    event: "produce",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      transportId: "send-transport-001",
      kind: "video",
      rtpParameters: {
        codecs: [{ mimeType: "video/VP8", payloadType: 96 }],
        encodings: [{ ssrc: 87654321, maxBitrate: 1000000 }]
      }
    },
    category: "producer"
  },
  {
    id: 26,
    title: "Server Creates Video Producer",
    description: "Server creates Producer on the transport for video track",
    source: "server",
    target: "server",
    event: "transport.produce()",
    responseData: { producerId: "video-producer-002" },
    category: "producer"
  },
  {
    id: 27,
    title: "Produce Video Response",
    description: "Server returns video producer ID to client",
    source: "server",
    target: "client",
    event: "produce (response)",
    responseData: { status: "ok", producerId: "video-producer-002" },
    category: "producer"
  },
  {
    id: 28,
    title: "Broadcast New Video Producer",
    description: "Server notifies other participants about new video producer",
    source: "server",
    target: "client",
    event: "newProducer (broadcast)",
    responseData: {
      producerId: "video-producer-002",
      participantId: "user-456",
      participantName: "John Doe",
      kind: "video"
    },
    category: "producer"
  },
  
  // Consume Remote Participant Media
  {
    id: 29,
    title: "Get Participants List",
    description: "Client requests list of existing participants in the conference",
    source: "client",
    target: "server",
    event: "getParticipants",
    requestData: { conferenceId: "room-123" },
    category: "consumer"
  },
  {
    id: 30,
    title: "Participants List Response",
    description: "Server returns list of all participants with their info",
    source: "server",
    target: "client",
    event: "getParticipants (response)",
    responseData: {
      status: "ok",
      participants: [
        { participantId: "user-456", participantName: "John Doe" },
        { participantId: "user-789", participantName: "Jane Smith" }
      ]
    },
    category: "consumer"
  },
  {
    id: 31,
    title: "Consume Participant Media Request",
    description: "Client requests to consume media from a specific participant",
    source: "client",
    target: "server",
    event: "consumeParticipantMedia",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      targetParticipantId: "user-789",
      rtpCapabilities: { codecs: ["opus", "VP8"] }
    },
    category: "consumer"
  },
  {
    id: 32,
    title: "Server Gets Target Producers",
    description: "Server retrieves all producer IDs for target participant",
    source: "server",
    target: "server",
    event: "conference.getExistingProducerIds()",
    responseData: {
      producerIds: ["audio-producer-003", "video-producer-004"]
    },
    category: "consumer"
  },
  {
    id: 33,
    title: "Server Creates Audio Consumer",
    description: "Server creates Consumer for target's audio producer",
    source: "server",
    target: "server",
    event: "transport.consume()",
    requestData: {
      producerId: "audio-producer-003",
      rtpCapabilities: "...",
      paused: true
    },
    responseData: { consumerId: "audio-consumer-001" },
    category: "consumer"
  },
  {
    id: 34,
    title: "Server Creates Video Consumer",
    description: "Server creates Consumer for target's video producer",
    source: "server",
    target: "server",
    event: "transport.consume()",
    requestData: {
      producerId: "video-producer-004",
      rtpCapabilities: "..."
    },
    responseData: { consumerId: "video-consumer-002" },
    category: "consumer"
  },
  {
    id: 35,
    title: "Consume Media Response",
    description: "Server returns consumer parameters for all media tracks",
    source: "server",
    target: "client",
    event: "consumeParticipantMedia (response)",
    responseData: {
      status: "ok",
      consumers: [
        {
          id: "audio-consumer-001",
          producerId: "audio-producer-003",
          kind: "audio",
          rtpParameters: { codecs: [{ mimeType: "audio/opus" }] }
        },
        {
          id: "video-consumer-002",
          producerId: "video-producer-004",
          kind: "video",
          rtpParameters: { codecs: [{ mimeType: "video/VP8" }] }
        }
      ]
    },
    category: "consumer"
  },
  
  // Connect Receive Transport (if first time consuming)
  {
    id: 36,
    title: "Connect Receive Transport",
    description: "RecvTransport triggers 'connect' when first consuming",
    source: "client",
    target: "server",
    event: "connectTransport",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      direction: "consumer",
      dtlsParameters: { role: "client" }
    },
    category: "consumer"
  },
  {
    id: 37,
    title: "Server Connects Receive Transport",
    description: "Server completes DTLS handshake for receive transport",
    source: "server",
    target: "server",
    event: "transport.connect()",
    responseData: { status: "connected" },
    category: "consumer"
  },
  {
    id: 38,
    title: "Connect Response",
    description: "Server confirms receive transport connection",
    source: "server",
    target: "client",
    event: "connectTransport (response)",
    responseData: { status: "ok" },
    category: "consumer"
  },
  
  // Create Local Consumers
  {
    id: 39,
    title: "Create Local Audio Consumer",
    description: "Client creates local Consumer with server parameters",
    source: "client",
    target: "client",
    event: "recvTransport.consume()",
    requestData: {
      id: "audio-consumer-001",
      producerId: "audio-producer-003",
      kind: "audio",
      rtpParameters: "..."
    },
    responseData: { track: "MediaStreamTrack (audio)" },
    category: "consumer"
  },
  {
    id: 40,
    title: "Create Local Video Consumer",
    description: "Client creates local Consumer for video",
    source: "client",
    target: "client",
    event: "recvTransport.consume()",
    requestData: {
      id: "video-consumer-002",
      producerId: "video-producer-004",
      kind: "video"
    },
    responseData: { track: "MediaStreamTrack (video)" },
    category: "consumer"
  },
  
  // Resume Consumers
  {
    id: 41,
    title: "Unpause Audio Consumer",
    description: "Client requests to resume paused audio consumer",
    source: "client",
    target: "server",
    event: "unpauseConsumer",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      consumerId: "audio-consumer-001"
    },
    category: "consumer"
  },
  {
    id: 42,
    title: "Server Resumes Audio Consumer",
    description: "Server resumes the consumer to start media flow",
    source: "server",
    target: "server",
    event: "consumer.resume()",
    responseData: { status: "resumed" },
    category: "consumer"
  },
  {
    id: 43,
    title: "Unpause Video Consumer",
    description: "Client requests to resume video consumer",
    source: "client",
    target: "server",
    event: "unpauseConsumer",
    requestData: { consumerId: "video-consumer-002" },
    category: "consumer"
  },
  {
    id: 44,
    title: "Media Flowing",
    description: "Audio and video media now flowing from producer to consumer via SFU",
    source: "server",
    target: "client",
    event: "RTP Media Stream",
    responseData: {
      audioStream: "MediaStream with audio track",
      videoStream: "MediaStream with video track"
    },
    category: "consumer"
  },
  
  // Cleanup - Close Producer
  {
    id: 45,
    title: "Close Producer Request",
    description: "Client requests to close a producer (e.g., muting video)",
    source: "client",
    target: "server",
    event: "closeProducer",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456",
      producerId: "video-producer-002"
    },
    category: "cleanup"
  },
  {
    id: 46,
    title: "Server Closes Producer",
    description: "Server closes the producer and releases resources",
    source: "server",
    target: "server",
    event: "producer.close()",
    responseData: { kind: "video" },
    category: "cleanup"
  },
  {
    id: 47,
    title: "Broadcast Producer Closed",
    description: "Server notifies all participants about closed producer",
    source: "server",
    target: "client",
    event: "producerClosed (broadcast)",
    responseData: {
      producerId: "video-producer-002",
      participantId: "user-456",
      kind: "video"
    },
    category: "cleanup"
  },
  
  // Leave Conference
  {
    id: 48,
    title: "Leave Conference Request",
    description: "Client requests to leave the conference",
    source: "client",
    target: "server",
    event: "leaveConference",
    requestData: {
      conferenceId: "room-123",
      participantId: "user-456"
    },
    category: "cleanup"
  },
  {
    id: 49,
    title: "Server Cleanup Participant",
    description: "Server closes all transports, producers, and consumers for participant",
    source: "server",
    target: "server",
    event: "participant.cleanup()",
    responseData: {
      closedProducerIds: ["audio-producer-001"],
      closedConsumerIds: ["audio-consumer-001", "video-consumer-002"]
    },
    category: "cleanup"
  },
  {
    id: 50,
    title: "Broadcast Participant Left",
    description: "Server notifies remaining participants about departure",
    source: "server",
    target: "client",
    event: "participantLeft (broadcast)",
    responseData: {
      participantId: "user-456",
      closedProducerIds: ["audio-producer-001"],
      closedConsumerIds: ["audio-consumer-001", "video-consumer-002"]
    },
    category: "cleanup"
  },
  {
    id: 51,
    title: "Conference Cleanup Check",
    description: "Server checks if conference is empty and cleans up resources",
    source: "server",
    target: "server",
    event: "conference.isEmpty() ? cleanup()",
    responseData: {
      isEmpty: true,
      action: "Close router and remove conference"
    },
    category: "cleanup"
  }
];

export const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  connection: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  conference: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  transport: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  producer: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
  consumer: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-400' },
  cleanup: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' }
};
