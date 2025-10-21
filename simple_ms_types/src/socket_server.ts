import type { Socket } from "socket.io";

/**
 * Socket event types supported by the application
 */
export type SocketEventType =
  | "getRtpCapabilities"
  | "joinConference"
  | "createTransport"
  | "connectTransport"
  | "produce"
  | "consume"
  | "resumeConsumer"
  | "pauseProducer"
  | "resumeProducer"
  | "pauseConsumer"
  | "closeProducer"
  | "closeConsumer"
  | "muteAudio"
  | "unmuteAudio"
  | "muteVideo"
  | "unmuteVideo"
  | "getMediaStates"
  | "leaveConference"
  | "getProducers";

/**
 * Base meeting parameters used in socket events
 */
export type MeetingParams = {
  conferenceId: string;
  participantId: string;
  extraData?: Record<string, any>;
};

/**
 * Socket event data structure
 */
export type SocketEventData = {
  eventType: SocketEventType;
  data: MeetingParams;
  callback: (response: {
    status: "ok" | "error";
    data?: any;
    error?: string;
  }) => void;
  errorback: (error: any) => void;
};

/**
 * Standard socket response structure
 */
export type SocketResponse<T = any> = {
  status: "ok" | "error";
  data?: T;
  error?: string;
};

/**
 * Socket event handlers type
 */
export type SocketEventHandlers = {
  [K in SocketEventType]: (eventData: SocketEventData) => Promise<void> | void;
};
