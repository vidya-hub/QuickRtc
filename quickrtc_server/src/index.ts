// Simple, easy-to-use server (RECOMMENDED)
export {
  QuickRTCServer,
  type QuickRTCServerConfig,
  type QuickRTCServerEvents,
  type ConferenceInfo,
  type ParticipantInfo,
} from "./QuickRTCServer";

// Default mediasoup configuration
export {
  defaultMediasoupConfig,
  mergeMediasoupConfig,
  type QuickRTCMediasoupConfig,
  type ListenIpConfig,
  type TransportOptions,
  type WebRtcServerOptions,
} from "./config/defaultMediasoupConfig";

// Advanced exports (for custom implementations)
export * from "./mediasoup/MediaSoupServer";
export * from "./workers/WorkerService";
export * from "./controllers/MediasoupController";
export * from "./controllers/SocketController";
export * from "./models/conference";
export * from "./models/participant";
