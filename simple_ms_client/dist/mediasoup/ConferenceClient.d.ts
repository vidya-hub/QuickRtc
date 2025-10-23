import { Device } from "mediasoup-client";
import { SocketClientController } from "../controller/SocketClientController";
import type { Consumer, MediaKind } from "mediasoup-client/types";
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
    participantStreamsReady: {
        participantId: string;
        participantName: string;
        streams: RemoteStreamData[];
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
    participantId: string;
    participantName: string;
    isLocal: boolean;
    audioMuted: boolean;
    videoMuted: boolean;
}
export interface ParticipantTrackInfo {
    participantId: string;
    participantName: string;
    tracks: {
        producerId: string;
        kind: MediaKind;
        enabled: boolean;
    }[];
}
export interface RemoteStreamData {
    participantId: string;
    participantName: string;
    stream: MediaStream;
    tracks: {
        producerId: string;
        consumerId: string;
        kind: MediaKind;
        track: MediaStreamTrack;
    }[];
}
/**
 * ConferenceClient - Stateless MediaSoup client with server-side state management
 *
 * This is a lightweight client that:
 * - Only holds current participant info
 * - Emits all operations to server
 * - Creates tracks on-demand when user wants to consume
 * - Handles all calls efficiently without local state storage
 */
export declare class ConferenceClient extends EventTarget {
    private config;
    private socketController;
    private device;
    private sendTransport?;
    private recvTransport?;
    private currentParticipant;
    private isJoined;
    private logger;
    private remoteStreams;
    private consumers;
    constructor(config: ConferenceClientConfig);
    /**
     * Setup all socket event listeners - stateless event forwarding
     */
    private setupSocketEventListeners;
    /**
     * Join the conference - stateless setup
     */
    joinConference(): Promise<void>;
    /**
     * Setup transport event listeners - stateless
     */
    private setupTransportListeners;
    /**
     * Create consumer on demand when new producer is available
     */
    private createConsumerOnDemand;
    /**
     * Enable local media (audio/video) - stateless version
     */
    enableMedia(audio?: boolean, video?: boolean): Promise<MediaStream | undefined>;
    /**
     * SIMPLIFIED: Consume media from a specific participant
     * Just send participant ID → Get consumer parameters → Create tracks on demand
     *
     * @param participantId - The participant whose media you want to consume
     * @returns Consumer parameters that can be used to create tracks
     *
     * @example
     * ```typescript
     * // Simple workflow - just get consumer params and create tracks
     * const consumerParams = await conferenceClient.consumeParticipantMedia('participant-123');
     *
     * // Create tracks from consumer parameters
     * for (const params of consumerParams) {
     *   const consumer = await consumerTransport.consume(params);
     *   const { track } = consumer;
     *
     *   // Listen for track events
     *   track.addEventListener("ended", () => console.log("Track ended"));
     *   track.onmute = () => console.log("Track muted");
     *   track.onunmute = () => console.log("Track unmuted");
     *
     *   // Add to video element
     *   const remoteVideo = document.getElementById(`video-${participantId}`);
     *   remoteVideo.srcObject = new MediaStream([track]);
     *
     *   // Unpause the consumer
     *   await conferenceClient.unpauseConsumer(consumer.id);
     * }
     * ```
     */
    consumeParticipantMedia(participantId: string): Promise<any[]>;
    /**
     * Unpause a consumer after creating it
     */
    unpauseConsumer(consumerId: string): Promise<void>;
    /**
     * Consume a specific producer - stateless version (delegates to createConsumerOnDemand)
     */
    consumeProducer(producerId: string, participantInfo?: {
        participantId: string;
        participantName: string;
    }): Promise<Consumer | undefined>;
    /**
     * Mute/unmute local audio - stateless version (delegates to server)
     */
    toggleAudio(mute?: boolean): Promise<boolean>;
    /**
     * Mute/unmute local video - stateless version (delegates to server)
     */
    toggleVideo(mute?: boolean): Promise<boolean>;
    /**
     * Leave the conference - stateless version
     */
    leaveConference(): Promise<void>;
    private emit;
    /**
     * Check if all expected streams for a participant are ready and emit event
     */
    private checkAndEmitParticipantStreamsReady;
    getParticipants(): Promise<ParticipantInfo[]>;
    getProducersWithParticipantId(participantId: string): Promise<any>;
    getCurrentParticipant(): ParticipantInfo;
    isAudioMuted(): boolean;
    isVideoMuted(): boolean;
    isJoinedToConference(): boolean;
    getDevice(): Device;
    getSocketController(): SocketClientController;
    /**
     * Get all remote streams currently available
     */
    getRemoteStreams(): RemoteStreamData[];
    /**
     * Get remote stream for specific participant
     */
    getRemoteStreamForParticipant(participantId: string): MediaStream | undefined;
    /**
     * Start screen sharing - stateless version
     */
    startScreenShare(): Promise<MediaStream | undefined>;
}
export default ConferenceClient;
