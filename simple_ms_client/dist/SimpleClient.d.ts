import { EventOrchestratorConfig } from "./EventOrchestrator";
export interface SimpleClientConfig {
    serverUrl: string;
    iceServers?: RTCIceServer[];
    enableAudio?: boolean;
    enableVideo?: boolean;
    autoConsume?: boolean;
    eventOrchestrator?: EventOrchestratorConfig;
}
export interface ParticipantInfo {
    id: string;
    name: string;
    isLocal?: boolean;
}
export interface StreamInfo {
    participantId: string;
    streamId: string;
    stream: MediaStream;
    type: "audio" | "video" | "screen";
}
export interface ConnectionInfo {
    conferenceId: string;
    participantId: string;
    participantName: string;
    isConnected: boolean;
}
export interface SimpleClientEvents {
    connected: {
        connection: ConnectionInfo;
    };
    disconnected: {
        reason?: string;
    };
    reconnecting: {};
    error: {
        error: Error;
        code?: string;
    };
    participantJoined: {
        participant: ParticipantInfo;
    };
    participantLeft: {
        participant: ParticipantInfo;
    };
    localStreamReady: {
        stream: MediaStream;
    };
    remoteStreamAdded: {
        stream: StreamInfo;
    };
    remoteStreamRemoved: {
        streamId: string;
        participantId: string;
    };
    audioMuted: {
        participantId: string;
        isLocal: boolean;
    };
    audioUnmuted: {
        participantId: string;
        isLocal: boolean;
    };
    videoMuted: {
        participantId: string;
        isLocal: boolean;
    };
    videoUnmuted: {
        participantId: string;
        isLocal: boolean;
    };
    screenShareStarted: {
        participantId: string;
        stream?: MediaStream;
    };
    screenShareStopped: {
        participantId: string;
    };
    connectionQualityChanged: {
        participantId: string;
        quality: "excellent" | "good" | "poor" | "disconnected";
    };
}
/**
 * SimpleClient - A high-level, easy-to-use WebRTC client abstraction
 *
 * Features:
 * - Simple setup with minimal configuration
 * - Event-driven architecture
 * - Automatic stream management
 * - Built-in error handling
 * - Screen sharing support
 */
export declare class SimpleClient extends EventTarget {
    private config;
    private socket?;
    private socketController?;
    private mediasoupClient?;
    private eventOrchestrator;
    private connectionInfo?;
    private participants;
    private remoteStreams;
    private localStream?;
    private isInitialized;
    constructor(config: SimpleClientConfig);
    /**
     * Initialize and connect to the conference
     */
    connect(conferenceId: string, participantName: string, participantId?: string): Promise<void>;
    /**
     * Enable local audio/video
     */
    enableMedia(audio?: boolean, video?: boolean): Promise<MediaStream | undefined>;
    /**
     * Mute/unmute local audio
     */
    toggleAudio(mute?: boolean): Promise<boolean>;
    /**
     * Mute/unmute local video
     */
    toggleVideo(mute?: boolean): Promise<boolean>;
    /**
     * Start screen sharing
     */
    startScreenShare(): Promise<MediaStream | undefined>;
    /**
     * Stop screen sharing
     */
    stopScreenShare(): void;
    /**
     * Get local media stream
     */
    getLocalStream(): MediaStream | undefined;
    /**
     * Get all remote streams
     */
    getRemoteStreams(): StreamInfo[];
    /**
     * Get participants list
     */
    getParticipants(): ParticipantInfo[];
    /**
     * Get connection info
     */
    getConnectionInfo(): ConnectionInfo | undefined;
    /**
     * Check if audio is muted
     */
    isAudioMuted(): boolean;
    /**
     * Check if video is muted
     */
    isVideoMuted(): boolean;
    /**
     * Disconnect from conference
     */
    disconnect(): Promise<void>;
    /**
     * Type-safe event emitter
     */
    private emit;
    /**
     * Type-safe event listener
     */
    on<K extends keyof SimpleClientEvents>(type: K, listener: (event: CustomEvent<SimpleClientEvents[K]>) => void): void;
    /**
     * Remove event listener
     */
    off<K extends keyof SimpleClientEvents>(type: K, listener: (event: CustomEvent<SimpleClientEvents[K]>) => void): void;
    /**
     * Get event orchestrator stats for debugging
     */
    getEventStats(): {
        activeListeners: number;
        eventHistorySize: number;
        eventsSinceStart: number;
        debugLogging: boolean;
    };
    /**
     * Get event history for debugging
     */
    getEventHistory(): import("./EventOrchestrator").EventLog[];
    /**
     * Enable/disable event debugging
     */
    setEventDebugMode(enabled: boolean, includeDetails?: boolean): void;
    private setupEventListeners;
    private consumeExistingStreams;
    private generateParticipantId;
}
