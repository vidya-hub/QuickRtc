import type {
  WorkerSettings,
  WebRtcTransportOptions,
  RouterOptions,
  Producer,
  Consumer,
  Transport,
  Router,
  Worker as MediasoupWorker,
  WebRtcTransport,
  AppData,
  DtlsParameters,
} from "mediasoup/types";
import {
  ConnectTransportParams,
  ConsumeParams,
  ConsumerResponse,
  CreateTransportParams,
  ProduceParams,
  ResumeConsumerParams,
} from "./transport";

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
  removeParticipant(participantId: string): void;
  removeWithSocketId(socketId: string): void;
  getParticipants(): Participant[];
  getParticipant(participantId: string): Participant | undefined;
  getName(): string;
  getConferenceId(): string;
  getRouterRtpsCapabilities(): any; // Adjust type as necessary
  getRouter(): Router | null;
  getWorker(): MediasoupWorker;
  createParticipant(
    participantId: string,
    participantName: string,
    socketId: string
  ): Participant;
  createTransport(
    transportParams: CreateTransportParams
  ): Promise<WebRtcTransport>;
  connectTransport(connectParams: ConnectTransportParams): Promise<void>;
  produce(produceParams: ProduceParams): Promise<string>;
  consume(consumeParams: ConsumeParams): Promise<ConsumerResponse>;
  resumeConsumer(resumeParams: ResumeConsumerParams): Promise<void>;
  participantsMapToArray(participantsMap: ParticipantsMap): Participant[];
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
  createTransport(
    router: Router<AppData>,
    createTransportParams: CreateTransportParams
  ): Promise<WebRtcTransport>;
  connectTransport(
    direction: string,
    dtlsParameters: DtlsParameters
  ): Promise<void>;
  produce(produceParams: ProduceParams): Promise<string>;
  consume(consumeParams: ConsumeParams): Promise<ConsumerResponse>;
  resumeConsumer(consumerId: string): Promise<void>;
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
