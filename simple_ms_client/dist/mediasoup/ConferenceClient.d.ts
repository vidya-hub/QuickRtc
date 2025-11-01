import { Consumer } from "mediasoup-client/types";
import { ClientSocket } from "@simple-mediasoup/types";
/**
 * Configuration for ConferenceClient
 */
export interface ConferenceClientConfig {
    conferenceId: string;
    conferenceName?: string;
    participantId: string;
    participantName: string;
    socket: ClientSocket;
}
/**
 * Remote participant information
 */
export interface RemoteParticipant {
    participantId: string;
    participantName: string;
    videoStream?: MediaStream;
    audioStream?: MediaStream;
    videoConsumer?: Consumer;
    audioConsumer?: Consumer;
}
/**
 * Events emitted by ConferenceClient
 */
export interface ConferenceClientEvents {
    participantJoined: {
        participantId: string;
        participantName: string;
    };
    participantLeft: {
        participantId: string;
    };
    remoteStreamAdded: {
        participantId: string;
        kind: "audio" | "video";
        stream: MediaStream;
    };
    remoteStreamRemoved: {
        participantId: string;
        kind: "audio" | "video";
    };
    localAudioToggled: {
        enabled: boolean;
    };
    localVideoToggled: {
        enabled: boolean;
    };
    remoteAudioToggled: {
        participantId: string;
        enabled: boolean;
    };
    remoteVideoToggled: {
        participantId: string;
        enabled: boolean;
    };
    error: {
        message: string;
        error?: any;
    };
}
/**
 * Simplified MediaSoup Conference Client
 *
 * Usage:
 * 1. Create client with config
 * 2. Call joinMeeting()
 * 3. Call enableMedia(audio, video)
 * 4. Listen to events for remote participants
 * 5. Use toggleAudio/toggleVideo for media controls
 * 6. Call leaveMeeting() when done
 */
export declare class ConferenceClient extends EventTarget {
    config: ConferenceClientConfig;
    private device;
    private sendTransport;
    private recvTransport;
    private socketController;
    private localStream;
    private audioProducer;
    private videoProducer;
    private remoteParticipants;
    private isJoined;
    private isMediaEnabled;
    constructor(config: ConferenceClientConfig);
    /**
     * 1. Join the meeting
     * Loads device, creates transports, and joins the conference
     */
    joinMeeting(): Promise<void>;
    /**
     * 2. Enable local media (audio/video)
     * Gets user media and creates producers
     */
    enableMedia(audio?: boolean, video?: boolean): Promise<MediaStream>;
    /**
     * 3. Consume existing participants' streams
     * Fetches and consumes media from all participants already in the conference
     */
    consumeExistingStreams(): Promise<void>;
    /**
     * Helper method to consume a specific participant's media
     */
    private consumeParticipantMedia;
    /**
     * 4. Stop watching a specific participant's stream
     * Closes consumers and removes streams for a participant
     */
    stopWatchingStream(participantId: string): Promise<void>;
    /**
     * 5a. Toggle local audio on/off
     */
    toggleAudio(mute?: boolean): Promise<boolean>;
    /**
     * 5b. Toggle local video on/off
     */
    toggleVideo(mute?: boolean): Promise<boolean>;
    /**
     * 6. Leave the meeting
     * Cleans up all resources and disconnects
     */
    leaveMeeting(): Promise<void>;
    /**
     * 7. Setup event listeners for socket events
     * Handles participant joined/left and media state changes
     */
    private setupSocketEventListeners;
    /**
     * Get list of all participants in the conference
     */
    getParticipants(): Promise<any[]>;
    /**
     * Get remote participant by ID
     */
    getRemoteParticipant(participantId: string): RemoteParticipant | undefined;
    /**
     * Get all remote participants
     */
    getAllRemoteParticipants(): RemoteParticipant[];
    /**
     * Check if currently in a meeting
     */
    isInMeeting(): boolean;
    /**
     * Check if local media is enabled
     */
    isLocalMediaEnabled(): boolean;
    /**
     * Get local media stream
     */
    getLocalStream(): MediaStream | null;
}
