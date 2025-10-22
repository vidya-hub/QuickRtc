import { Device } from "mediasoup-client";
import { SocketClientController } from "../controller/SocketClientController";
import type { Producer, Consumer, MediaKind } from "mediasoup-client/types";
import { ClientSocket } from "@simple-mediasoup/types";
import { WebRtcTransportOptions } from "mediasoup/types";
export interface ConferenceClientEvents {
    joined: {
        participantId: string;
        conferenceId: string;
    };
    left: {
        reason?: string;
    };
    error: {
        error: Error;
        context: string;
    };
    reconnecting: {};
    reconnected: {};
    participantJoined: {
        participantId: string;
        participantName: string;
    };
    participantLeft: {
        participantId: string;
        participantName: string;
    };
    localStreamReady: {
        stream: MediaStream;
        participantId: string;
    };
    remoteStreamAdded: {
        stream: MediaStream;
        participantId: string;
        consumerId: string;
        producerId: string;
        kind: MediaKind;
    };
    remoteStreamRemoved: {
        participantId: string;
        consumerId: string;
        producerId: string;
    };
    producerCreated: {
        producerId: string;
        kind: MediaKind;
        participantId: string;
    };
    producerClosed: {
        producerId: string;
        kind: MediaKind;
        participantId: string;
    };
    consumerCreated: {
        consumerId: string;
        producerId: string;
        kind: MediaKind;
        participantId: string;
    };
    consumerClosed: {
        consumerId: string;
        producerId: string;
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
    transportConnected: {
        transportId: string;
        direction: "send" | "recv";
    };
    transportClosed: {
        transportId: string;
        direction: "send" | "recv";
    };
    transportFailed: {
        transportId: string;
        direction: "send" | "recv";
        error: Error;
    };
}
export interface ConferenceClientConfig {
    conferenceId: string;
    participantId: string;
    participantName: string;
    socket: ClientSocket;
    conferenceName?: string;
    webRtcTransportOptions?: WebRtcTransportOptions;
    enableAudio?: boolean;
    enableVideo?: boolean;
    iceServers?: RTCIceServer[];
    videoConstraints?: MediaTrackConstraints;
    audioConstraints?: MediaTrackConstraints;
}
export interface ParticipantInfo {
    id: string;
    name: string;
    isLocal: boolean;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
    audioMuted: boolean;
    videoMuted: boolean;
}
export interface MediaState {
    audioProducerId?: string;
    videoProducerId?: string;
    audioMuted: boolean;
    videoMuted: boolean;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
}
/**
 * ConferenceClient - Comprehensive MediaSoup client with full event orchestration
 *
 * This is the main client that handles all MediaSoup operations:
 * - Device management
 * - Transport creation and management
 * - Producer/Consumer lifecycle
 * - Media stream handling
 * - Participant management
 * - Complete event system with proper logging
 */
export declare class ConferenceClient extends EventTarget {
    private config;
    private socketController;
    private device;
    private sendTransport?;
    private recvTransport?;
    private mediaState;
    private participants;
    private localStream?;
    private remoteStreams;
    private isJoined;
    private logger;
    constructor(config: ConferenceClientConfig);
    /**
     * Setup all socket event listeners with proper logging
     */
    private setupSocketEventListeners;
    /**
     * Join the conference
     */
    joinConference(): Promise<void>;
    /**
     * Setup transport event listeners
     */
    private setupTransportListeners;
    /**
     * Enable local media (audio/video)
     */
    enableMedia(audio?: boolean, video?: boolean): Promise<MediaStream | undefined>;
    /**
     * Consume existing producers (for participants already in the conference)
     */
    consumeExistingProducers(): Promise<void>;
    /**
     * Consume a specific producer
     */
    consumeProducer(producerId: string): Promise<void>;
    /**
     * Mute/unmute local audio
     */
    toggleAudio(mute?: boolean): Promise<boolean>;
    /**
     * Mute/unmute local video
     */
    toggleVideo(mute?: boolean): Promise<boolean>;
    /**
     * Leave the conference
     */
    leaveConference(): Promise<void>;
    private handleParticipantJoined;
    private handleParticipantLeft;
    private handleNewProducer;
    private handleProducerClosed;
    private handleConsumerClosed;
    private handleConsumerCreated;
    private handleAudioMuted;
    private handleAudioUnmuted;
    private handleVideoMuted;
    private handleVideoUnmuted;
    private emit;
    getLocalStream(): MediaStream | undefined;
    getRemoteStreams(): Map<string, MediaStream>;
    getParticipants(): ParticipantInfo[];
    getMediaState(): MediaState;
    isAudioMuted(): boolean;
    isVideoMuted(): boolean;
    isJoinedToConference(): boolean;
    getDevice(): Device;
    getSocketController(): SocketClientController;
    /**
     * Start screen sharing
     */
    startScreenShare(): Promise<MediaStream | undefined>;
}
export default ConferenceClient;
