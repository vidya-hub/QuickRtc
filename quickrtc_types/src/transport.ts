import type {
  WebRtcTransportOptions,
  DtlsParameters,
  ProducerOptions,
  ConsumerOptions,
  RtpCapabilities,
  RtpParameters,
  MediaKind,
} from "mediasoup/types";

/**
 * Parameters for creating a WebRTC transport
 */
export type CreateTransportParams = {
  conferenceId: string;
  participantId: string;
  direction: "producer" | "consumer";
  options?: WebRtcTransportOptions;
};

/**
 * Parameters for connecting a WebRTC transport
 */
export type ConnectTransportParams = {
  conferenceId: string;
  participantId: string;
  direction: "producer" | "consumer";
  dtlsParameters: DtlsParameters;
};

/**
 * Stream type for identifying the purpose of a stream
 */
export type StreamType = "audio" | "video" | "screenshare";

/**
 * Parameters for producing media
 */
export type ProduceParams = {
  conferenceId: string;
  participantId: string;
  transportId: string;
  producerOptions: ProducerOptions;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  /** Stream type: audio, video (camera), or screenshare */
  streamType?: StreamType;
};

/**
 * Parameters for consuming media
 */
export type ConsumeParams = {
  conferenceId: string;
  participantId: string;
  consumeOptions: ConsumerOptions & {
    producerId: string;
    rtpCapabilities: RtpCapabilities;
  };
};

/**
 * Response object when a consumer is created
 */
export type ConsumerResponse = {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  type: string;
  producerUserId: string;
};

/**
 * Parameters for resuming a consumer
 */
export type ResumeConsumerParams = {
  conferenceId: string;
  participantId: string;
  consumerId: string;
};
