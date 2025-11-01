import { io, Socket } from "socket.io-client";
import {
  CreateTransportParams,
  ConnectTransportParams,
  ProduceParams,
  ConsumeParams,
} from "./transport";
import type {
  RtpCapabilities,
  DtlsParameters,
  MediaKind,
  RtpParameters,
} from "mediasoup/types";

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Standard socket response structure
 */
export interface SocketResponse<T = any> {
  status: "ok" | "error";
  data?: T;
  error?: string;
}

/**
 * Participant information
 */
export interface ParticipantInfo {
  participantId: string;
  participantName: string;
}

/**
 * Join conference request data
 */
export interface JoinConferenceRequest {
  data: {
    conferenceId: string;
    participantId: string;
    conferenceName?: string;
    participantName: string;
  };
}

/**
 * Join conference response data
 */
export interface JoinConferenceResponse {
  routerCapabilities: RtpCapabilities;
}

/**
 * Leave conference request data
 */
export interface LeaveConferenceRequest {
  conferenceId: string;
  participantId: string;
}

/**
 * Create transport response data
 */
export interface CreateTransportResponse {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: DtlsParameters;
  sctpParameters?: any;
}

/**
 * Produce response data
 */
export interface ProduceResponse {
  producerId: string;
}

/**
 * Consumer parameters returned from server
 */
export interface ConsumerParams {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  appData?: any;
}

/**
 * Consume participant media request
 */
export interface ConsumeParticipantMediaRequest {
  conferenceId: string;
  participantId: string;
  targetParticipantId: string;
  rtpCapabilities: RtpCapabilities;
}

/**
 * Get participants request
 */
export interface GetParticipantsRequest {
  conferenceId: string;
}

/**
 * Pause/Resume/Close producer request
 */
export interface ProducerControlRequest {
  conferenceId: string;
  participantId: string;
  extraData: {
    producerId: string;
  };
}

/**
 * Unpause consumer request
 */
export interface UnpauseConsumerRequest {
  conferenceId: string;
  participantId: string;
  consumerId: string;
}

/**
 * Close consumer request
 */
export interface CloseConsumerRequest {
  conferenceId: string;
  participantId: string;
  extraData: {
    consumerId: string;
  };
}

/**
 * Participant joined event data
 */
export interface ParticipantJoinedData {
  participantId: string;
  participantName: string;
  conferenceId: string;
}

/**
 * Participant left event data
 */
export interface ParticipantLeftData {
  participantId: string;
  closedProducerIds: string[];
  closedConsumerIds: string[];
}

/**
 * New producer event data
 */
export interface NewProducerData {
  producerId: string;
  participantId: string;
  participantName: string;
  kind: MediaKind;
}

/**
 * Producer/Consumer closed event data
 */
export interface ProducerClosedData {
  participantId: string;
  producerId: string;
  kind: "audio" | "video";
}

export interface ConsumerClosedData {
  participantId: string;
  consumerId: string;
}

/**
 * Media muted/unmuted event data
 */
export interface MediaMutedData {
  participantId: string;
  mutedProducerIds?: string[];
}

/**
 * Server-to-Client Events
 */
export interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  participantJoined: (data: ParticipantJoinedData) => void;
  participantLeft: (data: ParticipantLeftData) => void;
  newProducer: (data: NewProducerData) => void;
  producerClosed: (data: ProducerClosedData) => void;
  consumerClosed: (data: ConsumerClosedData) => void;
  audioMuted: (data: MediaMutedData) => void;
  audioUnmuted: (data: MediaMutedData) => void;
  videoMuted: (data: MediaMutedData) => void;
  videoUnmuted: (data: MediaMutedData) => void;
}

/**
 * Client-to-Server Events
 */
export interface ClientToServerEvents {
  joinConference: (
    data: JoinConferenceRequest,
    callback: (response: SocketResponse<JoinConferenceResponse>) => void
  ) => void;
  leaveConference: (
    data: LeaveConferenceRequest,
    callback: (response: SocketResponse) => void
  ) => void;
  createTransport: (
    data: CreateTransportParams,
    callback: (response: SocketResponse<CreateTransportResponse>) => void
  ) => void;
  connectTransport: (
    data: ConnectTransportParams,
    callback: (response: SocketResponse) => void
  ) => void;
  produce: (
    data: ProduceParams,
    callback: (response: SocketResponse<ProduceResponse>) => void
  ) => void;
  consume: (
    data: ConsumeParams,
    callback: (response: SocketResponse<ConsumerParams>) => void
  ) => void;
  pauseProducer: (
    data: ProducerControlRequest,
    callback: (response: SocketResponse) => void
  ) => void;
  resumeProducer: (
    data: ProducerControlRequest,
    callback: (response: SocketResponse) => void
  ) => void;
  closeProducer: (
    data: ProducerControlRequest,
    callback: (response: SocketResponse) => void
  ) => void;
  closeConsumer: (
    data: CloseConsumerRequest,
    callback: (response: SocketResponse) => void
  ) => void;
  consumeParticipantMedia: (
    data: ConsumeParticipantMediaRequest,
    callback: (response: SocketResponse<ConsumerParams[]>) => void
  ) => void;
  unpauseConsumer: (
    data: UnpauseConsumerRequest,
    callback: (response: SocketResponse) => void
  ) => void;
  getParticipants: (
    data: GetParticipantsRequest,
    callback: (response: SocketResponse<ParticipantInfo[]>) => void
  ) => void;
}
