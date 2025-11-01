import type { Socket } from "socket.io";

/**
 * Socket event types supported by the application
 */
export type SocketEventType =
  | "joinConference"
  | "createTransport"
  | "connectTransport"
  | "produce"
  | "consume"
  | "pauseProducer"
  | "resumeProducer"
  | "closeProducer"
  | "closeConsumer"
  | "leaveConference"
  | "consumeParticipantMedia"
  | "unpauseConsumer"
  | "getParticipants";

/**
 * Base meeting parameters used in socket events
 */
export type MeetingParams = {
  conferenceId: string;
  participantId: string;
  socketId?: string;
};

/**
 * Socket event data structure
 */
export type SocketEventData = {
  eventType: SocketEventType;
  data: MeetingParams | any;
};

/**
 * Socket event handlers type
 */
export type SocketEventHandlers = {
  [K in SocketEventType]: (eventData: SocketEventData) => Promise<void> | void;
};
