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
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  audioMuted: boolean;
  videoMuted: boolean;
}

export interface MediaState {
  audioProducerId?: string;
  videoProducerId?: string;
  audioMuted: boolean;
  videoMuted: boolean;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

/**
 * ConferenceClient - Comprehensive MediaSoup client with full event orchestration
 *
 * This is the main client that handles all MediaSoup operations:
 * - Device management
 * - Transport creation and management
 * - Producer/Consumer lifecycle
 * - Media stream handling
 * - Participant management
 * - Complete event system with proper logging
 */
export class ConferenceClient extends EventTarget {
  private config: ConferenceClientConfig;
  private socketController: SocketClientController;
  private device: Device;
  private sendTransport?: Transport;
  private recvTransport?: Transport;
  private mediaState: MediaState;
  private participants: Map<string, ParticipantInfo>;
  private localStream?: MediaStream;
  private remoteStreams: Map<string, MediaStream>;
  private isJoined = false;
  private logger: (message: string, level?: "info" | "warn" | "error") => void;

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

    // Initialize state
    this.mediaState = {
      audioMuted: false,
      videoMuted: false,
      producers: new Map(),
      consumers: new Map(),
    };

    this.participants = new Map();
    this.remoteStreams = new Map();

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
    this.logger("ConferenceClient initialized");
  }

  /**
   * Setup all socket event listeners with proper logging
   */
  private setupSocketEventListeners(): void {
    this.logger("Setting up socket event listeners");

    // Setup socket controller event listeners first
    this.socketController.setupEventListeners();

    // Participant events
    this.socketController.addEventListener(
      "participantJoined",
      (event: any) => {
        const { participantId, participantName } = event.detail;
        this.logger(
          `Participant joined: ${participantName} (${participantId})`
        );
        this.handleParticipantJoined(participantId, participantName);
      }
    );

    this.socketController.addEventListener("participantLeft", (event: any) => {
      const { participantId, participantName } = event.detail;
      this.logger(`Participant left: ${participantName} (${participantId})`);
      this.handleParticipantLeft(participantId, participantName);
    });

    // Producer events
    this.socketController.addEventListener("newProducer", (event: any) => {
      const { producerId, participantId, kind } = event.detail;
      this.logger(
        `New producer available: ${producerId} (${kind}) from ${participantId}`
      );
      this.handleNewProducer(producerId, participantId, kind);
    });

    this.socketController.addEventListener("producerClosed", (event: any) => {
      const { producerId, participantId, kind } = event.detail;
      this.logger(
        `Producer closed: ${producerId} (${kind}) from ${participantId}`
      );
      this.handleProducerClosed(producerId, participantId, kind);
    });

    // Consumer events
    this.socketController.addEventListener("consumerClosed", (event: any) => {
      const { consumerId, producerId, participantId } = event.detail;
      this.logger(
        `Consumer closed: ${consumerId} for producer ${producerId} from ${participantId}`
      );
      this.handleConsumerClosed(consumerId, producerId, participantId);
    });

    // Media state events
    this.socketController.addEventListener("audioMuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Audio muted by participant: ${participantId}`);
      this.handleAudioMuted(participantId, false);
    });

    this.socketController.addEventListener("audioUnmuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Audio unmuted by participant: ${participantId}`);
      this.handleAudioUnmuted(participantId, false);
    });

    this.socketController.addEventListener("videoMuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Video muted by participant: ${participantId}`);
      this.handleVideoMuted(participantId, false);
    });

    this.socketController.addEventListener("videoUnmuted", (event: any) => {
      const { participantId } = event.detail;
      this.logger(`Video unmuted by participant: ${participantId}`);
      this.handleVideoUnmuted(participantId, false);
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
   * Join the conference
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

      // Add local participant
      this.participants.set(this.config.participantId, {
        participantId: this.config.participantId,
        participantName: this.config.participantName,
        isLocal: true,
        producers: new Map(),
        consumers: new Map(),
        audioMuted: false,
        videoMuted: false,
      });

      this.isJoined = true;
      this.logger("Successfully joined conference");

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
   * Setup transport event listeners
   */
  private setupTransportListeners(): void {
    if (!this.sendTransport || !this.recvTransport) {
      throw new Error("Transports not initialized");
    }

    this.logger("Setting up transport listeners");

    // Setup send transport listeners
    this.socketController.addSendTransportListener({
      sendTransport: this.sendTransport,
      onProduce: (params) => {
        this.logger(`Producer created: ${params.producerId} (${params.kind})`);
        // The producer object should already be in mediaState.producers from enableMedia()
        this.handleProducerCreatedCallback(params);
      },
    });

    // Setup receive transport listeners
    this.socketController.addConsumeTransportListener({
      recvTransport: this.recvTransport,
      onConsume: (params) => {
        this.logger(`onConsume param: ${params}`);
        this.logger(`Consumer params: ${JSON.stringify(params, null, 2)}`);
        this.handleConsumerCreated(params);
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
   * Enable local media (audio/video)
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

      this.localStream = stream;
      this.logger(
        `Got local media stream with ${stream.getTracks().length} tracks`
      );

      // Produce audio if enabled
      if (audio && stream.getAudioTracks().length > 0) {
        const audioTrack = stream.getAudioTracks()[0];
        const audioProducer = await this.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
          },
        });

        // Store producer in media state
        this.mediaState.producers.set(audioProducer.id, audioProducer);
        this.mediaState.audioProducerId = audioProducer.id;

        // Store producer in local participant
        const localParticipant = this.participants.get(
          this.config.participantId
        );
        if (localParticipant) {
          localParticipant.producers.set(audioProducer.id, audioProducer);
        }

        this.logger(`Audio producer created: ${audioProducer.id}`);
      }

      // Produce video if enabled
      if (video && stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        const videoProducer = await this.sendTransport.produce({
          track: videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
        });

        // Store producer in media state
        this.mediaState.producers.set(videoProducer.id, videoProducer);
        this.mediaState.videoProducerId = videoProducer.id;

        // Store producer in local participant
        const localParticipant = this.participants.get(
          this.config.participantId
        );
        if (localParticipant) {
          localParticipant.producers.set(videoProducer.id, videoProducer);
        }

        this.logger(`Video producer created: ${videoProducer.id}`);
      }

      this.emit("localStreamReady", {
        stream: this.localStream,
        participantId: this.config.participantId,
      });

      return this.localStream;
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

  /**
   * Consume existing producers (for participants already in the conference)
   */
  public async consumeExistingProducers(): Promise<void> {
    try {
      this.logger("Consuming existing producers...");

      const existingProducerIds = await this.socketController.getProducers();
      if (!existingProducerIds || existingProducerIds.length === 0) {
        this.logger("No existing producers to consume");
        return;
      }

      this.logger(`Found ${existingProducerIds.length} existing producers`);

      // Filter out producers we're already consuming
      const unconsumedProducers = existingProducerIds.filter((producerId) => {
        const alreadyConsuming = Array.from(
          this.mediaState.consumers.values()
        ).some((c) => c.producerId === producerId);
        if (alreadyConsuming) {
          this.logger(`Already consuming producer ${producerId}, skipping`);
        }
        return !alreadyConsuming;
      });

      this.logger(`${unconsumedProducers.length} new producers to consume`);

      for (const producerId of unconsumedProducers) {
        try {
          await this.consumeProducer(producerId);
        } catch (error) {
          this.logger(
            `Failed to consume individual producer ${producerId}: ${
              error instanceof Error ? error.message : error
            }`,
            "error"
          );
          // Continue with other producers instead of failing completely
        }
      }

      this.logger(
        `Finished consuming existing producers. Total consumers: ${this.mediaState.consumers.size}`
      );
    } catch (error) {
      this.logger(
        `Failed to consume existing producers: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      this.emit("error", {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to consume existing producers"),
        context: "consume-existing",
      });
    }
  }

  /**
   * Consume a specific producer
   */
  public async consumeProducer(producerId: string): Promise<void> {
    if (!this.recvTransport) {
      throw new Error("Receive transport not available");
    }

    try {
      this.logger(`Consuming producer: ${producerId}`);

      // Check if we already have a consumer for this producer
      const existingConsumer = Array.from(
        this.mediaState.consumers.values()
      ).find((c) => c.producerId === producerId);

      if (existingConsumer) {
        this.logger(
          `Consumer already exists for producer ${producerId}, skipping`,
          "warn"
        );
        return;
      }

      const consumerData = await this.socketController.consumeMedia(
        producerId,
        this.device.rtpCapabilities
      );

      if (!consumerData) {
        throw new Error("Failed to get consumer data from server");
      }

      const consumer = await this.recvTransport.consume(consumerData);

      // Store consumer in media state
      this.mediaState.consumers.set(consumer.id, consumer);

      // Resume consumer
      await consumer.resume();

      this.logger(
        `Consumer created and resumed: ${consumer.id} for producer ${producerId}`
      );

      // Note: consumerCreated and remoteStreamAdded events are emitted by handleConsumerCreated
      // which is called from the transport listener during consumer creation
    } catch (error) {
      this.logger(
        `Failed to consume producer ${producerId}: ${
          error instanceof Error ? error.message : error
        }`,
        "error"
      );
      this.emit("error", {
        error:
          error instanceof Error
            ? error
            : new Error(`Failed to consume producer ${producerId}`),
        context: "consume-producer",
      });
    }
  }

  /**
   * Mute/unmute local audio
   */
  public async toggleAudio(mute?: boolean): Promise<boolean> {
    if (!this.mediaState.audioProducerId) {
      this.logger("No audio producer to toggle", "warn");
      return false;
    }

    const producer = this.mediaState.producers.get(
      this.mediaState.audioProducerId
    );
    if (!producer) {
      this.logger("Audio producer not found", "warn");
      return false;
    }

    const shouldMute = mute !== undefined ? mute : !this.mediaState.audioMuted;

    try {
      if (shouldMute && !this.mediaState.audioMuted) {
        producer.pause();
        await this.socketController.muteAudio();
        this.mediaState.audioMuted = true;
        this.logger("Audio muted");
        this.handleAudioMuted(this.config.participantId, true);
      } else if (!shouldMute && this.mediaState.audioMuted) {
        producer.resume();
        await this.socketController.unmuteAudio();
        this.mediaState.audioMuted = false;
        this.logger("Audio unmuted");
        this.handleAudioUnmuted(this.config.participantId, true);
      }

      return this.mediaState.audioMuted;
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
   * Mute/unmute local video
   */
  public async toggleVideo(mute?: boolean): Promise<boolean> {
    if (!this.mediaState.videoProducerId) {
      this.logger("No video producer to toggle", "warn");
      return false;
    }

    const producer = this.mediaState.producers.get(
      this.mediaState.videoProducerId
    );
    if (!producer) {
      this.logger("Video producer not found", "warn");
      return false;
    }

    const shouldMute = mute !== undefined ? mute : !this.mediaState.videoMuted;

    try {
      if (shouldMute && !this.mediaState.videoMuted) {
        producer.pause();
        await this.socketController.muteVideo();
        this.mediaState.videoMuted = true;
        this.logger("Video muted");
        this.handleVideoMuted(this.config.participantId, true);
      } else if (!shouldMute && this.mediaState.videoMuted) {
        producer.resume();
        await this.socketController.unmuteVideo();
        this.mediaState.videoMuted = false;
        this.logger("Video unmuted");
        this.handleVideoUnmuted(this.config.participantId, true);
      }

      return this.mediaState.videoMuted;
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
   * Leave the conference
   */
  public async leaveConference(): Promise<void> {
    if (!this.isJoined) {
      this.logger("Not joined to any conference", "warn");
      return;
    }

    try {
      this.logger("Leaving conference...");

      // Close all producers
      for (const producer of this.mediaState.producers.values()) {
        producer.close();
      }

      // Close all consumers
      for (const consumer of this.mediaState.consumers.values()) {
        consumer.close();
      }

      // Close transports
      this.sendTransport?.close();
      this.recvTransport?.close();

      // Stop local media
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }

      // Leave conference on server
      await this.socketController.leaveConference();

      // Clear all state thoroughly
      this.mediaState.producers.clear();
      this.mediaState.consumers.clear();
      this.mediaState.audioProducerId = undefined;
      this.mediaState.videoProducerId = undefined;
      this.mediaState.audioMuted = false;
      this.mediaState.videoMuted = false;

      // Clear participants and their producer/consumer maps
      for (const participant of this.participants.values()) {
        participant.producers.clear();
        participant.consumers.clear();
      }
      this.participants.clear();

      this.remoteStreams.clear();

      this.localStream = undefined;
      this.sendTransport = undefined;
      this.recvTransport = undefined;
      this.isJoined = false;

      this.logger("Successfully left conference - all state cleared");
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

  // Event handlers
  private handleProducerCreatedCallback(params: {
    kind: "audio" | "video";
    rtpParameters: any;
    appData: any;
    producerId: string;
  }): void {
    this.logger(`Producer callback: ${params.producerId} (${params.kind})`);

    // Verify the producer exists in our state
    const producer = this.mediaState.producers.get(params.producerId);
    if (!producer) {
      this.logger(
        `Producer ${params.producerId} not found in local state`,
        "warn"
      );
      return;
    }

    // Update producer ID mappings if needed
    if (params.kind === "audio" && !this.mediaState.audioProducerId) {
      this.mediaState.audioProducerId = params.producerId;
    } else if (params.kind === "video" && !this.mediaState.videoProducerId) {
      this.mediaState.videoProducerId = params.producerId;
    }

    this.emit("producerCreated", {
      producerId: params.producerId,
      kind: params.kind,
      participantId: this.config.participantId,
    });
  }

  private handleParticipantJoined(
    participantId: string,
    participantName: string
  ): void {
    // Avoid adding duplicate participants
    if (this.participants.has(participantId)) {
      this.logger(
        `Participant ${participantId} already exists, skipping`,
        "warn"
      );
      return;
    }

    this.participants.set(participantId, {
      participantId: participantId,
      participantName: participantName,
      isLocal: false,
      producers: new Map(),
      consumers: new Map(),
      audioMuted: false,
      videoMuted: false,
    });

    this.emit("participantJoined", { participantId, participantName });
  }

  private handleParticipantLeft(
    participantId: string,
    participantName: string
  ): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      // Clean up all consumers for this participant
      for (const [consumerId, consumer] of participant.consumers.entries()) {
        consumer.close();
        this.mediaState.consumers.delete(consumerId);
        this.remoteStreams.delete(consumerId);
        this.logger(
          `Cleaned up consumer ${consumerId} for leaving participant ${participantId}`
        );
      }

      // Clean up all producers for this participant (shouldn't happen for remote participants, but just in case)
      for (const [producerId, producer] of participant.producers.entries()) {
        // Note: We don't close remote producers, just remove them from our tracking
        this.logger(
          `Removed producer ${producerId} tracking for leaving participant ${participantId}`
        );
      }

      this.participants.delete(participantId);
      this.logger(`Participant ${participantId} fully cleaned up`);
    }

    this.emit("participantLeft", { participantId, participantName });
  }

  private async handleNewProducer(
    producerId: string,
    participantId: string,
    kind: MediaKind
  ): Promise<void> {
    // Auto-consume new producers
    console.log("consuming new producers ", producerId, "kind ", kind);

    await this.consumeProducer(producerId);
  }

  private handleProducerClosed(
    producerId: string,
    participantId: string,
    kind: MediaKind
  ): void {
    // Remove producer from participant's producer map
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.producers.delete(producerId);
      this.logger(
        `Producer ${producerId} removed from participant ${participantId}`
      );
    }

    // Remove producer from local media state if it's our producer
    if (participantId === this.config.participantId) {
      this.mediaState.producers.delete(producerId);
      if (this.mediaState.audioProducerId === producerId) {
        this.mediaState.audioProducerId = undefined;
      }
      if (this.mediaState.videoProducerId === producerId) {
        this.mediaState.videoProducerId = undefined;
      }
    }

    // Find and close related consumers
    const consumersToClose: string[] = [];
    for (const [consumerId, consumer] of this.mediaState.consumers.entries()) {
      if (consumer.producerId === producerId) {
        consumersToClose.push(consumerId);
      }
    }

    consumersToClose.forEach((consumerId) => {
      const consumer = this.mediaState.consumers.get(consumerId);
      if (consumer) {
        consumer.close();
        this.mediaState.consumers.delete(consumerId);
        this.remoteStreams.delete(consumerId);

        // Remove from participant's consumer map
        if (participant) {
          participant.consumers.delete(consumerId);
        }

        this.emit("remoteStreamRemoved", {
          participantId,
          consumerId,
          producerId,
        });
      }
    });

    this.emit("producerClosed", { producerId, kind, participantId });
  }

  private handleConsumerClosed(
    consumerId: string,
    producerId: string,
    participantId: string
  ): void {
    const consumer = this.mediaState.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.mediaState.consumers.delete(consumerId);
      this.remoteStreams.delete(consumerId);

      // Remove from participant's consumer map
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.consumers.delete(consumerId);
        this.logger(
          `Consumer ${consumerId} removed from participant ${participantId}`
        );
      }

      this.emit("remoteStreamRemoved", {
        participantId,
        consumerId,
        producerId,
      });
    }

    this.emit("consumerClosed", { consumerId, producerId, participantId });
  }

  private handleConsumerCreated(params: any): void {
    this.logger(
      `Handling consumer created: ${params.id} for producer ${params.producerId}`
    );

    // Check if we already have this consumer
    if (this.remoteStreams.has(params.id)) {
      this.logger(
        `Consumer stream ${params.id} already exists, skipping`,
        "warn"
      );
      return;
    }

    // Get the actual consumer object from the media state
    const consumer = this.mediaState.consumers.get(params.id);
    if (!consumer) {
      this.logger(`Consumer ${params.id} not found in media state`, "error");
      return;
    }

    // Create media stream
    const stream = new MediaStream([params.track]);
    this.remoteStreams.set(params.id, stream);

    // Get participant ID from appData - check multiple possible fields
    const participantId =
      (params.appData?.participantId as string) ||
      (params.appData?.producerUserId as string) ||
      (params.producerUserId as string) ||
      "unknown";

    // Store consumer in the appropriate participant
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.consumers.set(params.id, consumer);
      this.logger(
        `Consumer ${params.id} stored for participant ${participantId}`
      );
    } else {
      this.logger(
        `Participant ${participantId} not found, consumer ${params.id} stored in media state only`,
        "warn"
      );
    }

    this.logger(
      `Consumer stream ready: ${params.id} from participant ${participantId}`
    );

    // Emit consumerCreated event
    this.emit("consumerCreated", {
      consumerId: params.id,
      producerId: params.producerId,
      kind: params.kind,
      participantId: participantId,
    });

    // Emit remoteStreamAdded event
    this.emit("remoteStreamAdded", {
      stream: stream,
      participantId: participantId,
      consumerId: params.id,
      producerId: params.producerId,
      kind: params.kind,
    });
  }

  private handleAudioMuted(participantId: string, isLocal: boolean): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.audioMuted = true;
    }
    this.emit("audioMuted", { participantId, isLocal });
  }

  private handleAudioUnmuted(participantId: string, isLocal: boolean): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.audioMuted = false;
    }
    this.emit("audioUnmuted", { participantId, isLocal });
  }

  private handleVideoMuted(participantId: string, isLocal: boolean): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.videoMuted = true;
    }
    this.emit("videoMuted", { participantId, isLocal });
  }

  private handleVideoUnmuted(participantId: string, isLocal: boolean): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.videoMuted = false;
    }
    this.emit("videoUnmuted", { participantId, isLocal });
  }

  // Type-safe event emitter
  private emit<K extends keyof ConferenceClientEvents>(
    type: K,
    detail: ConferenceClientEvents[K]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // Public getters
  public getLocalStream(): MediaStream | undefined {
    return this.localStream;
  }

  public getRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  public getParticipants(): Promise<ParticipantInfo[]> {
    return this.socketController.getParticipants();
  }

  public getMediaState(): MediaState {
    return { ...this.mediaState };
  }

  public isAudioMuted(): boolean {
    return this.mediaState.audioMuted;
  }

  public isVideoMuted(): boolean {
    return this.mediaState.videoMuted;
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
   * Get detailed state information for debugging
   */
  public getDetailedState(): {
    mediaState: MediaState;
    participants: ParticipantInfo[];
    remoteStreams: { [consumerId: string]: MediaStream };
    isJoined: boolean;
  } {
    return {
      mediaState: { ...this.mediaState },
      participants: Array.from(this.participants.values()),
      remoteStreams: Object.fromEntries(this.remoteStreams.entries()),
      isJoined: this.isJoined,
    };
  }

  /**
   * Validate and sync state consistency
   */
  public validateState(): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check if producers in mediaState match participant producers
    const localParticipant = this.participants.get(this.config.participantId);
    if (localParticipant) {
      for (const [
        producerId,
        producer,
      ] of this.mediaState.producers.entries()) {
        if (!localParticipant.producers.has(producerId)) {
          issues.push(
            `Producer ${producerId} in mediaState but not in local participant`
          );
        }
      }

      for (const [producerId] of localParticipant.producers.entries()) {
        if (!this.mediaState.producers.has(producerId)) {
          issues.push(
            `Producer ${producerId} in local participant but not in mediaState`
          );
        }
      }
    }

    // Check if consumers in mediaState have corresponding remote streams
    for (const [consumerId] of this.mediaState.consumers.entries()) {
      if (!this.remoteStreams.has(consumerId)) {
        issues.push(
          `Consumer ${consumerId} in mediaState but no corresponding remote stream`
        );
      }
    }

    // Check if remote streams have corresponding consumers
    for (const [consumerId] of this.remoteStreams.entries()) {
      if (!this.mediaState.consumers.has(consumerId)) {
        issues.push(
          `Remote stream ${consumerId} exists but no corresponding consumer in mediaState`
        );
      }
    }

    // Check producer ID consistency
    if (
      this.mediaState.audioProducerId &&
      !this.mediaState.producers.has(this.mediaState.audioProducerId)
    ) {
      issues.push(
        `Audio producer ID ${this.mediaState.audioProducerId} not found in producers map`
      );
    }

    if (
      this.mediaState.videoProducerId &&
      !this.mediaState.producers.has(this.mediaState.videoProducerId)
    ) {
      issues.push(
        `Video producer ID ${this.mediaState.videoProducerId} not found in producers map`
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Sync and fix state inconsistencies
   */
  public syncState(): void {
    this.logger("Syncing state...");

    const localParticipant = this.participants.get(this.config.participantId);

    if (localParticipant) {
      // Sync producers: ensure all mediaState producers are in local participant
      for (const [
        producerId,
        producer,
      ] of this.mediaState.producers.entries()) {
        if (!localParticipant.producers.has(producerId)) {
          localParticipant.producers.set(producerId, producer);
          this.logger(`Synced producer ${producerId} to local participant`);
        }
      }

      // Remove producers from local participant that are not in mediaState
      for (const [producerId] of localParticipant.producers.entries()) {
        if (!this.mediaState.producers.has(producerId)) {
          localParticipant.producers.delete(producerId);
          this.logger(
            `Removed stale producer ${producerId} from local participant`
          );
        }
      }
    }

    // Remove remote streams without corresponding consumers
    for (const [consumerId] of this.remoteStreams.entries()) {
      if (!this.mediaState.consumers.has(consumerId)) {
        this.remoteStreams.delete(consumerId);
        this.logger(`Removed stale remote stream ${consumerId}`);
      }
    }

    // Validate producer IDs
    if (
      this.mediaState.audioProducerId &&
      !this.mediaState.producers.has(this.mediaState.audioProducerId)
    ) {
      this.mediaState.audioProducerId = undefined;
      this.logger("Reset invalid audio producer ID");
    }

    if (
      this.mediaState.videoProducerId &&
      !this.mediaState.producers.has(this.mediaState.videoProducerId)
    ) {
      this.mediaState.videoProducerId = undefined;
      this.logger("Reset invalid video producer ID");
    }

    this.logger("State sync completed");
  }

  /**
   * Start screen sharing
   */
  public async startScreenShare(): Promise<MediaStream | undefined> {
    if (!this.sendTransport) {
      throw new Error("Send transport not available");
    }

    try {
      this.logger("Starting screen share...");

      // Get screen media
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Include system audio if possible
      });

      this.logger(
        `Got screen share stream with ${stream.getTracks().length} tracks`
      );

      // Produce screen share video
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

        this.mediaState.producers.set(screenProducer.id, screenProducer);
        this.logger(`Screen share producer created: ${screenProducer.id}`);

        // Handle screen share end
        videoTrack.onended = () => {
          this.logger("Screen share ended");
          screenProducer.close();
          this.mediaState.producers.delete(screenProducer.id);
        };
      }

      // Produce screen share audio if available
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

        this.mediaState.producers.set(
          screenAudioProducer.id,
          screenAudioProducer
        );
        this.logger(
          `Screen share audio producer created: ${screenAudioProducer.id}`
        );

        // Handle screen share end
        audioTrack.onended = () => {
          this.logger("Screen share audio ended");
          screenAudioProducer.close();
          this.mediaState.producers.delete(screenAudioProducer.id);
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
