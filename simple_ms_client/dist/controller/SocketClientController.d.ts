import { ClientSocket, CreateTransportResponse, ConsumerParams, ParticipantInfo } from "@simple-mediasoup/types";
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
    joinConference(): Promise<RtpCapabilities | undefined>;
    createTransports(): Promise<{
        sendTransport: CreateTransportResponse;
        recvTransport: CreateTransportResponse;
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
        recvTransport: Transport<AppData>;
        onConsume: (params: {
            producerId: string;
            id: string;
            kind: "audio" | "video";
            rtpParameters: any;
            appData: AppData;
        }) => void;
    }): Promise<void>;
    consumeMedia(producerId: string, rtpCapabilities: RtpCapabilities): Promise<ConsumerParams | undefined>;
    /**
     * SIMPLIFIED: Consume media by participant ID
     * Send participant ID + RTP capabilities → Get consumer parameters
     * Client can then create tracks directly with the consumer parameters
     */
    consumeParticipantMedia(targetParticipantId: string, rtpCapabilities: RtpCapabilities): Promise<ConsumerParams[] | undefined>;
    /**
     * Unpause consumer
     */
    unpauseConsumer(consumerId: string): Promise<void>;
    closeProducer(producerId: string): Promise<void>;
    closeConsumer(consumerId: string): Promise<void>;
    leaveConference(): Promise<void>;
    getParticipants(): Promise<ParticipantInfo[] | undefined>;
    setupEventListeners(): void;
}
