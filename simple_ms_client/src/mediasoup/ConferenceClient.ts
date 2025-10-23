import { Device } from "mediasoup-client";
import { SocketClientController } from "../controller/SocketClientController";
import type {
  RtpCapabilities,
  Transport,
  Producer,
  Consumer,
  MediaKind,
} from "mediasoup-client/types";
import { ClientSocket } from "@simple-mediasoup/types";
import { WebRtcTransportOptions } from "mediasoup/types";

// Event interfaces for type safety
export interface ConferenceClientEvents {
  // Connection events
  joined: { participantId: string; conferenceId: string };
  left: { reason?: string };
  error: { error: Error; context: string };
  reconnecting: {};
  reconnected: {};

  // Participant events
  participantJoined: { participantId: string; participantName: string };
  participantLeft: { participantId: string; participantName: string };

  // Media events
  localStreamReady: { stream: MediaStream; participantId: string };
  remoteStreamAdded: {
    stream: MediaStream;
    participantId: string;
    consumerId: string;
    producerId: string;
    kind: MediaKind;
  };
  remoteStreamRemoved: {
    participantId: string;
    consumerId: string;
    producerId: string;
  };
  participantStreamsReady: {
    participantId: string;
    participantName: string;
    streams: RemoteStreamData[];
  };

  // Producer/Consumer events
  producerCreated: {
    producerId: string;
    kind: MediaKind;
    participantId: string;
  };
  producerClosed: {
    producerId: string;
    kind: MediaKind;
    participantId: string;
  };
  consumerCreated: {
    consumerId: string;
    producerId: string;
    kind: MediaKind;
    participantId: string;
  };
  consumerClosed: {
    consumerId: string;
    producerId: string;
    participantId: string;
  };

  // Media state events
  audioMuted: { participantId: string; isLocal: boolean };
  audioUnmuted: { participantId: string; isLocal: boolean };
  videoMuted: { participantId: string; isLocal: boolean };
  videoUnmuted: { participantId: string; isLocal: boolean };

  // Transport events
  transportConnected: { transportId: string; direction: "send" | "recv" };
  transportClosed: { transportId: string; direction: "send" | "recv" };
  transportFailed: {
    transportId: string;
    direction: "send" | "recv";
    error: Error;
  };
}

export interface ConferenceClientConfig {
  conferenceId: string;
  participantId: string;
  participantName: string;
  socket: ClientSocket;
  conferenceName?: string;
  webRtcTransportOptions?: WebRtcTransportOptions;
  enableAudio?: boolean;
  enableVideo?: boolean;
  iceServers?: RTCIceServer[];
  videoConstraints?: MediaTrackConstraints;
  audioConstraints?: MediaTrackConstraints;
}

export interface ParticipantInfo {
  participantId: string;
  participantName: string;
  isLocal: boolean;
  audioMuted: boolean;
  videoMuted: boolean;
}

export interface ParticipantTrackInfo {
  participantId: string;
  participantName: string;
  tracks: {
    producerId: string;
    kind: MediaKind;
    enabled: boolean;
  }[];
}

export interface RemoteStreamData {
  participantId: string;
  participantName: string;
  stream: MediaStream;
  tracks: {
    producerId: string;
    consumerId: string;
    kind: MediaKind;
    track: MediaStreamTrack;
  }[];
}

/**
 * ConferenceClient - Stateless MediaSoup client with server-side state management
 *
 * This is a lightweight client that:
 * - Only holds current participant info
 * - Emits all operations to server
 * - Creates tracks on-demand when user wants to consume
 * - Handles all calls efficiently without local state storage
 */
export class ConferenceClient extends EventTarget {
  private config: ConferenceClientConfig;
  private socketController: SocketClientController;
  private device: Device;
  private sendTransport?: Transport;
  private recvTransport?: Transport;

  // Only store current participant info
  private currentParticipant: ParticipantInfo;
  private isJoined = false;
  private logger: (message: string, level?: "info" | "warn" | "error") => void;

  // Map to track remote streams by participant
  private remoteStreams = new Map<string, MediaStream>();
  private consumers = new Map<string, Consumer>();

  constructor(config: ConferenceClientConfig) {
    super();
    this.config = {
      enableAudio: true,
      enableVideo: true,
      ...config,
    };

    // Initialize logger
    this.logger = (
      message: string,
      level: "info" | "warn" | "error" = "info"
    ) => {
      const timestamp = new Date().toISOString();
      const prefix = `[ConferenceClient:${this.config.participantId}]`;
      console[level](`${timestamp} ${prefix} ${message}`);
    };

    // Initialize device
    this.device = new Device();

    // Only store current participant info
    this.currentParticipant = {
      participantId: config.participantId,
      participantName: config.participantName,
      isLocal: true,
      audioMuted: false,
      videoMuted: false,
    };

    // Initialize socket controller
    this.socketController = new SocketClientController(config.socket, {
      conferenceId: config.conferenceId,
      participantId: config.participantId,
      participantName: config.participantName,
      conferenceName: config.conferenceName,
      socketId: config.socket.id || "",
      webRtcTransportOptions: config.webRtcTransportOptions,
    });

    this.setupSocketEventListeners();
    this.logger("ConferenceClient initialized (stateless mode)");
  }

  /**
   * Setup all socket event listeners - stateless event forwarding
   */
  private setupSocketEventListeners(): void {
    this.logger("Setting up socket event listeners (stateless mode)");

    // Setup socket controller event listeners first
    this.socketController.setupEventListeners();

    // Participant events - just forward to application
    this.socketController.addEventListener(
      "participantJoined",
      (event: any) => {
        const { participantId, participantName } = event.detail;
        this.logger(
          `Participant joined: ${participantName} (${participantId})`
        );
        this.emit("participantJoined", { participantId, participantName });
      }
    );

    this.socketController.addEventListener("participantLeft", (event: any) => {
      const { participantId, participantName } = event.detail;
      this.logger(`Participant left: ${participantName} (${participantId})`);
      this.emit("participantLeft", { participantId, participantName });
    });

    // Producer events - handle new producer by creating consumer on demand
    this.socketController.addEventListener("newProducer", (event: any) => {
      const { producerId, participantId, kind, participantName } = event.detail;
      this.logger(
        `New producer available: ${producerId} (${kind}) from ${participantId}`
      );
      this.emit("producerCreated", { producerId, kind, participantId });

      // Auto-consume new producers immediately with participant info
      this.createConsumerOnDemand(producerId, {
        participantId,
        participantName,
      });
    });

    this.socketController.addEventListener("producerClosed", (event: any) => {
      const { producerId, participantId, kind } = event.detail;
      this.logger(
        `Producer closed: ${producerId} (${kind}) from ${participantId}`
      );
      this.emit("producerClosed", { producerId, kind, participantId });
    });

    // Consumer events - forward to application
    this.socketController.addEventListener("consumerClosed", (event: any) => {
      const { consumerId, producerId, participantId } = event.detail;
      this.logger(
        `Consumer closed: ${consumerId} for producer ${producerId} from ${participantId}`
      );
      this.emit("consumerClosed", { consumerId, producerId, participantId });
      this.emit("remoteStreamRemoved", {
        participantId,
        consumerId,
        producerId,
      });
    });

    // Media state events - update current participant and forward
    this.socketController.addEventListener("audioMuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Audio muted by participant: ${participantId}`);

      // Update current participant state if it's local
      if (participantId === this.currentParticipant.participantId) {
        this.currentParticipant.audioMuted = true;
        this.emit("audioMuted", { participantId, isLocal: true });
      } else {
        this.emit("audioMuted", { participantId, isLocal: false });
      }
    });

    this.socketController.addEventListener("audioUnmuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Audio unmuted by participant: ${participantId}`);

      // Update current participant state if it's local
      if (participantId === this.currentParticipant.participantId) {
        this.currentParticipant.audioMuted = false;
        this.emit("audioUnmuted", { participantId, isLocal: true });
      } else {
        this.emit("audioUnmuted", { participantId, isLocal: false });
      }
    });

    this.socketController.addEventListener("videoMuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Video muted by participant: ${participantId}`);

      // Update current participant state if it's local
      if (participantId === this.currentParticipant.participantId) {
        this.currentParticipant.videoMuted = true;
        this.emit("videoMuted", { participantId, isLocal: true });
      } else {
        this.emit("videoMuted", { participantId, isLocal: false });
      }
    });

    this.socketController.addEventListener("videoUnmuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Video unmuted by participant: ${participantId}`);

      // Update current participant state if it's local
      if (participantId === this.currentParticipant.participantId) {
        this.currentParticipant.videoMuted = false;
        this.emit("videoUnmuted", { participantId, isLocal: true });
      } else {
        this.emit("videoUnmuted", { participantId, isLocal: false });
      }
    });

    // Error events
    this.socketController.addEventListener("error", (event: any) => {
      this.logger(`Socket controller error: ${event.detail.message}`, "error");
      this.emit("error", {
        error: event.detail,
        context: "socket-controller",
      });
    });
  }

  /**
   * Join the conference - stateless setup
   */
  public async joinConference(): Promise<void> {
    if (this.isJoined) {
      this.logger("Already joined conference", "warn");
      return;
    }

    try {
      this.logger("Joining conference...");

      // Join and get router capabilities
      const routerCapabilities = await this.socketController.joinConference();
      if (!routerCapabilities) {
        throw new Error("Failed to get router capabilities");
      }

      this.logger("Router capabilities received");

      // Load device with router capabilities
      await this.device.load({ routerRtpCapabilities: routerCapabilities });
      this.logger("Device loaded with router capabilities");

      // Create transports
      const transports = await this.socketController.createTransports();
      if (!transports) {
        throw new Error("Failed to create transports");
      }

      this.logger("Transports created on server");

      // Create send transport
      const {
        sendTransport: sendTransportData,
        recvTransport: recvTransportData,
      } = transports;

      this.sendTransport = this.device.createSendTransport({
        id: sendTransportData.id,
        iceParameters: sendTransportData.iceParameters,
        iceCandidates: sendTransportData.iceCandidates,
        dtlsParameters: sendTransportData.dtlsParameters,
      });

      this.recvTransport = this.device.createRecvTransport({
        id: recvTransportData.id,
        iceParameters: recvTransportData.iceParameters,
        iceCandidates: recvTransportData.iceCandidates,
        dtlsParameters: recvTransportData.dtlsParameters,
      });

      this.logger("Local transports created");

      // Setup transport event listeners
      this.setupTransportListeners();

      this.isJoined = true;
      this.logger("Successfully joined conference (stateless mode)");

      this.emit("joined", {
        participantId: this.config.participantId,
        conferenceId: this.config.conferenceId,
      });
    } catch (error) {
      this.logger(
        `Failed to join conference: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      this.emit("error", {
        error: error instanceof Error ? error : new Error("Unknown join error"),
        context: "join-conference",
      });
      throw error;
    }
  }

  /**
   * Setup transport event listeners - stateless
   */
  private setupTransportListeners(): void {
    if (!this.sendTransport || !this.recvTransport) {
      throw new Error("Transports not initialized");
    }

    this.logger("Setting up transport listeners (stateless mode)");

    // Setup send transport listeners
    this.socketController.addSendTransportListener({
      sendTransport: this.sendTransport,
      onProduce: (params) => {
        this.logger(`Producer created: ${params.producerId} (${params.kind})`);
        // Just emit the event, don't store anything
        this.emit("producerCreated", {
          producerId: params.producerId,
          kind: params.kind,
          participantId: this.config.participantId,
        });
      },
    });

    // Setup receive transport listeners
    this.socketController.addConsumeTransportListener({
      recvTransport: this.recvTransport,
      onConsume: (params) => {
        this.logger(
          `Consumer created: ${params.id} for producer ${params.producerId}`
        );

        // Note: params here is from the transport listener, which should have track
        // The actual consumer creation with track will be handled in createConsumerOnDemand
        const participantId =
          (params.appData?.participantId as string) || "unknown";

        this.emit("consumerCreated", {
          consumerId: params.id,
          producerId: params.producerId,
          kind: params.kind,
          participantId: participantId,
        });

        // Stream will be created when consumer is actually consumed with track
      },
    });

    // Transport connection events
    this.sendTransport.on("connect", () => {
      this.logger("Send transport connected");
      this.emit("transportConnected", {
        transportId: this.sendTransport!.id,
        direction: "send",
      });
    });

    this.recvTransport.on("connect", () => {
      this.logger("Receive transport connected");
      this.emit("transportConnected", {
        transportId: this.recvTransport!.id,
        direction: "recv",
      });
    });

    // Transport error events
    this.sendTransport.on("connectionstatechange", (state) => {
      this.logger(`Send transport connection state: ${state}`);
      if (state === "failed" || state === "closed") {
        this.emit("transportFailed", {
          transportId: this.sendTransport!.id,
          direction: "send",
          error: new Error(`Transport ${state}`),
        });
      }
    });

    this.recvTransport.on("connectionstatechange", (state) => {
      this.logger(`Receive transport connection state: ${state}`);
      if (state === "failed" || state === "closed") {
        this.emit("transportFailed", {
          transportId: this.recvTransport!.id,
          direction: "recv",
          error: new Error(`Transport ${state}`),
        });
      }
    });
  }

  /**
   * Create consumer on demand when new producer is available
   */
  private async createConsumerOnDemand(
    producerId: string,
    participantInfo?: { participantId: string; participantName: string }
  ): Promise<Consumer | undefined> {
    if (!this.recvTransport) {
      this.logger("Receive transport not available", "warn");
      return;
    }

    try {
      this.logger(`Creating consumer on demand for producer: ${producerId}`);

      const consumerData = await this.socketController.consumeMedia(
        producerId,
        this.device.rtpCapabilities
      );

      if (!consumerData) {
        throw new Error("Failed to get consumer data from server");
      }

      const consumer = await this.recvTransport.consume(consumerData);

      // Store consumer for later reference
      this.consumers.set(consumer.id, consumer);

      // Get participant info from appData or provided parameter
      const participantId =
        participantInfo?.participantId ||
        (consumerData.appData?.participantId as string) ||
        "unknown";
      const participantName =
        participantInfo?.participantName ||
        (consumerData.appData?.participantName as string) ||
        "Unknown Participant";

      this.logger(
        `Consumer created: ${consumer.id} for producer ${producerId} from participant ${participantId}`
      );

      // Create or get existing stream for this participant
      let stream = this.remoteStreams.get(participantId);
      if (!stream) {
        stream = new MediaStream();
        this.remoteStreams.set(participantId, stream);
        this.logger(
          `Created new remote stream for participant: ${participantId}`
        );
      }

      // Add track to stream
      stream.addTrack(consumer.track);
      this.logger(
        `Added ${consumer.track} ${consumer.kind} track to stream for participant: ${participantId}`
      );

      // Listen for various track events
      consumer.track.addEventListener("ended", () => {
        this.logger(
          `Track ended for consumer ${consumer.id} from participant ${participantId}`
        );
      });

      consumer.track.onmute = () => {
        this.logger(
          `Track muted for consumer ${consumer.id} from participant ${participantId}`
        );
      };

      consumer.track.onunmute = () => {
        this.logger(
          `Track unmuted for consumer ${consumer.id} from participant ${participantId}`
        );
      };

      // Unpause consumer after setting up all event handlers and stream
      await this.unpauseConsumer(consumer.id);

      this.logger(
        `Consumer resumed: ${consumer.id} for producer ${producerId} from participant ${participantId}`
      );

      // Wait a brief moment for the track to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Emit remote stream event
      this.emit("remoteStreamAdded", {
        stream: stream,
        participantId: participantId,
        consumerId: consumer.id,
        producerId: producerId,
        kind: consumer.kind,
      });

      // Check if we should emit participant streams ready event
      this.checkAndEmitParticipantStreamsReady(participantId, participantName);

      // Handle consumer close
      consumer.on("@close", () => {
        this.logger(
          `Consumer closed: ${consumer.id} for producer ${producerId}`
        );

        // Remove track from stream
        const track = consumer.track;
        if (track && stream && stream.getTracks().includes(track)) {
          stream.removeTrack(track);
          this.logger(
            `Removed ${consumer.kind} track from stream for participant: ${participantId}`
          );
        }

        // Clean up consumer reference
        this.consumers.delete(consumer.id);

        // If stream has no more tracks, remove it
        if (stream && stream.getTracks().length === 0) {
          this.remoteStreams.delete(participantId);
          this.logger(`Removed empty stream for participant: ${participantId}`);
        }

        // Emit stream removed event
        this.emit("remoteStreamRemoved", {
          participantId: participantId,
          consumerId: consumer.id,
          producerId: producerId,
        });
      });

      return consumer;
    } catch (error) {
      this.logger(
        `Failed to create consumer on demand for producer ${producerId}: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      return undefined;
    }
  }

  /**
   * Enable local media (audio/video) - stateless version
   */
  public async enableMedia(
    audio = true,
    video = true
  ): Promise<MediaStream | undefined> {
    if (!this.sendTransport) {
      throw new Error("Send transport not available");
    }

    try {
      this.logger(`Enabling media - audio: ${audio}, video: ${video}`);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio:
          audio && this.config.enableAudio
            ? this.config.audioConstraints || true
            : false,
        video:
          video && this.config.enableVideo
            ? this.config.videoConstraints || true
            : false,
      });

      this.logger(
        `Got local media stream with ${stream.getTracks().length} tracks`
      );

      // Produce audio if enabled - don't store producer locally
      if (audio && stream.getAudioTracks().length > 0) {
        const audioTrack = stream.getAudioTracks()[0];
        const audioProducer = await this.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
          },
        });

        this.logger(`Audio producer created: ${audioProducer.id}`);
        // Producer creation event will be emitted by transport listener
      }

      // Produce video if enabled - don't store producer locally
      if (video && stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        const videoProducer = await this.sendTransport.produce({
          track: videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
        });

        this.logger(`Video producer created: ${videoProducer.id}`);
        // Producer creation event will be emitted by transport listener
      }

      // Emit local stream ready
      this.emit("localStreamReady", {
        stream: stream,
        participantId: this.config.participantId,
      });

      return stream;
    } catch (error) {
      this.logger(
        `Failed to enable media: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      this.emit("error", {
        error:
          error instanceof Error ? error : new Error("Failed to enable media"),
        context: "enable-media",
      });
      throw error;
    }
  }

  public async consumeParticipantMedia(participantId: string): Promise<any[]> {
    if (!this.recvTransport) {
      throw new Error("Receive transport not available");
    }

    try {
      this.logger(`Consuming media from participant: ${participantId}`);

      const consumerParams =
        await this.socketController.consumeParticipantMedia(
          participantId,
          this.device.rtpCapabilities
        );

      if (!consumerParams || consumerParams.length === 0) {
        this.logger(`No media available from participant: ${participantId}`);
        return [];
      }

      this.logger(
        `Got ${consumerParams.length} consumer params from participant: ${participantId}`
      );
      return consumerParams;
    } catch (error) {
      this.logger(
        `Failed to consume media from participant ${participantId}: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Unpause a consumer after creating it
   */
  public async unpauseConsumer(consumerId: string): Promise<void> {
    try {
      await this.socketController.unpauseConsumer(consumerId);
      this.logger(`Consumer unpaused: ${consumerId}`);
    } catch (error) {
      this.logger(
        `Failed to unpause consumer ${consumerId}: ${error}`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Consume a specific producer - stateless version (delegates to createConsumerOnDemand)
   */
  public async consumeProducer(
    producerId: string,
    participantInfo?: { participantId: string; participantName: string }
  ): Promise<Consumer | undefined> {
    return await this.createConsumerOnDemand(producerId, participantInfo);
  }

  /**
   * Mute/unmute local audio - stateless version (delegates to server)
   */
  public async toggleAudio(mute?: boolean): Promise<boolean> {
    const shouldMute =
      mute !== undefined ? mute : !this.currentParticipant.audioMuted;

    try {
      if (shouldMute && !this.currentParticipant.audioMuted) {
        await this.socketController.muteAudio();
        this.currentParticipant.audioMuted = true;
        this.logger("Audio muted");
      } else if (!shouldMute && this.currentParticipant.audioMuted) {
        await this.socketController.unmuteAudio();
        this.currentParticipant.audioMuted = false;
        this.logger("Audio unmuted");
      }

      return this.currentParticipant.audioMuted;
    } catch (error) {
      this.logger(
        `Failed to toggle audio: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Mute/unmute local video - stateless version (delegates to server)
   */
  public async toggleVideo(mute?: boolean): Promise<boolean> {
    const shouldMute =
      mute !== undefined ? mute : !this.currentParticipant.videoMuted;

    try {
      if (shouldMute && !this.currentParticipant.videoMuted) {
        await this.socketController.muteVideo();
        this.currentParticipant.videoMuted = true;
        this.logger("Video muted");
      } else if (!shouldMute && this.currentParticipant.videoMuted) {
        await this.socketController.unmuteVideo();
        this.currentParticipant.videoMuted = false;
        this.logger("Video unmuted");
      }

      return this.currentParticipant.videoMuted;
    } catch (error) {
      this.logger(
        `Failed to toggle video: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Leave the conference - stateless version
   */
  public async leaveConference(): Promise<void> {
    if (!this.isJoined) {
      this.logger("Not joined to any conference", "warn");
      return;
    }

    try {
      this.logger("Leaving conference (stateless mode)...");

      // Close all consumers
      for (const consumer of this.consumers.values()) {
        consumer.close();
      }
      this.consumers.clear();

      // Clear remote streams
      this.remoteStreams.clear();

      // Close transports (mediasoup client objects)
      this.sendTransport?.close();
      this.recvTransport?.close();

      // Leave conference on server (server will handle all cleanup)
      await this.socketController.leaveConference();

      // Reset only minimal local state
      this.sendTransport = undefined;
      this.recvTransport = undefined;
      this.isJoined = false;

      // Reset current participant state
      this.currentParticipant.audioMuted = false;
      this.currentParticipant.videoMuted = false;

      this.logger("Successfully left conference (stateless mode)");
      this.emit("left", {});
    } catch (error) {
      this.logger(
        `Error leaving conference: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      this.emit("error", {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to leave conference"),
        context: "leave-conference",
      });
    }
  }

  // All event handling is now done in setupSocketEventListeners
  // No local state management needed

  // Type-safe event emitter
  private emit<K extends keyof ConferenceClientEvents>(
    type: K,
    detail: ConferenceClientEvents[K]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Check if all expected streams for a participant are ready and emit event
   */
  private checkAndEmitParticipantStreamsReady(
    participantId: string,
    participantName: string
  ): void {
    const stream = this.remoteStreams.get(participantId);
    if (!stream) return;

    // Get all remote stream data for this participant
    const participantStreams = this.getRemoteStreams().filter(
      (streamData) => streamData.participantId === participantId
    );

    if (participantStreams.length > 0) {
      this.emit("participantStreamsReady", {
        participantId,
        participantName,
        streams: participantStreams,
      });
    }
  }

  // Public getters - stateless versions
  public async getParticipants(): Promise<ParticipantInfo[]> {
    // Delegate to server for all participant data
    return this.socketController.getParticipants();
  }
  public async getProducersWithParticipantId(participantId: string) {
    return await this.socketController.getProducersWithParticipantId(
      participantId
    );
  }
  public getCurrentParticipant(): ParticipantInfo {
    return { ...this.currentParticipant };
  }

  public isAudioMuted(): boolean {
    return this.currentParticipant.audioMuted;
  }

  public isVideoMuted(): boolean {
    return this.currentParticipant.videoMuted;
  }

  public isJoinedToConference(): boolean {
    return this.isJoined;
  }

  public getDevice(): Device {
    return this.device;
  }

  public getSocketController(): SocketClientController {
    return this.socketController;
  }

  /**
   * Get all remote streams currently available
   */
  public getRemoteStreams(): RemoteStreamData[] {
    const streamData: RemoteStreamData[] = [];

    for (const [participantId, stream] of this.remoteStreams.entries()) {
      const tracks: RemoteStreamData["tracks"] = [];

      // Find consumers for this participant's tracks
      for (const [consumerId, consumer] of this.consumers.entries()) {
        const consumerParticipantId =
          (consumer.appData?.participantId as string) || participantId;

        if (
          consumerParticipantId === participantId &&
          stream.getTracks().includes(consumer.track)
        ) {
          tracks.push({
            producerId: (consumer.appData?.producerId as string) || "unknown",
            consumerId: consumerId,
            kind: consumer.kind,
            track: consumer.track,
          });
        }
      }

      if (tracks.length > 0) {
        streamData.push({
          participantId,
          participantName:
            (this.consumers.values().next().value?.appData
              ?.participantName as string) || "Unknown Participant",
          stream,
          tracks,
        });
      }
    }

    return streamData;
  }

  /**
   * Get remote stream for specific participant
   */
  public getRemoteStreamForParticipant(
    participantId: string
  ): MediaStream | undefined {
    return this.remoteStreams.get(participantId);
  }

  // No state validation needed in stateless mode
  // All state is managed by the server

  /**
   * Start screen sharing - stateless version
   */
  public async startScreenShare(): Promise<MediaStream | undefined> {
    if (!this.sendTransport) {
      throw new Error("Send transport not available");
    }

    try {
      this.logger("Starting screen share (stateless mode)...");

      // Get screen media
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Include system audio if possible
      });

      this.logger(
        `Got screen share stream with ${stream.getTracks().length} tracks`
      );

      // Produce screen share video - don't store producer locally
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const screenProducer = await this.sendTransport.produce({
          track: videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
          appData: {
            screenShare: true,
          },
        });

        this.logger(`Screen share producer created: ${screenProducer.id}`);

        // Handle screen share end - just close producer, server will handle cleanup
        videoTrack.onended = () => {
          this.logger("Screen share ended");
          screenProducer.close();
        };
      }

      // Produce screen share audio if available - don't store producer locally
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const screenAudioProducer = await this.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
          },
          appData: {
            screenShare: true,
          },
        });

        this.logger(
          `Screen share audio producer created: ${screenAudioProducer.id}`
        );

        // Handle screen share end - just close producer, server will handle cleanup
        audioTrack.onended = () => {
          this.logger("Screen share audio ended");
          screenAudioProducer.close();
        };
      }

      return stream;
    } catch (error) {
      this.logger(
        `Failed to start screen share: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      this.emit("error", {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to start screen share"),
        context: "start-screen-share",
      });
      throw error;
    }
  }
}

export default ConferenceClient;
