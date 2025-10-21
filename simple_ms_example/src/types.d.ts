// declare module "simple_ms_server" {
//   import { Server as HttpServer } from "http";
//   import { Server as HttpsServer } from "https";
//   import { Server as SocketIOServer } from "socket.io";

//   export interface SimpleServerConfig {
//     httpServer?: HttpServer | HttpsServer;
//     socketServer?: SocketIOServer;
//     port?: number;
//     host?: string;
//     cors?: {
//       origin: string | string[];
//       credentials?: boolean;
//     };
//     mediasoup?: {
//       workerSettings?: any;
//       routerOptions?: any;
//       transportOptions?: any;
//     };
//   }

//   export interface ConferenceInfo {
//     id: string;
//     name?: string;
//     participantCount: number;
//     createdAt: Date;
//   }

//   export interface ParticipantInfo {
//     id: string;
//     name: string;
//     conferenceId: string;
//     socketId: string;
//     joinedAt: Date;
//     mediaState: {
//       audioEnabled: boolean;
//       videoEnabled: boolean;
//       audioProducerIds: string[];
//       videoProducerIds: string[];
//     };
//   }

//   export interface SimpleServerEvents {
//     serverStarted: { port: number; host: string };
//     serverError: { error: Error };
//     clientConnected: { socketId: string };
//     clientDisconnected: { socketId: string };
//     conferenceCreated: { conference: ConferenceInfo };
//     conferenceDestroyed: { conferenceId: string };
//     participantJoined: { participant: ParticipantInfo };
//     participantLeft: { participant: ParticipantInfo };
//     producerCreated: {
//       participantId: string;
//       producerId: string;
//       kind: "audio" | "video";
//     };
//     producerClosed: { participantId: string; producerId: string };
//     consumerCreated: {
//       participantId: string;
//       consumerId: string;
//       producerId: string;
//     };
//     consumerClosed: { participantId: string; consumerId: string };
//     audioMuted: { participantId: string; conferenceId: string };
//     audioUnmuted: { participantId: string; conferenceId: string };
//     videoMuted: { participantId: string; conferenceId: string };
//     videoUnmuted: { participantId: string; conferenceId: string };
//   }

//   export class SimpleServer extends EventTarget {
//     constructor(config?: SimpleServerConfig);
//     start(
//       httpServer?: HttpServer | HttpsServer,
//       socketServer?: SocketIOServer
//     ): Promise<void>;
//     stop(): Promise<void>;
//     getConferences(): ConferenceInfo[];
//     getConference(conferenceId: string): ConferenceInfo | undefined;
//     getParticipants(): ParticipantInfo[];
//     getConferenceParticipants(conferenceId: string): ParticipantInfo[];
//     getParticipant(participantId: string): ParticipantInfo | undefined;
//     kickParticipant(participantId: string, reason?: string): Promise<void>;
//     closeConference(conferenceId: string, reason?: string): Promise<void>;
//     broadcastToConference(conferenceId: string, event: string, data: any): void;
//     sendToParticipant(participantId: string, event: string, data: any): void;
//     getSocketServer(): SocketIOServer | undefined;
//     getHttpServer(): HttpServer | HttpsServer | undefined;
//     getStats(): {
//       uptime: number;
//       conferenceCount: number;
//       participantCount: number;
//       totalConnections: number;
//     };

//     on<K extends keyof SimpleServerEvents>(
//       type: K,
//       listener: (event: CustomEvent<SimpleServerEvents[K]>) => void
//     ): void;
//     off<K extends keyof SimpleServerEvents>(
//       type: K,
//       listener: (event: CustomEvent<SimpleServerEvents[K]>) => void
//     ): void;
//   }
// }
