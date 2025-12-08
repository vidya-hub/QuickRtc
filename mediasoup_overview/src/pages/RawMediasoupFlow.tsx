import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';

// ============================================
// TYPES
// ============================================

interface FlowEvent {
  id: number;
  from: string;
  to: string;
  action: string;
  description: string;
  emoji?: string;
  technical?: string;
}

interface Participant {
  name: string;
  emoji: string;
  color: string;
  x: number;
}

interface TabConfig {
  title: string;
  subtitle: string;
  events: FlowEvent[];
  participants: Record<string, Participant>;
}

// ============================================
// TAB 1: ZOOM CALL ANALOGY
// ============================================

const zoomCallEvents: FlowEvent[] = [
  { id: 1, from: "zoom", to: "zoom", action: "Zoom Server Ready", description: "Zoom's server is running and ready to host meetings.", emoji: "☁️", technical: "Server starts, creates Worker & Router" },
  { id: 2, from: "alice", to: "zoom", action: "Alice Clicks Join", description: "Alice clicks 'Join Meeting' and connects to Zoom.", emoji: "🖱️", technical: "WebSocket connection" },
  { id: 3, from: "zoom", to: "alice", action: "Meeting Settings", description: "Zoom tells Alice what video/audio formats are supported.", emoji: "⚙️", technical: "getRouterRtpCapabilities" },
  { id: 4, from: "alice", to: "alice", action: "Alice's Device Check", description: "Zoom app checks if Alice's camera & mic are compatible.", emoji: "✅", technical: "device.load(rtpCapabilities)" },
  { id: 5, from: "bob", to: "zoom", action: "Bob Clicks Join", description: "Bob joins the same meeting.", emoji: "🖱️", technical: "WebSocket connection" },
  { id: 6, from: "zoom", to: "bob", action: "Meeting Settings", description: "Zoom sends Bob the same supported formats.", emoji: "⚙️", technical: "getRouterRtpCapabilities" },
  { id: 7, from: "bob", to: "bob", action: "Bob's Device Check", description: "Zoom checks Bob's device compatibility.", emoji: "✅", technical: "device.load(rtpCapabilities)" },
  { id: 8, from: "alice", to: "zoom", action: "Alice Unmutes Video", description: "Alice clicks the camera button to turn on video.", emoji: "📹", technical: "createWebRtcTransport (send)" },
  { id: 9, from: "zoom", to: "alice", action: "Upload Channel Ready", description: "Zoom creates a channel to receive Alice's video.", emoji: "📤", technical: "Transport params (ICE, DTLS)" },
  { id: 10, from: "alice", to: "zoom", action: "Alice's Video Sending", description: "Alice's camera feed is now uploading to Zoom.", emoji: "🎥", technical: "transport.produce({ track: videoTrack })" },
  { id: 11, from: "zoom", to: "zoom", action: "Alice's Video Available", description: "Zoom server now has Alice's video ready to share.", emoji: "☁️", technical: "Producer created (producerId)" },
  { id: 12, from: "bob", to: "zoom", action: "Bob Ready to Receive", description: "Bob's app prepares to download video streams.", emoji: "📥", technical: "createWebRtcTransport (recv)" },
  { id: 13, from: "zoom", to: "bob", action: "Download Channel Ready", description: "Zoom creates a channel to send video to Bob.", emoji: "📥", technical: "Transport params (ICE, DTLS)" },
  { id: 14, from: "bob", to: "zoom", action: "Bob Wants Alice's Video", description: "Bob's app requests to see Alice's video.", emoji: "👀", technical: "consume({ producerId })" },
  { id: 15, from: "zoom", to: "zoom", action: "Routing Video", description: "Zoom prepares to route Alice's video to Bob.", emoji: "🔀", technical: "Consumer created (paused)" },
  { id: 16, from: "zoom", to: "bob", action: "Bob Sees Alice!", description: "Alice appears in Bob's Zoom window!", emoji: "🖥️", technical: "consumer.resume() - Media flowing!" },
  { id: 17, from: "bob", to: "zoom", action: "Bob Unmutes Video", description: "Bob clicks his camera button too.", emoji: "📹", technical: "transport.produce({ track })" },
  { id: 18, from: "zoom", to: "zoom", action: "Bob's Video Available", description: "Zoom now has Bob's video ready to share.", emoji: "☁️", technical: "Producer created" },
  { id: 19, from: "alice", to: "zoom", action: "Alice Wants Bob's Video", description: "Alice's app requests Bob's video stream.", emoji: "👀", technical: "consume({ producerId })" },
  { id: 20, from: "zoom", to: "alice", action: "Video Call Connected!", description: "Alice and Bob can see each other - just like a real Zoom call!", emoji: "🎉", technical: "Media flowing both ways!" },
];

// ============================================
// TAB 2: ONE-TO-ONE VIDEO CALL
// ============================================

const oneToOneEvents: FlowEvent[] = [
  { id: 1, from: "server", to: "server", action: "Create Worker", description: "Server spawns a mediasoup Worker process.", emoji: "⚙️", technical: "mediasoup.createWorker()" },
  { id: 2, from: "server", to: "server", action: "Create Router", description: "Worker creates a Router with supported codecs.", emoji: "🔀", technical: "worker.createRouter({ mediaCodecs })" },
  { id: 3, from: "alice", to: "server", action: "Connect", description: "Alice connects to the signaling server.", emoji: "🔌", technical: "WebSocket.connect()" },
  { id: 4, from: "server", to: "alice", action: "Router Capabilities", description: "Server sends RTP capabilities to Alice.", emoji: "📋", technical: "router.rtpCapabilities" },
  { id: 5, from: "alice", to: "alice", action: "Create Device", description: "Alice creates and loads mediasoup Device.", emoji: "📱", technical: "device.load({ routerRtpCapabilities })" },
  { id: 6, from: "alice", to: "server", action: "Create Send Transport", description: "Alice requests a transport to send media.", emoji: "📤", technical: "createWebRtcTransport({ direction: 'send' })" },
  { id: 7, from: "server", to: "server", action: "Transport Created", description: "Server creates WebRTC transport for Alice.", emoji: "🛤️", technical: "router.createWebRtcTransport()" },
  { id: 8, from: "server", to: "alice", action: "Transport Params", description: "Server sends ICE/DTLS parameters to Alice.", emoji: "📨", technical: "{ id, iceParameters, iceCandidates, dtlsParameters }" },
  { id: 9, from: "alice", to: "alice", action: "Create Local Transport", description: "Alice creates local send transport.", emoji: "🔧", technical: "device.createSendTransport(params)" },
  { id: 10, from: "bob", to: "server", action: "Connect", description: "Bob connects to the signaling server.", emoji: "🔌", technical: "WebSocket.connect()" },
  { id: 11, from: "server", to: "bob", action: "Router Capabilities", description: "Server sends RTP capabilities to Bob.", emoji: "📋", technical: "router.rtpCapabilities" },
  { id: 12, from: "bob", to: "bob", action: "Create Device", description: "Bob creates and loads mediasoup Device.", emoji: "📱", technical: "device.load({ routerRtpCapabilities })" },
  { id: 13, from: "bob", to: "server", action: "Create Send Transport", description: "Bob requests a transport to send media.", emoji: "📤", technical: "createWebRtcTransport({ direction: 'send' })" },
  { id: 14, from: "server", to: "bob", action: "Transport Params", description: "Server sends transport params to Bob.", emoji: "📨", technical: "{ id, iceParameters, iceCandidates, dtlsParameters }" },
  { id: 15, from: "alice", to: "server", action: "Connect Transport", description: "Alice connects her send transport (DTLS handshake).", emoji: "🤝", technical: "transport.on('connect') → transport.connect({ dtlsParameters })" },
  { id: 16, from: "alice", to: "server", action: "Produce Video", description: "Alice sends her video track to server.", emoji: "🎥", technical: "transport.produce({ track: videoTrack, kind: 'video' })" },
  { id: 17, from: "server", to: "server", action: "Create Producer", description: "Server creates Producer for Alice's video.", emoji: "📹", technical: "transport.produce({ kind, rtpParameters })" },
  { id: 18, from: "server", to: "alice", action: "Producer ID", description: "Server confirms Producer creation.", emoji: "✅", technical: "{ producerId: 'alice-video-001' }" },
  { id: 19, from: "bob", to: "server", action: "Connect Transport", description: "Bob connects his send transport.", emoji: "🤝", technical: "transport.connect({ dtlsParameters })" },
  { id: 20, from: "bob", to: "server", action: "Produce Video", description: "Bob sends his video track to server.", emoji: "🎥", technical: "transport.produce({ track: videoTrack })" },
  { id: 21, from: "server", to: "server", action: "Create Producer", description: "Server creates Producer for Bob's video.", emoji: "📹", technical: "transport.produce({ kind, rtpParameters })" },
  { id: 22, from: "bob", to: "server", action: "Create Recv Transport", description: "Bob requests transport to receive media.", emoji: "📥", technical: "createWebRtcTransport({ direction: 'recv' })" },
  { id: 23, from: "server", to: "bob", action: "Recv Transport Params", description: "Server sends receive transport params.", emoji: "📨", technical: "{ id, iceParameters, ... }" },
  { id: 24, from: "bob", to: "server", action: "Consume Alice", description: "Bob requests to consume Alice's video.", emoji: "👀", technical: "consume({ producerId: 'alice-video', rtpCapabilities })" },
  { id: 25, from: "server", to: "server", action: "Create Consumer", description: "Server creates Consumer (Alice → Bob).", emoji: "📺", technical: "transport.consume({ producerId, rtpCapabilities, paused: true })" },
  { id: 26, from: "server", to: "bob", action: "Consumer Params", description: "Server sends consumer params to Bob.", emoji: "📨", technical: "{ consumerId, producerId, kind, rtpParameters }" },
  { id: 27, from: "bob", to: "bob", action: "Create Local Consumer", description: "Bob creates local consumer, gets video track.", emoji: "🖥️", technical: "recvTransport.consume(params) → consumer.track" },
  { id: 28, from: "bob", to: "server", action: "Resume Consumer", description: "Bob tells server to start sending media.", emoji: "▶️", technical: "consumer.resume()" },
  { id: 29, from: "server", to: "bob", action: "Alice's Video Flowing", description: "Bob now sees Alice's video!", emoji: "📡", technical: "RTP packets flowing" },
  { id: 30, from: "alice", to: "server", action: "Create Recv Transport", description: "Alice requests receive transport.", emoji: "📥", technical: "createWebRtcTransport({ direction: 'recv' })" },
  { id: 31, from: "alice", to: "server", action: "Consume Bob", description: "Alice requests to consume Bob's video.", emoji: "👀", technical: "consume({ producerId: 'bob-video' })" },
  { id: 32, from: "server", to: "server", action: "Create Consumer", description: "Server creates Consumer (Bob → Alice).", emoji: "📺", technical: "transport.consume({ producerId, rtpCapabilities })" },
  { id: 33, from: "server", to: "alice", action: "Bob's Video Flowing", description: "Alice now sees Bob's video!", emoji: "📡", technical: "RTP packets flowing" },
  { id: 34, from: "alice", to: "bob", action: "Video Call Active!", description: "Both can see each other - call established!", emoji: "🎉", technical: "Bidirectional media flow ✓" },
];

// ============================================
// TAB 3: GROUP CALL (ONE-TO-MANY)
// ============================================

const oneToManyEvents: FlowEvent[] = [
  // Server Setup
  { id: 1, from: "server", to: "server", action: "Create Worker", description: "Server spawns mediasoup Worker process.", emoji: "⚙️", technical: "mediasoup.createWorker()" },
  { id: 2, from: "server", to: "server", action: "Create Router", description: "Worker creates Router with media codecs.", emoji: "🔀", technical: "worker.createRouter({ mediaCodecs })" },
  
  // Sarah (Host) Joins
  { id: 3, from: "sarah", to: "server", action: "Sarah Connects", description: "Sarah connects via WebSocket to join.", emoji: "🔌", technical: "WebSocket.connect()" },
  { id: 4, from: "server", to: "sarah", action: "Router Capabilities", description: "Server sends RTP capabilities to Sarah.", emoji: "📋", technical: "router.rtpCapabilities" },
  { id: 5, from: "sarah", to: "sarah", action: "Load Device", description: "Sarah creates and loads mediasoup Device.", emoji: "📱", technical: "device.load({ routerRtpCapabilities })" },
  { id: 6, from: "sarah", to: "server", action: "Create Send Transport", description: "Sarah requests transport to send media.", emoji: "📤", technical: "createWebRtcTransport()" },
  { id: 7, from: "server", to: "sarah", action: "Send Transport Params", description: "Server returns ICE/DTLS parameters.", emoji: "📨", technical: "{ id, iceParameters, dtlsParameters }" },
  { id: 8, from: "sarah", to: "server", action: "Connect Send Transport", description: "Sarah connects transport (DTLS handshake).", emoji: "🤝", technical: "transport.connect({ dtlsParameters })" },
  { id: 9, from: "sarah", to: "server", action: "Produce Video", description: "Sarah produces her video track.", emoji: "🎥", technical: "transport.produce({ track: videoTrack })" },
  { id: 10, from: "server", to: "server", action: "Sarah Producer Created", description: "Server creates Producer for Sarah's video.", emoji: "📹", technical: "Producer ID: sarah-video" },
  { id: 11, from: "server", to: "sarah", action: "Producer Confirmed", description: "Server confirms producer ID to Sarah.", emoji: "✅", technical: "{ producerId: 'sarah-video' }" },
  { id: 12, from: "sarah", to: "server", action: "Create Recv Transport", description: "Sarah requests transport to receive media.", emoji: "📥", technical: "createWebRtcTransport()" },
  { id: 13, from: "server", to: "sarah", action: "Recv Transport Params", description: "Server returns receive transport params.", emoji: "📨", technical: "{ id, iceParameters, dtlsParameters }" },
  
  // John Joins
  { id: 14, from: "john", to: "server", action: "John Connects", description: "John connects via WebSocket.", emoji: "🔌", technical: "WebSocket.connect()" },
  { id: 15, from: "server", to: "john", action: "Router Capabilities", description: "Server sends RTP capabilities to John.", emoji: "📋", technical: "router.rtpCapabilities" },
  { id: 16, from: "john", to: "john", action: "Load Device", description: "John creates and loads Device.", emoji: "📱", technical: "device.load({ routerRtpCapabilities })" },
  { id: 17, from: "server", to: "john", action: "Existing Producers", description: "Server tells John about Sarah's video.", emoji: "📢", technical: "{ producers: ['sarah-video'] }" },
  { id: 18, from: "john", to: "server", action: "Create Send Transport", description: "John requests send transport.", emoji: "📤", technical: "createWebRtcTransport()" },
  { id: 19, from: "server", to: "john", action: "Send Transport Params", description: "Server returns transport params.", emoji: "📨", technical: "{ id, iceParameters, dtlsParameters }" },
  { id: 20, from: "john", to: "server", action: "Produce Video", description: "John produces his video track.", emoji: "🎥", technical: "transport.produce({ track: videoTrack })" },
  { id: 21, from: "server", to: "server", action: "John Producer Created", description: "Server creates Producer for John's video.", emoji: "📹", technical: "Producer ID: john-video" },
  { id: 22, from: "server", to: "sarah", action: "New Producer Event", description: "Sarah notified: John started producing.", emoji: "🔔", technical: "socket.emit('newProducer', { producerId: 'john-video' })" },
  { id: 23, from: "john", to: "server", action: "Create Recv Transport", description: "John requests receive transport.", emoji: "📥", technical: "createWebRtcTransport()" },
  { id: 24, from: "server", to: "john", action: "Recv Transport Params", description: "Server returns recv transport params.", emoji: "📨", technical: "{ id, iceParameters, dtlsParameters }" },
  
  // John consumes Sarah
  { id: 25, from: "john", to: "server", action: "Consume Sarah's Video", description: "John requests to consume Sarah's video.", emoji: "👀", technical: "consume({ producerId: 'sarah-video' })" },
  { id: 26, from: "server", to: "server", action: "Consumer Created", description: "Server creates Consumer (Sarah → John).", emoji: "📺", technical: "transport.consume({ producerId, rtpCapabilities })" },
  { id: 27, from: "server", to: "john", action: "Consumer Params", description: "Server sends consumer params to John.", emoji: "📨", technical: "{ consumerId, kind, rtpParameters }" },
  { id: 28, from: "john", to: "john", action: "Create Local Consumer", description: "John creates consumer, gets video track.", emoji: "🖥️", technical: "recvTransport.consume(params)" },
  { id: 29, from: "john", to: "server", action: "Resume Consumer", description: "John tells server to start sending.", emoji: "▶️", technical: "consumer.resume()" },
  { id: 30, from: "server", to: "john", action: "Sarah's Video Flowing", description: "John now sees Sarah!", emoji: "📡", technical: "RTP packets flowing" },
  
  // Sarah consumes John
  { id: 31, from: "sarah", to: "server", action: "Consume John's Video", description: "Sarah requests to consume John's video.", emoji: "👀", technical: "consume({ producerId: 'john-video' })" },
  { id: 32, from: "server", to: "server", action: "Consumer Created", description: "Server creates Consumer (John → Sarah).", emoji: "📺", technical: "transport.consume({ producerId, rtpCapabilities })" },
  { id: 33, from: "server", to: "sarah", action: "Consumer Params", description: "Server sends consumer params to Sarah.", emoji: "📨", technical: "{ consumerId, kind, rtpParameters }" },
  { id: 34, from: "sarah", to: "server", action: "Resume Consumer", description: "Sarah resumes consumer.", emoji: "▶️", technical: "consumer.resume()" },
  { id: 35, from: "server", to: "sarah", action: "John's Video Flowing", description: "Sarah now sees John!", emoji: "📡", technical: "RTP packets flowing" },
  
  // Emma Joins
  { id: 36, from: "emma", to: "server", action: "Emma Connects", description: "Emma connects via WebSocket.", emoji: "🔌", technical: "WebSocket.connect()" },
  { id: 37, from: "server", to: "emma", action: "Router Capabilities", description: "Server sends RTP capabilities.", emoji: "📋", technical: "router.rtpCapabilities" },
  { id: 38, from: "emma", to: "emma", action: "Load Device", description: "Emma loads Device.", emoji: "📱", technical: "device.load()" },
  { id: 39, from: "server", to: "emma", action: "Existing Producers", description: "Server tells Emma about Sarah & John.", emoji: "📢", technical: "{ producers: ['sarah-video', 'john-video'] }" },
  { id: 40, from: "emma", to: "server", action: "Create Transports", description: "Emma creates send & recv transports.", emoji: "🔄", technical: "createWebRtcTransport() x2" },
  { id: 41, from: "emma", to: "server", action: "Produce Video", description: "Emma produces her video.", emoji: "🎥", technical: "transport.produce({ track })" },
  { id: 42, from: "server", to: "server", action: "Emma Producer Created", description: "Server creates Emma's Producer.", emoji: "📹", technical: "Producer ID: emma-video" },
  { id: 43, from: "server", to: "sarah", action: "New Producer Event", description: "Sarah notified: Emma started producing.", emoji: "🔔", technical: "newProducer event" },
  { id: 44, from: "server", to: "john", action: "New Producer Event", description: "John notified: Emma started producing.", emoji: "🔔", technical: "newProducer event" },
  
  // Emma consumes Sarah & John
  { id: 45, from: "emma", to: "server", action: "Consume Sarah", description: "Emma requests Sarah's video.", emoji: "👀", technical: "consume({ producerId: 'sarah-video' })" },
  { id: 46, from: "server", to: "emma", action: "Sarah → Emma", description: "Emma receives Sarah's video.", emoji: "📡", technical: "Consumer created + resumed" },
  { id: 47, from: "emma", to: "server", action: "Consume John", description: "Emma requests John's video.", emoji: "👀", technical: "consume({ producerId: 'john-video' })" },
  { id: 48, from: "server", to: "emma", action: "John → Emma", description: "Emma receives John's video.", emoji: "📡", technical: "Consumer created + resumed" },
  
  // Sarah & John consume Emma
  { id: 49, from: "sarah", to: "server", action: "Consume Emma", description: "Sarah requests Emma's video.", emoji: "👀", technical: "consume({ producerId: 'emma-video' })" },
  { id: 50, from: "server", to: "sarah", action: "Emma → Sarah", description: "Sarah receives Emma's video.", emoji: "📡", technical: "Consumer created + resumed" },
  { id: 51, from: "john", to: "server", action: "Consume Emma", description: "John requests Emma's video.", emoji: "👀", technical: "consume({ producerId: 'emma-video' })" },
  { id: 52, from: "server", to: "john", action: "Emma → John", description: "John receives Emma's video.", emoji: "📡", technical: "Consumer created + resumed" },
  
  // All connected
  { id: 53, from: "server", to: "server", action: "All Connected!", description: "3 Producers, 6 Consumers - everyone sees everyone!", emoji: "🎉", technical: "Full mesh: 3×2 = 6 consumers" },
  
  // Screen Share
  { id: 54, from: "sarah", to: "server", action: "Produce Screen", description: "Sarah shares her screen (new Producer).", emoji: "🖥️", technical: "transport.produce({ track: screenTrack })" },
  { id: 55, from: "server", to: "server", action: "Screen Producer", description: "Server creates screen share Producer.", emoji: "📹", technical: "Producer ID: sarah-screen" },
  { id: 56, from: "server", to: "john", action: "New Producer: Screen", description: "John notified of screen share.", emoji: "🔔", technical: "newProducer event" },
  { id: 57, from: "server", to: "emma", action: "New Producer: Screen", description: "Emma notified of screen share.", emoji: "🔔", technical: "newProducer event" },
  { id: 58, from: "john", to: "server", action: "Consume Screen", description: "John consumes screen share.", emoji: "🖥️", technical: "consume({ producerId: 'sarah-screen' })" },
  { id: 59, from: "server", to: "john", action: "Screen → John", description: "John sees Sarah's screen.", emoji: "📡", technical: "Consumer created + resumed" },
  { id: 60, from: "emma", to: "server", action: "Consume Screen", description: "Emma consumes screen share.", emoji: "🖥️", technical: "consume({ producerId: 'sarah-screen' })" },
  { id: 61, from: "server", to: "emma", action: "Screen → Emma", description: "Emma sees Sarah's screen.", emoji: "📡", technical: "Consumer created + resumed" },
  
  // John Leaves
  { id: 62, from: "john", to: "server", action: "John Disconnects", description: "John leaves the meeting.", emoji: "👋", technical: "socket.disconnect()" },
  { id: 63, from: "server", to: "server", action: "Close John's Producer", description: "Server closes John's video Producer.", emoji: "🧹", technical: "producer.close()" },
  { id: 64, from: "server", to: "server", action: "Close John's Consumers", description: "Server closes consumers John was using.", emoji: "🧹", technical: "consumer.close() x3" },
  { id: 65, from: "server", to: "sarah", action: "Producer Closed", description: "Sarah notified: John's video ended.", emoji: "📴", technical: "producerClosed event" },
  { id: 66, from: "server", to: "emma", action: "Producer Closed", description: "Emma notified: John's video ended.", emoji: "📴", technical: "producerClosed event" },
  
  // Stop Screen Share
  { id: 67, from: "sarah", to: "server", action: "Stop Screen Share", description: "Sarah stops sharing screen.", emoji: "🛑", technical: "producer.close()" },
  { id: 68, from: "server", to: "server", action: "Close Screen Producer", description: "Server closes screen Producer.", emoji: "🧹", technical: "producer.close()" },
  { id: 69, from: "server", to: "emma", action: "Screen Consumer Closed", description: "Emma's screen consumer removed.", emoji: "📴", technical: "consumerClosed event" },
  
  // Final State
  { id: 70, from: "sarah", to: "emma", action: "Meeting Continues", description: "Sarah and Emma continue the call!", emoji: "💼", technical: "2 producers, 2 consumers remaining" },
];

// ============================================
// TAB CONFIG
// ============================================

const tabConfig: Record<string, TabConfig> = {
  zoomCall: {
    title: "📹 Zoom Call",
    subtitle: "How a video call works behind the scenes",
    events: zoomCallEvents,
    participants: {
      alice: { name: "Alice", emoji: "👩", color: "#ec4899", x: 100 },
      zoom: { name: "Zoom", emoji: "☁️", color: "#2D8CFF", x: 350 },
      bob: { name: "Bob", emoji: "👨", color: "#3b82f6", x: 600 },
    }
  },
  oneToOne: {
    title: "📞 1:1 Call",
    subtitle: "Complete mediasoup flow for two-person video call",
    events: oneToOneEvents,
    participants: {
      alice: { name: "Alice", emoji: "👩", color: "#ec4899", x: 100 },
      server: { name: "Server", emoji: "🖥️", color: "#a855f7", x: 350 },
      bob: { name: "Bob", emoji: "👨", color: "#3b82f6", x: 600 },
    }
  },
  oneToMany: {
    title: "👥 Group Call",
    subtitle: "Multi-participant call with screen sharing",
    events: oneToManyEvents,
    participants: {
      sarah: { name: "Sarah", emoji: "👑", color: "#f59e0b", x: 80 },
      john: { name: "John", emoji: "👨", color: "#3b82f6", x: 200 },
      emma: { name: "Emma", emoji: "👩", color: "#ec4899", x: 320 },
      server: { name: "Server", emoji: "🖥️", color: "#a855f7", x: 520 },
    }
  }
};

type TabType = keyof typeof tabConfig;

// ============================================
// MAIN COMPONENT
// ============================================

export default function RawMediasoupFlow() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('zoomCall');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const packetRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = tabConfig[activeTab];
  const events = config.events;
  const totalSteps = events.length;
  const currentEvent = events[currentStep];

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [activeTab]);

  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current.querySelector(`[data-step="${currentStep}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep]);

  const getX = useCallback((participant: string): number => {
    return config.participants[participant]?.x || 350;
  }, [config.participants]);

  const animatePacket = useCallback(() => {
    if (!packetRef.current) {
      setIsAnimating(false);
      return;
    }

    const event = events[currentStep];
    const packet = d3.select(packetRef.current);
    const y = 80 + currentStep * 56;
    
    const fromX = getX(event.from);
    const toX = getX(event.to);
    const isInternal = event.from === event.to;
    const fromP = config.participants[event.from];
    const color = fromP?.color || '#fff';

    setIsAnimating(true);

    packet.attr('fill', color);

    if (isInternal) {
      packet
        .attr('cx', fromX).attr('cy', y).attr('r', 6).attr('opacity', 0)
        .transition().duration(100).attr('opacity', 1)
        .transition().duration(200).attr('r', 16)
        .transition().duration(200).attr('r', 6)
        .transition().duration(100).attr('opacity', 0)
        .on('end', () => setIsAnimating(false));
    } else {
      packet
        .attr('cx', fromX).attr('cy', y).attr('r', 8).attr('opacity', 0)
        .transition().duration(80).attr('opacity', 1)
        .transition().duration(500).ease(d3.easeCubicInOut).attr('cx', toX)
        .transition().duration(80).attr('opacity', 0)
        .on('end', () => setIsAnimating(false));
    }
  }, [currentStep, events, getX, config.participants]);

  useEffect(() => {
    animatePacket();
  }, [currentStep, animatePacket]);

  useEffect(() => {
    if (!isPlaying || isAnimating) return;
    const timeout = setTimeout(() => {
      if (currentStep < totalSteps - 1) setCurrentStep(p => p + 1);
      else setIsPlaying(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [isPlaying, currentStep, totalSteps, isAnimating]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (!isAnimating) setCurrentStep(p => Math.min(p + 1, totalSteps - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (!isAnimating) setCurrentStep(p => Math.max(p - 1, 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [totalSteps, isAnimating]);

  const goToStep = (step: number) => {
    if (!isAnimating && step >= 0 && step < totalSteps) setCurrentStep(step);
  };

  const svgHeight = 80 + totalSteps * 56 + 40;
  const participants = Object.entries(config.participants);

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header className="flex-none border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-3">
          <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-sm font-medium">
            ← Back
          </button>
          <h1 className="text-xs tracking-widest text-white/50 font-semibold uppercase">Mediasoup Explained</h1>
          <span className="text-white/30 text-sm font-mono">{currentStep + 1}/{totalSteps}</span>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 px-6 pb-4">
          {(Object.keys(tabConfig) as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tabConfig[tab].title}
            </button>
          ))}
        </div>
      </header>

      {/* Subtitle */}
      <div className="flex-none text-center py-3 bg-white/5 border-b border-white/10">
        <p className="text-white/50 text-sm font-medium">{config.subtitle}</p>
      </div>

      {/* Current Event */}
      <div className="flex-none border-b border-white/10 px-6 py-5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-4xl mx-auto flex items-start gap-5">
          <span className="text-5xl flex-none">{currentEvent.emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{currentEvent.action}</h2>
            <p className="text-sm text-white/60 mt-1 leading-relaxed">{currentEvent.description}</p>
            {currentEvent.technical && (
              <code className="inline-block mt-3 px-3 py-1.5 bg-black border border-white/20 rounded text-xs text-emerald-400 font-mono">
                {currentEvent.technical}
              </code>
            )}
          </div>
        </div>
      </div>

      {/* Flow */}
      <div ref={containerRef} className="flex-1 overflow-auto">
        <div className="flex justify-center px-4 py-6">
          <svg viewBox={`0 0 700 ${svgHeight}`} className="w-full max-w-4xl" style={{ height: svgHeight }}>
            {/* Headers */}
            {participants.map(([key, p]) => (
              <g key={key}>
                <text x={p.x} y="28" textAnchor="middle" fontSize="24">{p.emoji}</text>
                <text x={p.x} y="52" textAnchor="middle" fill={p.color} fontSize="13" fontWeight="700" fontFamily="Inter, system-ui">
                  {p.name}
                </text>
                <line x1={p.x} y1="64" x2={p.x} y2={svgHeight - 20} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              </g>
            ))}

            {/* Events */}
            {events.map((event, index) => {
              const y = 80 + index * 56;
              const isActive = index === currentStep;
              const isPast = index < currentStep;
              const fromX = getX(event.from);
              const toX = getX(event.to);
              const isInternal = event.from === event.to;
              const fromP = config.participants[event.from];
              const color = fromP?.color || '#888';

              return (
                <g
                  key={event.id}
                  data-step={index}
                  className="cursor-pointer"
                  onClick={() => goToStep(index)}
                  opacity={isActive ? 1 : isPast ? 0.5 : 0.2}
                >
                  <circle cx={fromX} cy={y} r={isActive ? 6 : 4} fill={isActive ? color : 'rgba(255,255,255,0.3)'} />
                  
                  {!isInternal && (
                    <>
                      <circle cx={toX} cy={y} r={isActive ? 6 : 4} fill={isActive ? color : 'rgba(255,255,255,0.3)'} />
                      <defs>
                        <marker id={`arr-${activeTab}-${index}`} markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                          <polygon points="0 0, 6 2.5, 0 5" fill={isActive ? color : 'rgba(255,255,255,0.3)'} />
                        </marker>
                      </defs>
                      <line
                        x1={fromX + (fromX < toX ? 10 : -10)}
                        y1={y}
                        x2={toX + (fromX < toX ? -14 : 14)}
                        y2={y}
                        stroke={isActive ? color : 'rgba(255,255,255,0.2)'}
                        strokeWidth={isActive ? 2 : 1}
                        strokeDasharray={isActive ? "6 4" : "4 3"}
                        markerEnd={`url(#arr-${activeTab}-${index})`}
                      />
                    </>
                  )}

                  {isInternal && (
                    <path
                      d={`M ${fromX} ${y - 10} C ${fromX - 30} ${y - 10}, ${fromX - 30} ${y + 10}, ${fromX} ${y + 10}`}
                      fill="none"
                      stroke={isActive ? color : 'rgba(255,255,255,0.2)'}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray="4 3"
                    />
                  )}

                  <text
                    x={isInternal ? fromX + 12 : (fromX + toX) / 2}
                    y={y - 10}
                    textAnchor={isInternal ? 'start' : 'middle'}
                    fill={isActive ? '#fff' : 'rgba(255,255,255,0.4)'}
                    fontSize={isActive ? 12 : 10}
                    fontWeight={isActive ? 600 : 400}
                    fontFamily="Inter, system-ui"
                  >
                    {event.action}
                  </text>
                </g>
              );
            })}

            <circle ref={packetRef} r="8" fill="#fff" opacity="0" style={{ filter: 'drop-shadow(0 0 12px currentColor)' }} />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-none border-t border-white/10 px-6 py-3 bg-white/5">
        <div className="flex justify-center gap-8 flex-wrap">
          {participants.map(([, p]) => (
            <div key={p.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-white/60 font-medium">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex-none h-18 border-t border-white/10 flex items-center justify-center gap-3 py-4 bg-black">
        <button onClick={() => goToStep(0)} disabled={isAnimating || currentStep === 0}
          className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 disabled:opacity-20 transition-all">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <button onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0 || isAnimating}
          className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 disabled:opacity-20 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <button onClick={() => setIsPlaying(p => !p)}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-all font-bold">
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        
        <button onClick={() => goToStep(currentStep + 1)} disabled={currentStep === totalSteps - 1 || isAnimating}
          className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 disabled:opacity-20 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <button onClick={() => goToStep(totalSteps - 1)} disabled={isAnimating || currentStep === totalSteps - 1}
          className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 disabled:opacity-20 transition-all">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
