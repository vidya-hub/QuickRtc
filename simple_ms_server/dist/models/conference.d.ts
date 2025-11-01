import { RtpCapabilities, WebRtcTransport } from "mediasoup/types";
import MediasoupParticipant from "./participant";
import * as mediasoup from "mediasoup";
import { Conference, ConnectTransportParams, ConsumeParams, CreateTransportParams, Participant, ParticipantsMap, ProduceParams, ResumeConsumerParams } from "@simple-mediasoup/types";
declare class MediasoupConference implements Conference {
    participants: ParticipantsMap;
    name: string;
    conferenceId: string;
    socketIds: string[];
    router: mediasoup.types.Router | null;
    worker: mediasoup.types.Worker;
    id: string;
    constructor(id: string, name: string, participants: ParticipantsMap, conferenceId: string, worker: mediasoup.types.Worker, router?: mediasoup.types.Router | null);
    addParticipant(participant: MediasoupParticipant): void;
    removeParticipant(participantId: string): Promise<{
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    removeWithSocketId(socketId: string): Promise<{
        participantId: string | null;
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    getParticipants(): MediasoupParticipant[];
    getParticipant(participantId: string): Participant | undefined;
    getName(): string;
    getConferenceId(): string;
    getRouterRtpsCapabilities(): RtpCapabilities | undefined;
    getRouter(): mediasoup.types.Router | null;
    getWorker(): mediasoup.types.Worker;
    createParticipant(participantId: string, participantName: string, socketId: string): MediasoupParticipant;
    createTransport(transportParams: CreateTransportParams): Promise<WebRtcTransport>;
    connectTransport(connectParams: ConnectTransportParams): Promise<void>;
    produce(produceParams: ProduceParams): Promise<string>;
    consume(consumeParams: ConsumeParams): Promise<import("@simple-mediasoup/types").ConsumerResponse>;
    resumeConsumer(resumeParams: ResumeConsumerParams): Promise<void>;
    participantsMapToArray(participantsMap: ParticipantsMap): MediasoupParticipant[];
    pauseProducer(participantId: string, producerId: string): void;
    getExistingProducerIds(currentParticipantId: string): Array<{
        participantId: string;
        producerIds: string[];
    }>;
    resumeProducer(participantId: string, producerId: string): Promise<void>;
    pauseConsumer(participantId: string, consumerId: string): Promise<void>;
    closeProducer(participantId: string, producerId: string): Promise<"audio" | "video" | null>;
    closeConsumer(participantId: string, consumerId: string): Promise<void>;
    isEmpty(): boolean;
    getParticipantCount(): number;
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
    cleanup(): Promise<void>;
}
export default MediasoupConference;
//# sourceMappingURL=conference.d.ts.map