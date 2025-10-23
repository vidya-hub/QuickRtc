// Main client entry point - exports all client-side components

// Primary MediaSoup Client (RECOMMENDED)
export { default as ConferenceClient } from "./mediasoup/ConferenceClient";
export type {
  ConferenceClientConfig,
  ConferenceClientEvents,
  ParticipantInfo,
} from "./mediasoup/ConferenceClient";

// Event orchestrator for advanced usage
export { default as EventOrchestrator } from "./EventOrchestrator";
export type {
  EventOrchestratorConfig,
  EventLog,
  EventSource,
  OrchestratedEvent,
} from "./EventOrchestrator";

// Advanced controllers (for custom implementations)
export { SocketClientController } from "./controller/SocketClientController";
export type {
  JoinParams,
  JoinResponse,
} from "./controller/SocketClientController";

// Mediasoup clients (for advanced usage)
export { default as MediasoupClient } from "./mediasoup/MediasoupClient";
export type { MediasoupClientConfig } from "./mediasoup/MediasoupClient";

// Re-export commonly used types from dependencies
export type {
  Transport,
  Producer,
  Consumer,
  RtpCapabilities,
  DtlsParameters,
  AppData,
} from "mediasoup-client/types";

export type { WebRtcTransportOptions } from "mediasoup/types";

export type { ClientSocket, ConsumeParams } from "@simple-mediasoup/types";
