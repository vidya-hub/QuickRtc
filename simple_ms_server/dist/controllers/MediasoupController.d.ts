import * as mediasoup from "mediasoup";
import WorkerService from "../workers/WorkerService";
import { EnhancedEventEmitter } from "mediasoup/extras";
import { ErrorHandler } from "../utils/ErrorHandler";
import { AppState, Conference, ConferenceMap, ConnectTransportParams, ConsumeParams, ConsumerResponse, CreateTransportParams, JoinConferenceParams, ProduceParams, ResumeConsumerParams } from "@simple-mediasoup/types";
declare class MediasoupController extends EnhancedEventEmitter implements AppState {
    conferences: ConferenceMap;
    workerService: WorkerService;
    errorHandler: ErrorHandler;
    private cleanupInterval?;
    private statsInterval?;
    private readonly CLEANUP_INTERVAL;
    private readonly STATS_INTERVAL;
    constructor(workerService: WorkerService);
    getConferences(): ConferenceMap;
    joinConference(params: JoinConferenceParams): Promise<Conference>;
    createConference(conferenceId: string, name: string): Promise<void>;
    getConference(conferenceId: string): Conference | undefined;
    createTransport(transportParams: CreateTransportParams): Promise<mediasoup.types.WebRtcTransport>;
    connectTransport(connectParams: ConnectTransportParams): Promise<void>;
    produce(produceParams: ProduceParams): Promise<string>;
    consume(consumeParams: ConsumeParams): Promise<ConsumerResponse>;
    resumeConsumer(resumeParams: ResumeConsumerParams): Promise<void>;
    removeFromConference(conferenceId: string, participantId: string): Promise<{
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    userRemoveWithSocketId(socketId: string): Promise<{
        conferenceId: string | null;
        participantId: string | null;
        closedProducerIds: string[];
        closedConsumerIds: string[];
    }>;
    private cleanupConference;
    isConferenceExists(conferenceId: string): boolean;
    pauseProducer(params: {
        conferenceId: string;
        participantId: string;
        producerId: string;
    }): Promise<void>;
    getExistingProducerIds(participantId: string, conferenceId: string): Array<{
        participantId: string;
        producerIds: string[];
    }>;
    resumeProducer(params: {
        conferenceId: string;
        participantId: string;
        producerId: string;
    }): Promise<void>;
    pauseConsumer(params: {
        conferenceId: string;
        participantId: string;
        consumerId: string;
    }): Promise<void>;
    closeProducer(params: {
        conferenceId: string;
        participantId: string;
        producerId: string;
    }): Promise<"audio" | "video" | null>;
    closeConsumer(params: {
        conferenceId: string;
        participantId: string;
        consumerId: string;
    }): Promise<void>;
    muteAudio(params: {
        conferenceId: string;
        participantId: string;
    }): Promise<string[]>;
    unmuteAudio(params: {
        conferenceId: string;
        participantId: string;
    }): Promise<string[]>;
    muteVideo(params: {
        conferenceId: string;
        participantId: string;
    }): Promise<string[]>;
    unmuteVideo(params: {
        conferenceId: string;
        participantId: string;
    }): Promise<string[]>;
    getParticipantMediaStates(conferenceId: string, participantId: string): Array<{
        producerId: string;
        kind: "audio" | "video";
        paused: boolean;
        closed: boolean;
    }> | null;
    private startPeriodicCleanup;
    private startStatsCollection;
    private performPeriodicCleanup;
    private collectAndEmitStats;
    getStats(): {
        conferences: number;
        totalParticipants: number;
        workerStats: Array<{
            workerId: string;
            routerCount: number;
            cpuUsage: number;
            lastUsed: number;
        }>;
    };
    private setupErrorHandling;
    private handleWorkerError;
    shutdown(): Promise<void>;
    getParticipants(conferenceId: string): {
        participantId: string;
        participantName: string;
        socketId: string;
    }[];
    getProducersByParticipantId(conferenceId: string, participantId: string): string[];
}
export default MediasoupController;
//# sourceMappingURL=MediasoupController.d.ts.map