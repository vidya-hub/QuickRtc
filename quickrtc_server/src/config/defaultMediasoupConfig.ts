import type { WorkerSettings, RouterOptions } from "mediasoup/types";

/**
 * Listen IP configuration for WebRTC transports
 */
export interface ListenIpConfig {
  ip: string;
  announcedIp: string | null;
}

/**
 * Transport options configuration (without listenIps - those are set via webRtcServerOptions)
 */
export interface TransportOptions {
  enableUdp: boolean;
  enableTcp: boolean;
  preferUdp: boolean;
  enableSctp: boolean;
}

/**
 * WebRTC server options for transport configuration
 */
export interface WebRtcServerOptions {
  listenInfos: ListenIpConfig[];
}

/**
 * Participant limits configuration
 */
export interface ParticipantLimits {
  /** Maximum number of video producers per participant (includes camera + screenshare) */
  maxVideoProducers: number;
  /** Maximum number of audio producers per participant */
  maxAudioProducers: number;
}

/**
 * Complete QuickRTC mediasoup configuration
 */
export interface QuickRTCMediasoupConfig {
  workerSettings: WorkerSettings;
  routerOptions: RouterOptions;
  transportOptions: TransportOptions;
  webRtcServerOptions: WebRtcServerOptions;
  participantLimits: ParticipantLimits;
}

/**
 * Default mediasoup configuration for QuickRTC
 * These values provide a good starting point for most use cases
 */
export const defaultMediasoupConfig: QuickRTCMediasoupConfig = {
  workerSettings: {
    logLevel: "warn",
    logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
  routerOptions: {
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "42e01f",
          "level-asymmetry-allowed": 1,
        },
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {},
      },
    ],
  },
  transportOptions: {
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    enableSctp: false,
  },
  webRtcServerOptions: {
    listenInfos: [
      {
        ip: "127.0.0.1",
        announcedIp: null,
      },
    ],
  },
  participantLimits: {
    maxVideoProducers: 2, // Allow camera + screenshare by default
    maxAudioProducers: 1,
  },
};

/**
 * Deep merge utility to merge user config with default config
 */
export function mergeMediasoupConfig(
  userConfig?: Partial<QuickRTCMediasoupConfig>
): QuickRTCMediasoupConfig {
  if (!userConfig) {
    return { ...defaultMediasoupConfig };
  }

  return {
    workerSettings: {
      ...defaultMediasoupConfig.workerSettings,
      ...userConfig.workerSettings,
    },
    routerOptions: {
      ...defaultMediasoupConfig.routerOptions,
      ...userConfig.routerOptions,
      // If user provides mediaCodecs, use theirs entirely (don't merge array)
      mediaCodecs:
        userConfig.routerOptions?.mediaCodecs ||
        defaultMediasoupConfig.routerOptions.mediaCodecs,
    },
    transportOptions: {
      ...defaultMediasoupConfig.transportOptions,
      ...userConfig.transportOptions,
    },
    webRtcServerOptions: {
      ...defaultMediasoupConfig.webRtcServerOptions,
      ...userConfig.webRtcServerOptions,
      // If user provides listenInfos, use theirs entirely (don't merge array)
      listenInfos:
        userConfig.webRtcServerOptions?.listenInfos ||
        defaultMediasoupConfig.webRtcServerOptions.listenInfos,
    },
    participantLimits: {
      ...defaultMediasoupConfig.participantLimits,
      ...userConfig.participantLimits,
    },
  };
}

export default defaultMediasoupConfig;
