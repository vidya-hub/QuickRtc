import { WorkerLogLevel, WorkerLogTag, WorkerSettings } from "mediasoup/types";
import Participant from "./models/participant";
import Conference from "./models/conference";
import { EnhancedEventEmitter } from "mediasoup/extras";

export interface TransportListenIp {
  ip: string;
  announcedIp: string;
}

export interface TransportConfig {
  listenIps: TransportListenIp[];
  enableUdp: boolean;
  enableTcp: boolean;
  preferUdp: boolean;
  enableSctp: boolean;
}

export interface MediasoupConfig {
  workerConfig: WorkerSettings;
  transport: TransportConfig;
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
