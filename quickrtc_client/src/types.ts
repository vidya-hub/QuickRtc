import type { Socket } from "socket.io-client";
import type { types as MediasoupTypes } from "mediasoup-client";

type Device = MediasoupTypes.Device;
type Transport = MediasoupTypes.Transport;
type Producer = MediasoupTypes.Producer;
type Consumer = MediasoupTypes.Consumer;
type RtpCapabilities = MediasoupTypes.RtpCapabilities;

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration for QuickRTC client instance
 */
export interface QuickRTCConfig {
  /** Socket.IO client instance */
  socket: Socket;
  /** Maximum participants allowed (0 = unlimited) */
  maxParticipants?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Configuration for joining a conference
 */
export interface JoinConfig {
  /** Conference/room ID */
  conferenceId: string;
  /** Conference name (optional) */
  conferenceName?: string;
  /** Participant ID (auto-generated if not provided) */
  participantId?: string;
  /** Participant display name */
  participantName: string;
  /** Extra participant info (permissions, metadata, etc.) */
  participantInfo?: Record<string, unknown>;
}

// ============================================================================
// STREAMS
// ============================================================================

/**
 * Stream types
 */
export type StreamType = "audio" | "video" | "screenshare";

/**
 * Track with optional type hint for producing
 */
export interface TrackWithType {
  track: MediaStreamTrack;
  type?: StreamType;
}

/**
 * Input for produce() - can be single track, array of tracks, or tracks with types
 */
export type ProduceInput = 
  | MediaStreamTrack 
  | MediaStreamTrack[] 
  | TrackWithType 
  | TrackWithType[];

/**
 * Local stream handle returned from produce()
 */
export interface LocalStream {
  /** Unique stream ID */
  id: string;
  /** Stream type */
  type: StreamType;
  /** The MediaStream containing the track */
  stream: MediaStream;
  /** The original track */
  track: MediaStreamTrack;
  /** Whether the stream is paused */
  paused: boolean;
  /** Pause the stream */
  pause: () => Promise<void>;
  /** Resume the stream */
  resume: () => Promise<void>;
  /** Stop and close the stream */
  stop: () => Promise<void>;
}

/**
 * Remote stream from a participant
 */
export interface RemoteStream {
  /** Unique stream ID */
  id: string;
  /** Stream type */
  type: StreamType;
  /** The MediaStream */
  stream: MediaStream;
  /** Producer ID on the server */
  producerId: string;
  /** Participant ID who owns this stream */
  participantId: string;
  /** Participant name */
  participantName: string;
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

/**
 * Participant information
 */
export interface Participant {
  /** Participant ID */
  id: string;
  /** Display name */
  name: string;
  /** Extra participant info */
  info: Record<string, unknown>;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * New participant event data
 * Streams array may be empty if participant hasn't started sharing media yet
 */
export interface NewParticipantEvent {
  /** Participant ID */
  participantId: string;
  /** Participant display name */
  participantName: string;
  /** Extra participant info */
  participantInfo: Record<string, unknown>;
  /** Streams from this participant (may be empty) */
  streams: RemoteStream[];
}

/**
 * Event types emitted by QuickRTC
 */
export interface QuickRTCEvents {
  /** Successfully connected to conference */
  connected: { conferenceId: string; participantId: string };
  /** Disconnected from conference */
  disconnected: { reason: string };
  /** Error occurred */
  error: { message: string; error?: Error };
  
  /** 
   * A new participant joined the conference.
   * Streams array contains any media they're already sharing (may be empty).
   * For existing participants when you join: streams will include their current media.
   * For new participants joining after you: streams will typically be empty.
   */
  newParticipant: NewParticipantEvent;
  
  /** A participant left the conference */
  participantLeft: { participantId: string };
  
  /** 
   * An existing participant started sharing new media.
   * This is emitted when someone who already joined starts video/audio/screenshare.
   */
  streamAdded: RemoteStream;
  
  /** A remote stream was removed (participant stopped sharing) */
  streamRemoved: { participantId: string; streamId: string; type: StreamType };
  
  /** 
   * A local stream ended externally (e.g., user clicked browser's "Stop sharing" button).
   * Listen to this to update your local UI state.
   */
  localStreamEnded: { streamId: string; type: StreamType };
}

/**
 * Event handler type
 */
export type EventHandler<T> = (data: T) => void;

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/**
 * Internal producer info
 */
export interface ProducerInfo {
  id: string;
  type: StreamType;
  track: MediaStreamTrack;
  producer: Producer;
  stream: MediaStream;
  paused: boolean;
}

/**
 * Internal consumer info
 */
export interface ConsumerInfo {
  id: string;
  type: StreamType;
  consumer: Consumer;
  stream: MediaStream;
  producerId: string;
  participantId: string;
  participantName: string;
}

/**
 * Transport pair
 */
export interface TransportPair {
  sendTransport: Transport;
  recvTransport: Transport;
}

/**
 * Internal state
 */
export interface QuickRTCState {
  isConnected: boolean;
  conferenceId: string | null;
  participantId: string | null;
  participantName: string | null;
  device: Device | null;
  sendTransport: Transport | null;
  recvTransport: Transport | null;
  producers: Map<string, ProducerInfo>;
  consumers: Map<string, ConsumerInfo>;
  participants: Map<string, Participant>;
}

// ============================================================================
// SOCKET TYPES (for internal use)
// ============================================================================

export interface SocketResponse<T = unknown> {
  status: "ok" | "error";
  data?: T;
  error?: string;
}

export interface JoinResponse {
  routerCapabilities: RtpCapabilities;
}

export interface TransportOptions {
  id: string;
  iceParameters: unknown;
  iceCandidates: unknown[];
  dtlsParameters: unknown;
  sctpParameters?: unknown;
}

export interface ConsumerParams {
  id: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: unknown;
  streamType?: StreamType;
}

export interface ParticipantJoinedData {
  participantId: string;
  participantName: string;
  participantInfo?: Record<string, unknown>;
  conferenceId: string;
}

export interface ParticipantLeftData {
  participantId: string;
  closedProducerIds: string[];
  closedConsumerIds: string[];
}

export interface NewProducerData {
  producerId: string;
  participantId: string;
  participantName: string;
  kind: "audio" | "video";
  streamType?: StreamType;
}

export interface ProducerClosedData {
  participantId: string;
  producerId: string;
  kind: "audio" | "video";
  streamType?: StreamType;
}
