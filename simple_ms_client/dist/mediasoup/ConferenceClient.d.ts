import { Producer, Consumer } from "mediasoup-client/types";
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
 * Local stream types
 */
export type LocalStreamType = "audio" | "video" | "screenshare";
/**
 * Local stream information
 */
export interface LocalStreamInfo {
    id: string;
    type: LocalStreamType;
    track: MediaStreamTrack;
    producer: Producer;
    stream: MediaStream;
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
    localStreamAdded: {
        streamId: string;
        type: LocalStreamType;
        stream: MediaStream;
    };
    localStreamRemoved: {
        streamId: string;
        type: LocalStreamType;
    };
    localAudioToggled: {
        streamId: string;
        enabled: boolean;
    };
    localVideoToggled: {
        streamId: string;
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
 * 3. Get media tracks from navigator.mediaDevices.getUserMedia()
 * 4. Extract audio/video tracks and call produceMedia(audioTrack, videoTrack) to send media
 * 5. Listen to events for remote participants
 * 6. Use toggleAudio/toggleVideo for media controls
 * 7. Call leaveMeeting() when done
 *
 * Example:
 *   const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
 *   const audioTrack = mediaStream.getAudioTracks()[0];
 *   const videoTrack = mediaStream.getVideoTracks()[0];
 *   await client.produceMedia(audioTrack, videoTrack);
 */
export declare class ConferenceClient extends EventTarget {
    config: ConferenceClientConfig;
    private device;
    private sendTransport;
    private recvTransport;
    private socketController;
    private localStreams;
    private remoteParticipants;
    private isJoined;
    constructor(config: ConferenceClientConfig);
    /**
     * 1. Join the meeting
     * Loads device, creates transports, and joins the conference
     */
    joinMeeting(): Promise<void>;
    /**
     * 2. Produce media to the conference
     * Takes audio and/or video tracks and sends them to other participants
     * Returns stream IDs for tracking and toggling
     * @param audioTrack - Optional audio MediaStreamTrack to produce
     * @param videoTrack - Optional video MediaStreamTrack to produce
     * @param type - Type of stream: "audio", "video", or "screenshare"
     * @returns Object with streamIds for audio and video
     */
    produceMedia(audioTrack?: MediaStreamTrack, videoTrack?: MediaStreamTrack, type?: LocalStreamType): Promise<{
        audioStreamId?: string;
        videoStreamId?: string;
    }>;
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
     * Stops the audio track when muting (turns off microphone)
     * Gets a new track when unmuting
     * @param streamId - ID of the audio stream to toggle, or first audio stream if not provided
     * @param mute - Explicit mute state (true = mute, false = unmute)
     */
    toggleAudio(streamId?: string, mute?: boolean): Promise<boolean>;
    /**
     * 5b. Toggle local video on/off
     * Stops the video track when muting (turns off camera)
     * Gets a new track when unmuting
     * @param streamId - ID of the video stream to toggle, or first video stream if not provided
     * @param mute - Explicit mute state (true = mute, false = unmute)
     */
    toggleVideo(streamId?: string, mute?: boolean): Promise<boolean>;
    /**
     * 5c. Stop a specific local stream
     * Useful for stopping screen share or individual streams
     * @param streamId - ID of the stream to stop
     */
    stopLocalStream(streamId: string): Promise<boolean>;
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
     * Get all local streams
     */
    getLocalStreams(): LocalStreamInfo[];
    /**
     * Get a specific local stream by ID
     */
    getLocalStream(streamId: string): MediaStream | null;
    /**
     * Get local streams by type
     */
    getLocalStreamsByType(type: LocalStreamType): LocalStreamInfo[];
}
