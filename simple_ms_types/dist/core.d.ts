import type { WorkerSettings, WebRtcTransportOptions, RouterOptions, Producer, Consumer, Transport, Router, Worker as MediasoupWorker, WebRtcTransport, AppData, DtlsParameters } from "mediasoup/types";
import { ConnectTransportParams, ConsumeParams, ConsumerResponse, CreateTransportParams, ProduceParams, ResumeConsumerParams } from "./transport";
/**
 * Configuration for MediaSoup server
 */
export interface MediasoupConfig {
    workerConfig: WorkerSettings;
    transportConfig: WebRtcTransportOptions;
    routerConfig: RouterOptions;
}
/**
 * Configuration for MediaSoup state initialization
 */
export interface MediasoupStateConfig {
    initialConferences?: ConferenceMap;
}
/**
 * Events emitted by the MediaSoup state system
 */
export type MediasoupStateEvents = {
    conferenceCreated: Conference;
    participantJoined: Participant;
    participantLeft: Participant;
};
/**
 * Core entity interfaces
 */
export interface Conference {
    id: string;
    name: string;
    participants: Map<string, Participant>;
    router: Router | null;
    worker: MediasoupWorker;
    socketIds: string[];
    addParticipant(participant: Participant): void;
    removeParticipant(participantId: string): Promise<{
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    removeWithSocketId(socketId: string): Promise<{
        participantId: string | null;
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    getParticipants(): Participant[];
    getParticipant(participantId: string): Participant | undefined;
    getName(): string;
    getConferenceId(): string;
    getRouterRtpsCapabilities(): any;
    getRouter(): Router | null;
    getWorker(): MediasoupWorker;
    createParticipant(participantId: string, participantName: string, socketId: string): Participant;
    createTransport(transportParams: CreateTransportParams): Promise<WebRtcTransport>;
    connectTransport(connectParams: ConnectTransportParams): Promise<void>;
    produce(produceParams: ProduceParams): Promise<string>;
    consume(consumeParams: ConsumeParams): Promise<ConsumerResponse>;
    resumeConsumer(resumeParams: ResumeConsumerParams): Promise<void>;
    participantsMapToArray(participantsMap: ParticipantsMap): Participant[];
    pauseProducer(participantId: string, producerId: string): void;
    resumeProducer(participantId: string, producerId: string): Promise<void>;
    pauseConsumer(participantId: string, consumerId: string): Promise<void>;
    closeProducer(participantId: string, producerId: string): Promise<"audio" | "video" | null>;
    closeConsumer(participantId: string, consumerId: string): Promise<void>;
    isEmpty(): boolean;
    getParticipantCount(): number;
    cleanup(): Promise<void>;
    muteParticipantAudio(participantId: string): Promise<string[]>;
    unmuteParticipantAudio(participantId: string): Promise<string[]>;
    muteParticipantVideo(participantId: string): Promise<string[]>;
    unmuteParticipantVideo(participantId: string): Promise<string[]>;
    getParticipantMediaStates(participantId: string): Array<{
        producerId: string;
        kind: "audio" | "video";
        paused: boolean;
        closed: boolean;
    }> | null;
    getExistingProducerIds(currentParticipantId: string): Array<{
        participantId: string;
        producerIds: string[];
    }>;
}
export interface Participant {
    id: string;
    name: string;
    socketId: string;
    producerTransport?: Transport;
    consumerTransport?: Transport;
    producers: ProducersToUsers;
    consumers: ConsumersToUsers;
    setProducerTransport(transport: Transport): void;
    setConsumerTransport(transport: Transport): void;
    addProducer(producer: Producer): void;
    addConsumer(consumer: Consumer): void;
    removeProducer(producerId: string): void;
    removeConsumer(consumerId: string): void;
    createTransport(router: Router<AppData>, createTransportParams: CreateTransportParams): Promise<WebRtcTransport>;
    connectTransport(direction: string, dtlsParameters: DtlsParameters): Promise<void>;
    produce(produceParams: ProduceParams): Promise<string>;
    consume(consumeParams: ConsumeParams): Promise<ConsumerResponse>;
    resumeConsumer(consumerId: string): Promise<void>;
    pauseProducer(producerId: string): void;
    resumeProducer(producerId: string): void;
    pauseConsumer(consumerId: string): void;
    closeAllProducers(): Promise<string[]>;
    closeAllConsumers(): Promise<string[]>;
    closeTransports(): Promise<void>;
    cleanup(): Promise<{
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    getProducerById(producerId: string): Producer | null;
    getConsumerById(consumerId: string): Consumer | null;
    getAllProducers(): Producer[];
    getAllConsumers(): Consumer[];
    getProducerIds(): string[];
}
/**
 * Type aliases for better readability
 */
export type ConferenceMap = Map<string, Conference>;
export type ParticipantsMap = Map<string, Participant>;
export type ProducersToUsers = Map<string, ProducersObject>;
export type ConsumersToUsers = Map<string, ConsumersObject>;
export type ProducersObject = {
    [key: string]: Producer;
};
export type ConsumersObject = {
    [key: string]: Consumer;
};
/**
 * Index interface for participant access
 */
export interface ParticipantsIndex {
    [key: string]: Participant;
}
//# sourceMappingURL=core.d.ts.map