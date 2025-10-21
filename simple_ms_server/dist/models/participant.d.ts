import * as mediasoup from "mediasoup";
import { AppData, DtlsParameters, Router, Transport } from "mediasoup/types";
import { ConsumeParams, ConsumerResponse, ConsumersToUsers, CreateTransportParams, ProduceParams, ProducersToUsers, Participant } from "@simple-mediasoup/types";
declare class MediasoupParticipant implements Participant {
    id: string;
    socketId: string;
    name: string;
    producerTransport?: mediasoup.types.Transport;
    consumerTransport?: mediasoup.types.Transport;
    producers: ProducersToUsers;
    consumers: ConsumersToUsers;
    private mediaStates;
    constructor(id: string, name: string, socketId: string);
    setProducerTransport(transport: Transport): void;
    setConsumerTransport(transport: Transport): void;
    addProducer(producer: mediasoup.types.Producer): void;
    addConsumer(consumer: mediasoup.types.Consumer): void;
    removeProducer(producerId: string): void;
    removeConsumer(consumerId: string): void;
    closeAllProducers(): Promise<string[]>;
    closeAllConsumers(): Promise<string[]>;
    closeTransports(): Promise<void>;
    cleanup(): Promise<{
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    createTransport(router: Router<AppData>, createTransportParams: CreateTransportParams): Promise<mediasoup.types.WebRtcTransport>;
    connectTransport(direction: string, dtlsParameters: DtlsParameters): Promise<void>;
    produce(produceParams: ProduceParams): Promise<string>;
    consume(consumeParams: ConsumeParams): Promise<ConsumerResponse>;
    resumeConsumer(consumerId: string): Promise<void>;
    pauseProducer(producerId: string): void;
    resumeProducer(producerId: string): void;
    pauseConsumer(consumerId: string): void;
    getProducerById(producerId: string): mediasoup.types.Producer | null;
    getConsumerById(consumerId: string): mediasoup.types.Consumer | null;
    getAllProducers(): mediasoup.types.Producer[];
    getAllConsumers(): mediasoup.types.Consumer[];
    getMediaState(producerId: string): {
        kind: "audio" | "video";
        paused: boolean;
        closed: boolean;
    } | null;
    setMediaState(producerId: string, kind: "audio" | "video", paused?: boolean, closed?: boolean): void;
    updateMediaState(producerId: string, updates: {
        paused?: boolean;
        closed?: boolean;
    }): void;
    getMediaStates(): Array<{
        producerId: string;
        kind: "audio" | "video";
        paused: boolean;
        closed: boolean;
    }>;
    isAudioMuted(): boolean;
    isVideoMuted(): boolean;
    muteAudio(): string[];
    unmuteAudio(): string[];
    muteVideo(): string[];
    unmuteVideo(): string[];
    getProducerIds(): string[];
}
export default MediasoupParticipant;
//# sourceMappingURL=participant.d.ts.map