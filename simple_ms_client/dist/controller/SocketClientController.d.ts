import { ClientSocket } from "@simple-mediasoup/types";
import { AppData, Transport, RtpCapabilities } from "mediasoup-client/types";
import { WebRtcTransportOptions } from "mediasoup/types";
export type JoinParams = {
    conferenceId: string;
    participantName: string;
    participantId: string;
    conferenceName?: string;
    socketId: string;
    webRtcTransportOptions?: WebRtcTransportOptions;
};
export type JoinResponse = {
    participantId: string;
};
export declare class SocketClientController extends EventTarget {
    private socket;
    private joinParams;
    constructor(socket: ClientSocket, joinParams: JoinParams);
    joinConference(): Promise<any>;
    createTransports(): Promise<{
        sendTransport: any;
        recvTransport: any;
    } | undefined>;
    addSendTransportListener({ sendTransport, onProduce, }: {
        sendTransport: Transport<AppData>;
        onProduce: (params: {
            kind: "audio" | "video";
            rtpParameters: any;
            appData: AppData;
            producerId: string;
        }) => void;
    }): void;
    addConsumeTransportListener({ recvTransport, onConsume, }: {
        recvTransport: any;
        onConsume: (params: {
            producerId: string;
            id: string;
            kind: "audio" | "video";
            rtpParameters: any;
            appData: AppData;
        }) => void;
    }): Promise<void>;
    consumeMedia(producerId: string, rtpCapabilities: RtpCapabilities): Promise<any>;
    getProducers(): Promise<string[] | undefined>;
    resumeProducer(producerId: string): Promise<void>;
    pauseProducer(producerId: string): Promise<void>;
    pauseConsumer(consumerId: string): Promise<void>;
    resumeConsumer(consumerId: string): Promise<void>;
    closeProducer(producerId: string): Promise<void>;
    closeConsumer(consumerId: string): Promise<void>;
    muteAudio(): Promise<any>;
    unmuteAudio(): Promise<any>;
    muteVideo(): Promise<any>;
    unmuteVideo(): Promise<any>;
    getMediaStates(): Promise<any>;
    leaveConference(): Promise<void>;
    setupEventListeners(): void;
}
