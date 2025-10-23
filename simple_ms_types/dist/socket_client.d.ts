import { Socket } from "socket.io-client";
import { CreateTransportParams } from "./transport";
export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export interface ServerToClientEvents {
    connect: () => void;
    disconnect: (reason: string) => void;
    participantJoined: (data: any) => void;
    participantLeft: (data: any) => void;
    producerClosed: (data: any) => void;
    consumerClosed: (data: any) => void;
    audioMuted: (data: any) => void;
    audioUnmuted: (data: any) => void;
    videoMuted: (data: any) => void;
    videoUnmuted: (data: any) => void;
    newProducer: (data: any) => void;
    producerPaused: (data: any) => void;
    producerResumed: (data: any) => void;
    consumerPaused: (data: any) => void;
    consumerResumed: (data: any) => void;
}
export interface ClientToServerEvents {
    joinConference: (data: any, callback: (response: any) => void) => void;
    leaveConference: (data: any, callback: (response: any) => void) => void;
    createTransport: (data: CreateTransportParams, callback: (response: any) => void) => void;
    produce: (data: any, callback: (response: any) => void) => void;
    consume: (data: any, callback: (response: any) => void) => void;
    connectTransport: (data: any, callback: (response: any) => void) => void;
    getProducers: (data: any, callback: (response: any) => void) => void;
    resumeProducer: (data: any, callback: (response: any) => void) => void;
    resumeConsumer: (data: any, callback: (response: any) => void) => void;
    pauseProducer: (data: any, callback: (response: any) => void) => void;
    pauseConsumer: (data: any, callback: (response: any) => void) => void;
    closeProducer: (data: any, callback: (response: any) => void) => void;
    closeConsumer: (data: any, callback: (response: any) => void) => void;
    muteAudio: (data: any, callback: (response: any) => void) => void;
    unmuteAudio: (data: any, callback: (response: any) => void) => void;
    muteVideo: (data: any, callback: (response: any) => void) => void;
    unmuteVideo: (data: any, callback: (response: any) => void) => void;
    getMediaStates: (data: any, callback: (response: any) => void) => void;
    getParticipants: (data: any, callback: (response: any) => void) => void;
    consumeParticipantMedia: (data: any, callback: (response: any) => void) => void;
    unpauseConsumer: (data: any, callback: (response: any) => void) => void;
    getProducersWithParticipantId: (data: any, callback: (response: any) => void) => void;
}
//# sourceMappingURL=socket_client.d.ts.map