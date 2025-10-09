import {
  WorkerLogLevel,
  WorkerLogTag,
  WorkerSettings,
  Producer,
  Consumer,
  RtpCapabilities,
  WebRtcTransportOptions,
  RouterOptions,
  DtlsParameters,
  RtpParameters,
  MediaKind,
  ProducerOptions,
  ConsumerOptions,
} from "mediasoup/types";
import Conference from "./models/conference";
import { EnhancedEventEmitter } from "mediasoup/extras";
import { Server, Socket } from "socket.io";
import Participant from "./models/participant";

export interface MediasoupConfig {
  workerConfig: WorkerSettings;
  transportConfig: WebRtcTransportOptions;
  routerConfig: RouterOptions;
}
export type ConferenceMap = Map<string, Conference>;
export type ParticipantsMap = Map<string, Participant>;

// Add a method to convert ParticipantsMap to an array
export function participantsMapToArray(
  participantsMap: ParticipantsMap
): Participant[];

export interface ParticipantsIndex {
  [key: string]: Participant; // Add index signature for participant access
}

export interface MediasoupStateConfig {
  initialConferences?: ConferenceMap;
}

export type MediasoupStateEvents = {
  conferenceCreated: Conference;
  participantJoined: Participant;
  participantLeft: Participant;
};

export type joinConferenceParams = {
  conferenceId: string;
  conferenceName: string;
  participantId: string;
  participantName: string;
  socketId: string;
};

export type SocketEventData = {
  eventType:
    | "joinConference"
    | "createTransport"
    | "connectTransport"
    | "produce"
    | "consume"
    | "resumeConsumer"
    | "leaveConference";
  data: MeetingParams;
  callback: (response: any) => void;
  errorback: (error: any) => void;
};
export type MeetingParams = {
  conferenceId: string;
  participantId: string;
  socket: Socket;
  extraData?: Record<string, any>; // Optional field for extra data
};

export type CreateTransportParams = {
  conferenceId: string;
  participantId: string;
  direction: "producer" | "consumer";
  options?: WebRtcTransportOptions;
};

export type ConnectTransportParams = {
  conferenceId: string;
  participantId: string;
  direction: "producer" | "consumer";
  dtlsParameters: DtlsParameters; // Replace 'any' with the actual type if available
};
export type ProduceParams = {
  conferenceId: string;
  participantId: string;
  transportId: string;
  producerOptions: ProducerOptions;
};

export type ConsumeParams = {
  conferenceId: string;
  participantId: string;
  consumeOptions: ConsumerOptions;
};

export type ConsumerResponse = {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  type: string;
  producerUserId: string;
};
export type ResumeConsumerParams = {
  conferenceId: string;
  participantId: string;
  consumerId: string;
};

export interface AppState {
  conferences: ConferenceMap;
  getConferences(): ConferenceMap;
  joinConference(params: joinConferenceParams): void;
  createConference(conferenceId: string, name: string): void;
  getConference(conferenceId: string): Conference | undefined;
  removeFromConference(conferenceId: string, participantId: string): void;
  userRemoveWithSocketId(socketId: string): void;
  isConferenceExists(conferenceId: string): boolean;
}

export type ParticipantsProducersToUsers = Map<string, ProducersObject>;

export type ParticipantsConsumersToUsers = Map<string, ConsumersObject>;

export type ProducersObject = {
  [key: string]: Producer;
};
export type ConsumersObject = {
  [key: string]: Consumer;
};
