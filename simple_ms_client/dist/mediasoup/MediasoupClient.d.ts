import { SocketClientController } from "../controller/SocketClientController";
import type { Producer, Consumer } from "mediasoup-client/types";
export interface MediasoupClientConfig {
    iceServers?: RTCIceServer[];
    enableAudio?: boolean;
    enableVideo?: boolean;
    videoConstraints?: MediaTrackConstraints;
    audioConstraints?: MediaTrackConstraints;
}
export interface MediaState {
    audioMuted: boolean;
    videoMuted: boolean;
    audioProducerId?: string;
    videoProducerId?: string;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
}
declare class MediasoupClient extends EventTarget {
    private device;
    private socketClient;
    private sendTransport?;
    private recvTransport?;
    private config;
    private mediaState;
    private localStream?;
    private remoteStreams;
    constructor(socketClient: SocketClientController, config?: MediasoupClientConfig);
    private setupSocketEventListeners;
    joinConference(): Promise<void>;
    enableMedia(audio?: boolean, video?: boolean): Promise<void>;
    muteAudio(): Promise<void>;
    unmuteAudio(): Promise<void>;
    muteVideo(): Promise<void>;
    unmuteVideo(): Promise<void>;
    consumeMedia(producerId: string): Promise<void>;
    getLocalStream(): MediaStream | undefined;
    getRemoteStreams(): Map<string, MediaStream>;
    getMediaState(): MediaState;
    isAudioMuted(): boolean;
    isVideoMuted(): boolean;
    private handleProducerCreated;
    private handleConsumerCreated;
    private handleParticipantLeft;
    private handleProducerClosed;
    private handleConsumerClosed;
    private handleAudioMuted;
    private handleAudioUnmuted;
    private handleVideoMuted;
    private handleVideoUnmuted;
    leaveConference(): Promise<void>;
}
export default MediasoupClient;
