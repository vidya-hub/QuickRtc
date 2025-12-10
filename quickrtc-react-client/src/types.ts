import { Socket } from "socket.io-client";
import type {
  Transport,
  Producer,
  Consumer,
  Device,
} from "mediasoup-client/lib/types";

/**
 * Configuration for joining a conference
 */
export interface ConferenceConfig {
  conferenceId: string;
  conferenceName?: string;
  participantId: string;
  participantName: string;
  socket: Socket;
}

/**
 * Local stream types
 */
export type LocalStreamType = "audio" | "video" | "screenshare";

/**
 * Local stream information
 */
export interface LocalStreamInfo {
  id: string;
  type: LocalStreamType;
  track: MediaStreamTrack;
  producer: Producer;
  stream: MediaStream;
  enabled: boolean;
}

/**
 * Remote stream information (for multiple streams per participant)
 */
export interface RemoteStreamInfo {
  id: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
  consumer: Consumer;
  producerId: string;
}

/**
 * Remote participant information
 */
export interface RemoteParticipant {
  participantId: string;
  participantName: string;
  /** @deprecated Use streams array instead */
  videoStream?: MediaStream;
  /** @deprecated Use streams array instead */
  audioStream?: MediaStream;
  /** @deprecated Use streams array instead */
  videoConsumer?: Consumer;
  /** @deprecated Use streams array instead */
  audioConsumer?: Consumer;
  /** All streams from this participant */
  streams: RemoteStreamInfo[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenShareEnabled: boolean;
}

/**
 * Media produce options
 */
export interface ProduceMediaOptions {
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  type?: LocalStreamType;
}

/**
 * Media produce result
 */
export interface ProduceMediaResult {
  audioStreamId?: string;
  videoStreamId?: string;
}

/**
 * Transport options from server
 */
export interface TransportOptions {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
  sctpParameters?: any;
}

/**
 * Transport pair from server
 */
export interface TransportPair {
  sendTransport: TransportOptions;
  recvTransport: TransportOptions;
}

/**
 * Consumer parameters from server
 */
export interface ConsumeParams {
  id: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: any;
}

/**
 * Participant info from server
 */
export interface ParticipantInfo {
  participantId: string;
  participantName: string;
  socketId: string;
}

/**
 * Conference state
 */
export interface ConferenceState {
  // Connection state
  isJoined: boolean;
  isConnecting: boolean;

  // Configuration
  config: ConferenceConfig | null;

  // MediaSoup state
  device: Device | null;
  sendTransport: Transport | null;
  recvTransport: Transport | null;

  // Local streams
  localStreams: LocalStreamInfo[];

  // Remote participants
  remoteParticipants: RemoteParticipant[];

  // Error state
  error: string | null;
}

/**
 * Socket event types
 */
export interface SocketEvents {
  participantJoined: {
    participantId: string;
    participantName: string;
  };
  participantLeft: {
    participantId: string;
  };
  newProducer: {
    producerId: string;
    participantId: string;
    participantName: string;
    kind: "audio" | "video";
  };
  producerClosed: {
    producerId: string;
    participantId: string;
    kind: "audio" | "video";
  };
  consumerClosed: {
    consumerId: string;
    kind: "audio" | "video";
  };
}

/**
 * Redux thunk extra argument
 */
export interface ThunkExtraArgument {
  deviceService: any;
  streamService: any;
  socketService: any;
}
