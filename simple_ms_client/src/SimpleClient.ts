import { ClientSocket } from "@simple-mediasoup/types";
import { SocketClientController } from "./controller/SocketClientController";
import MediasoupClient, {
  MediasoupClientConfig,
} from "./mediasoup/MediasoupClient";
import EventOrchestrator, {
  EventOrchestratorConfig,
} from "./EventOrchestrator";
import { WebRtcTransportOptions } from "mediasoup/types";

// Simple, easy-to-use types
export interface SimpleClientConfig {
  serverUrl: string;
  iceServers?: RTCIceServer[];
  enableAudio?: boolean;
  enableVideo?: boolean;
  autoConsume?: boolean; // Automatically consume remote streams
  eventOrchestrator?: EventOrchestratorConfig; // Event orchestrator configuration
}

export interface ParticipantInfo {
  id: string;
  name: string;
  isLocal?: boolean;
}

export interface StreamInfo {
  participantId: string;
  streamId: string;
  stream: MediaStream;
  type: "audio" | "video" | "screen";
}

export interface ConnectionInfo {
  conferenceId: string;
  participantId: string;
  participantName: string;
  isConnected: boolean;
}

// Event types for better type safety
export interface SimpleClientEvents {
  // Connection events
  connected: { connection: ConnectionInfo };
  disconnected: { reason?: string };
  reconnecting: {};
  error: { error: Error; code?: string };

  // Participant events
  participantJoined: { participant: ParticipantInfo };
  participantLeft: { participant: ParticipantInfo };

  // Media events
  localStreamReady: { stream: MediaStream };
  remoteStreamAdded: { stream: StreamInfo };
  remoteStreamRemoved: { streamId: string; participantId: string };

  // Audio/Video state events
  audioMuted: { participantId: string; isLocal: boolean };
  audioUnmuted: { participantId: string; isLocal: boolean };
  videoMuted: { participantId: string; isLocal: boolean };
  videoUnmuted: { participantId: string; isLocal: boolean };

  // Screen sharing events
  screenShareStarted: { participantId: string; stream?: MediaStream };
  screenShareStopped: { participantId: string };

  // Network events
  connectionQualityChanged: {
    participantId: string;
    quality: "excellent" | "good" | "poor" | "disconnected";
  };
}

/**
 * SimpleClient - A high-level, easy-to-use WebRTC client abstraction
 *
 * Features:
 * - Simple setup with minimal configuration
 * - Event-driven architecture
 * - Automatic stream management
 * - Built-in error handling
 * - Screen sharing support
 */
export class SimpleClient extends EventTarget {
  private config: SimpleClientConfig;
  private socket?: ClientSocket;
  private socketController?: SocketClientController;
  private mediasoupClient?: MediasoupClient;
  private eventOrchestrator: EventOrchestrator;
  private connectionInfo?: ConnectionInfo;
  private participants: Map<string, ParticipantInfo> = new Map();
  private remoteStreams: Map<string, StreamInfo> = new Map();
  private localStream?: MediaStream;
  private isInitialized = false;

  constructor(config: SimpleClientConfig) {
    super();
    this.config = {
      enableAudio: true,
      enableVideo: true,
      autoConsume: true,
      ...config,
    };

    // Initialize event orchestrator
    this.eventOrchestrator = new EventOrchestrator({
      enableDebugLogging: true, // Enable for debugging
      logEventDetails: true,
      maxEventHistory: 50,
      ...config.eventOrchestrator,
    });

    // Setup orchestrator error handling
    this.eventOrchestrator.addEventListener(
      "orchestratorError",
      (event: any) => {
        console.error("Event orchestrator error:", event.detail);
        this.emit("error", {
          error: event.detail.error,
          code: "EVENT_ORCHESTRATOR_ERROR",
        });
      }
    );
  }

  /**
   * Initialize and connect to the conference
   */
  async connect(
    conferenceId: string,
    participantName: string,
    participantId?: string,
    webRtcTransportOptions?: WebRtcTransportOptions
  ): Promise<void> {
    console.log("trying to connect ", conferenceId, participantName);

    try {
      if (this.isInitialized) {
        throw new Error("Client is already connected");
      }

      // Generate participant ID if not provided
      const finalParticipantId = participantId || this.generateParticipantId();

      // Import socket.io-client dynamically
      const { io } = await import("socket.io-client");

      // Connect to server
      this.socket = io(this.config.serverUrl) as unknown as ClientSocket;

      console.log("Connecting to server:", this.config.serverUrl);

      // Wait for socket connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        // Cast to any to access socket.io client methods
        const socketAny = this.socket as any;
        this.connectionInfo = {
          conferenceId,
          participantId: finalParticipantId,
          participantName,
          isConnected: true,
        };

        socketAny.on("connect", () => {
          clearTimeout(timeout);
          resolve();
        });

        socketAny.on("connect_error", (error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Initialize controllers
      this.socketController = new SocketClientController(this.socket, {
        conferenceId,
        participantId: finalParticipantId,
        participantName,
        conferenceName: conferenceId,
        socketId: this.socket.id || "",
        webRtcTransportOptions,
      });

      this.mediasoupClient = new MediasoupClient(this.socketController, {
        iceServers: this.config.iceServers,
        enableAudio: this.config.enableAudio,
        enableVideo: this.config.enableVideo,
      });

      // // Setup event listeners
      this.setupEventListeners();
      try {
        // Join conference
        const joinResponse = await this.mediasoupClient.joinConference();

        console.log("this is the response ", joinResponse);
      } catch (error) {
        console.error("Failed to join conference:", error);
      }

      // Add local participant
      this.participants.set(finalParticipantId, {
        id: finalParticipantId,
        name: participantName,
        isLocal: true,
      });

      this.isInitialized = true;

      console.log("event is emitted ", this.connectionInfo);

      // Emit connected event
      this.emit("connected", { connection: this.connectionInfo });

      // Auto-enable media if configured
      if (this.config.enableAudio || this.config.enableVideo) {
        await this.enableMedia(
          this.config.enableAudio,
          this.config.enableVideo
        );
      }

      // Auto-consume existing participants if configured
      if (this.config.autoConsume) {
        await this.consumeExistingStreams();
      }
    } catch (error) {
      console.error("Connection failed:", error);
      this.emit("error", {
        error:
          error instanceof Error
            ? error
            : new Error("Unknown connection error"),
        code: "CONNECTION_FAILED",
      });
      throw error;
    }
  }

  /**
   * Enable local audio/video
   */
  async enableMedia(
    audio = true,
    video = true
  ): Promise<MediaStream | undefined> {
    try {
      if (!this.mediasoupClient) {
        throw new Error("Client not connected");
      }

      await this.mediasoupClient.enableMedia(audio, video);
      this.localStream = this.mediasoupClient.getLocalStream();

      if (this.localStream) {
        this.emit("localStreamReady", { stream: this.localStream });
      }

      return this.localStream;
    } catch (error) {
      console.error("Failed to enable media:", error);
      this.emit("error", {
        error:
          error instanceof Error ? error : new Error("Failed to enable media"),
        code: "MEDIA_ACCESS_FAILED",
      });
      throw error;
    }
  }

  /**
   * Mute/unmute local audio
   */
  async toggleAudio(mute?: boolean): Promise<boolean> {
    if (!this.mediasoupClient || !this.connectionInfo) return false;

    try {
      const currentlyMuted = this.mediasoupClient.isAudioMuted();
      const shouldMute = mute !== undefined ? mute : !currentlyMuted;

      if (shouldMute && !currentlyMuted) {
        await this.mediasoupClient.muteAudio();
        this.emit("audioMuted", {
          participantId: this.connectionInfo.participantId,
          isLocal: true,
        });
      } else if (!shouldMute && currentlyMuted) {
        await this.mediasoupClient.unmuteAudio();
        this.emit("audioUnmuted", {
          participantId: this.connectionInfo.participantId,
          isLocal: true,
        });
      }

      return this.mediasoupClient.isAudioMuted();
    } catch (error) {
      console.error("Failed to toggle audio:", error);
      this.emit("error", {
        error:
          error instanceof Error ? error : new Error("Failed to toggle audio"),
        code: "AUDIO_TOGGLE_FAILED",
      });
      return false;
    }
  }

  /**
   * Mute/unmute local video
   */
  async toggleVideo(mute?: boolean): Promise<boolean> {
    if (!this.mediasoupClient || !this.connectionInfo) return false;

    try {
      const currentlyMuted = this.mediasoupClient.isVideoMuted();
      const shouldMute = mute !== undefined ? mute : !currentlyMuted;

      if (shouldMute && !currentlyMuted) {
        await this.mediasoupClient.muteVideo();
        this.emit("videoMuted", {
          participantId: this.connectionInfo.participantId,
          isLocal: true,
        });
      } else if (!shouldMute && currentlyMuted) {
        await this.mediasoupClient.unmuteVideo();
        this.emit("videoUnmuted", {
          participantId: this.connectionInfo.participantId,
          isLocal: true,
        });
      }

      return this.mediasoupClient.isVideoMuted();
    } catch (error) {
      console.error("Failed to toggle video:", error);
      this.emit("error", {
        error:
          error instanceof Error ? error : new Error("Failed to toggle video"),
        code: "VIDEO_TOGGLE_FAILED",
      });
      return false;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream | undefined> {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen sharing not supported");
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // TODO: Implement screen sharing through mediasoup
      // This would require additional producer creation for screen tracks

      if (this.connectionInfo) {
        this.emit("screenShareStarted", {
          participantId: this.connectionInfo.participantId,
          stream: screenStream,
        });
      }

      return screenStream;
    } catch (error) {
      console.error("Failed to start screen share:", error);
      this.emit("error", {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to start screen share"),
        code: "SCREEN_SHARE_FAILED",
      });
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(): void {
    // TODO: Implement screen sharing stop
    if (this.connectionInfo) {
      this.emit("screenShareStopped", {
        participantId: this.connectionInfo.participantId,
      });
    }
  }

  /**
   * Get local media stream
   */
  getLocalStream(): MediaStream | undefined {
    return this.localStream;
  }

  /**
   * Get all remote streams
   */
  getRemoteStreams(): StreamInfo[] {
    return Array.from(this.remoteStreams.values());
  }

  /**
   * Get participants list
   */
  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): ConnectionInfo | undefined {
    return this.connectionInfo;
  }

  /**
   * Check if audio is muted
   */
  isAudioMuted(): boolean {
    return this.mediasoupClient?.isAudioMuted() || false;
  }

  /**
   * Check if video is muted
   */
  isVideoMuted(): boolean {
    return this.mediasoupClient?.isVideoMuted() || false;
  }

  /**
   * Disconnect from conference
   */
  async disconnect(): Promise<void> {
    try {
      if (this.mediasoupClient) {
        await this.mediasoupClient.leaveConference();
      }

      if (this.socket) {
        (this.socket as any).disconnect();
      }

      // Clean up event orchestrator
      this.eventOrchestrator.cleanup();

      // Clean up
      this.participants.clear();
      this.remoteStreams.clear();
      this.localStream = undefined;
      this.connectionInfo = undefined;
      this.socketController = undefined;
      this.mediasoupClient = undefined;
      this.isInitialized = false;

      this.emit("disconnected", {});
    } catch (error) {
      console.error("Disconnect failed:", error);
      this.emit("error", {
        error: error instanceof Error ? error : new Error("Disconnect failed"),
        code: "DISCONNECT_FAILED",
      });
    }
  }

  /**
   * Type-safe event emitter
   */
  private emit<K extends keyof SimpleClientEvents>(
    type: K,
    detail: SimpleClientEvents[K]
  ): void {
    console.log(`[SimpleClient] Emitting event: ${type}`, detail);
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Type-safe event listener
   */
  on<K extends keyof SimpleClientEvents>(
    type: K,
    listener: (event: CustomEvent<SimpleClientEvents[K]>) => void
  ): void {
    console.log(`[SimpleClient] Adding listener for: ${type}`);
    this.addEventListener(type, listener as EventListener);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SimpleClientEvents>(
    type: K,
    listener: (event: CustomEvent<SimpleClientEvents[K]>) => void
  ): void {
    this.removeEventListener(type, listener as EventListener);
  }

  /**
   * Get event orchestrator stats for debugging
   */
  getEventStats() {
    return this.eventOrchestrator.getStats();
  }

  /**
   * Get event history for debugging
   */
  getEventHistory() {
    return this.eventOrchestrator.getEventHistory();
  }

  /**
   * Enable/disable event debugging
   */
  setEventDebugMode(enabled: boolean, includeDetails = false): void {
    this.eventOrchestrator.setDebugLogging(enabled, includeDetails);
  }

  private setupEventListeners(): void {
    if (!this.mediasoupClient || !this.socketController) return;

    console.log("Setting up event listeners with orchestrator");

    // Register socket events with orchestrator
    this.eventOrchestrator.registerEventSource(
      "socket",
      this.socketController,
      {
        participantLeft: "participantLeft",
        producerClosed: "producerClosed",
        consumerClosed: "consumerClosed",
        audioMuted: "audioMuted",
        audioUnmuted: "audioUnmuted",
        videoMuted: "videoMuted",
        videoUnmuted: "videoUnmuted",
        newProducer: "newProducer",
      }
    );

    // Register mediasoup events with orchestrator
    this.eventOrchestrator.registerEventSource(
      "mediasoup",
      this.mediasoupClient,
      {
        localStreamReady: "localStreamReady",
        remoteStreamAdded: "remoteStreamAdded",
        remoteStreamRemoved: "remoteStreamRemoved",
        connected: "mediasoupConnected",
        disconnected: "mediasoupDisconnected",
        error: "mediasoupError",
      }
    );

    // Setup socket event listeners (this was missing!)
    this.socketController.setupEventListeners();

    // Listen to orchestrated events and handle them
    this.eventOrchestrator.addEventListener(
      "localStreamReady",
      (event: any) => {
        this.localStream = event.detail.stream;
        this.emit("localStreamReady", { stream: event.detail.stream });
      }
    );

    this.eventOrchestrator.addEventListener(
      "remoteStreamAdded",
      (event: any) => {
        const streamInfo = event.detail.stream;
        this.remoteStreams.set(streamInfo.streamId, streamInfo);
        this.emit("remoteStreamAdded", { stream: streamInfo });
      }
    );

    this.eventOrchestrator.addEventListener(
      "remoteStreamRemoved",
      (event: any) => {
        const { streamId, participantId } = event.detail;
        this.remoteStreams.delete(streamId);
        this.emit("remoteStreamRemoved", { streamId, participantId });
      }
    );

    this.eventOrchestrator.addEventListener("participantLeft", (event: any) => {
      const { participant } = event.detail;
      if (participant) {
        this.participants.delete(participant.id);
        this.emit("participantLeft", { participant });
      }
    });

    this.eventOrchestrator.addEventListener("newProducer", (event: any) => {
      const { producerId, participantId, kind } = event.detail;
      console.log("New producer detected:", {
        producerId,
        participantId,
        kind,
      });

      // Auto-consume if enabled
      if (this.config.autoConsume && this.mediasoupClient) {
        this.mediasoupClient.consumeMedia(producerId).catch((error) => {
          console.error("Failed to auto-consume media:", error);
        });
      }
    });

    this.eventOrchestrator.addEventListener("audioMuted", (event: any) => {
      this.emit("audioMuted", event.detail);
    });

    this.eventOrchestrator.addEventListener("audioUnmuted", (event: any) => {
      this.emit("audioUnmuted", event.detail);
    });

    this.eventOrchestrator.addEventListener("videoMuted", (event: any) => {
      this.emit("videoMuted", event.detail);
    });

    this.eventOrchestrator.addEventListener("videoUnmuted", (event: any) => {
      this.emit("videoUnmuted", event.detail);
    });

    this.eventOrchestrator.addEventListener("mediasoupError", (event: any) => {
      this.emit("error", {
        error:
          event.detail instanceof Error
            ? event.detail
            : new Error("MediaSoup error"),
        code: "MEDIASOUP_ERROR",
      });
    });

    console.log(
      "Event listeners setup complete. Active listeners:",
      this.eventOrchestrator.getActiveListenerCount()
    );
  }

  private async consumeExistingStreams(): Promise<void> {
    if (!this.socketController) return;

    try {
      const producerIds = await this.socketController.getProducers();

      if (producerIds && producerIds.length > 0) {
        for (const producerId of producerIds) {
          await this.mediasoupClient?.consumeMedia(producerId);
        }
      }
    } catch (error) {
      console.error("Failed to consume existing streams:", error);
    }
  }

  private generateParticipantId(): string {
    return `participant_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
