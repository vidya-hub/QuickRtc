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
  | "resumeConsumer"
  | "leaveConference";

/**
 * Base meeting parameters used in socket events
 */
export type MeetingParams = {
  conferenceId: string;
  participantId: string;
  socket: Socket;
  extraData?: Record<string, any>;
};

/**
 * Socket event data structure
 */
export type SocketEventData = {
  eventType: SocketEventType;
  data: MeetingParams;
  callback: (response: any) => void;
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
