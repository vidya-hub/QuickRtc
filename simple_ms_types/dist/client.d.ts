/**
 * Client-specific types and interfaces
 */
/**
 * Client connection state
 */
export declare enum ClientConnectionState {
    DISCONNECTED = "disconnected",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    RECONNECTING = "reconnecting",
    ERROR = "error"
}
/**
 * Client configuration options
 */
export interface ClientConfig {
    serverUrl: string;
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    timeout?: number;
}
/**
 * Client event types
 */
export type ClientEventType = "connected" | "disconnected" | "error" | "reconnecting" | "conferenceJoined" | "participantJoined" | "participantLeft" | "mediaProduced" | "mediaConsumed";
/**
 * Client media constraints
 */
export interface MediaConstraints {
    video?: boolean | MediaTrackConstraints;
    audio?: boolean | MediaTrackConstraints;
}
/**
 * Client media stream info
 */
export interface MediaStreamInfo {
    id: string;
    kind: "audio" | "video";
    enabled: boolean;
    muted?: boolean;
    participantId: string;
}
/**
 * Client participant info (simplified for client use)
 */
export interface ClientParticipant {
    id: string;
    name: string;
    isLocal: boolean;
    mediaStreams: MediaStreamInfo[];
}
/**
 * Enhanced participant track information for remote streams
 */
export interface ParticipantTrackInfo {
    participantId: string;
    participantName: string;
    tracks: {
        producerId: string;
        kind: "audio" | "video";
        enabled: boolean;
    }[];
}
/**
 * Complete remote stream data with participant and track details
 */
export interface RemoteStreamData {
    participantId: string;
    participantName: string;
    stream: MediaStream;
    tracks: {
        producerId: string;
        consumerId: string;
        kind: "audio" | "video";
        track: MediaStreamTrack;
    }[];
}
//# sourceMappingURL=client.d.ts.map