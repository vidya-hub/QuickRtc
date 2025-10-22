import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import type { WorkerSettings } from "mediasoup/types";
export interface SimpleServerConfig {
    httpServer?: HttpServer | HttpsServer;
    socketServer?: Server;
    port?: number;
    host?: string;
    cors?: {
        origin: string | string[];
        credentials?: boolean;
    };
    mediasoup?: {
        workerSettings?: WorkerSettings;
        routerOptions?: any;
        transportOptions?: any;
    };
}
export interface ConferenceInfo {
    id: string;
    name?: string;
    participantCount: number;
    createdAt: Date;
}
export interface ParticipantInfo {
    id: string;
    name: string;
    conferenceId: string;
    socketId: string;
    joinedAt: Date;
    mediaState: {
        audioEnabled: boolean;
        videoEnabled: boolean;
        audioProducerIds: string[];
        videoProducerIds: string[];
    };
}
export interface SimpleServerEvents {
    serverStarted: {
        port: number;
        host: string;
    };
    serverError: {
        error: Error;
    };
    clientConnected: {
        socketId: string;
    };
    clientDisconnected: {
        socketId: string;
    };
    conferenceCreated: {
        conference: ConferenceInfo;
    };
    conferenceDestroyed: {
        conferenceId: string;
    };
    participantJoined: {
        participant: ParticipantInfo;
    };
    participantLeft: {
        participant: ParticipantInfo;
    };
    producerCreated: {
        participantId: string;
        producerId: string;
        kind: "audio" | "video";
    };
    producerClosed: {
        participantId: string;
        producerId: string;
    };
    consumerCreated: {
        participantId: string;
        consumerId: string;
        producerId: string;
    };
    consumerClosed: {
        participantId: string;
        consumerId: string;
    };
    audioMuted: {
        participantId: string;
        conferenceId: string;
    };
    audioUnmuted: {
        participantId: string;
        conferenceId: string;
    };
    videoMuted: {
        participantId: string;
        conferenceId: string;
    };
    videoUnmuted: {
        participantId: string;
        conferenceId: string;
    };
}
/**
 * SimpleServer - A high-level, easy-to-use MediaSoup server abstraction
 *
 * Features:
 * - Simple setup with minimal configuration
 * - Event-driven architecture
 * - Automatic conference management
 * - Built-in error handling
 * - Real-time participant tracking
 */
export declare class SimpleServer extends EventTarget {
    private config;
    private httpServer?;
    private io?;
    private workerService?;
    private mediasoupController?;
    private socketController?;
    private conferences;
    private participants;
    private isStarted;
    private isExternalServer;
    constructor(config?: SimpleServerConfig);
    /**
     * Start the server with external HTTP server injection
     * @param externalHttpServer - Optional external HTTP/HTTPS server to use
     * @param externalSocketServer - Optional external Socket.IO server to use
     */
    start(externalHttpServer?: HttpServer | HttpsServer, externalSocketServer?: Server): Promise<void>;
    /**
     * Stop the server
     * Note: If using external HTTP server, you need to manage its lifecycle separately
     */
    stop(): Promise<void>;
    /**
     * Get all active conferences
     */
    getConferences(): ConferenceInfo[];
    /**
     * Get conference by ID
     */
    getConference(conferenceId: string): ConferenceInfo | undefined;
    /**
     * Get all participants
     */
    getParticipants(): ParticipantInfo[];
    /**
     * Get participants in a specific conference
     */
    getConferenceParticipants(conferenceId: string): ParticipantInfo[];
    /**
     * Get participant by ID
     */
    getParticipant(participantId: string): ParticipantInfo | undefined;
    /**
     * Kick a participant from conference
     */
    kickParticipant(participantId: string, reason?: string): Promise<void>;
    /**
     * Close a conference (kick all participants)
     */
    closeConference(conferenceId: string, reason?: string): Promise<void>;
    /**
     * Broadcast message to all participants in a conference
     */
    broadcastToConference(conferenceId: string, event: string, data: any): void;
    /**
     * Send message to specific participant
     */
    sendToParticipant(participantId: string, event: string, data: any): void;
    /**
     * Get the Socket.IO server instance
     */
    getSocketServer(): Server | undefined;
    /**
     * Get the HTTP server instance
     */
    getHttpServer(): HttpServer | HttpsServer | undefined;
    /**
     * Get server statistics
     */
    getStats(): {
        uptime: number;
        conferenceCount: number;
        participantCount: number;
        totalConnections: number;
    };
    /**
     * Type-safe event emitter
     */
    private emit;
    /**
     * Type-safe event listener
     */
    on<K extends keyof SimpleServerEvents>(type: K, listener: (event: CustomEvent<SimpleServerEvents[K]>) => void): void;
    /**
     * Remove event listener
     */
    off<K extends keyof SimpleServerEvents>(type: K, listener: (event: CustomEvent<SimpleServerEvents[K]>) => void): void;
    private initializeMediaSoup;
    private setupEventHandlers;
}
//# sourceMappingURL=SimpleServer.d.ts.map