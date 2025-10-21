import { ClientSocket } from "@simple-mediasoup/types";
import { SocketClientController } from "./controller/SocketClientController";
import MediasoupClient, {
  MediasoupClientConfig,
} from "./mediasoup/MediasoupClient";

// Simple, easy-to-use types
export interface SimpleClientConfig {
  serverUrl: string;
  iceServers?: RTCIceServer[];
  enableAudio?: boolean;
  enableVideo?: boolean;
  autoConsume?: boolean; // Automatically consume remote streams
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
  }

  /**
   * Initialize and connect to the conference
   */
  async connect(
    conferenceId: string,
    participantName: string,
    participantId?: string
  ): Promise<void> {
    try {
      if (this.isInitialized) {
        throw new Error("Client is already connected");
      }

      // Generate participant ID if not provided
      const finalParticipantId = participantId || this.generateParticipantId();

      // Import socket.io-client dynamically
      const { io } = await import("socket.io-client");

      // Connect to server
      this.socket = io(this.config.serverUrl) as ClientSocket;

      // Wait for socket connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        this.socket!.on("connect", () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Initialize controllers
      this.socketController = new SocketClientController(this.socket, {
        conferenceId,
        participantId: finalParticipantId,
        participantName,
        socketId: this.socket.id || "",
      });

      this.mediasoupClient = new MediasoupClient(this.socketController, {
        iceServers: this.config.iceServers,
        enableAudio: this.config.enableAudio,
        enableVideo: this.config.enableVideo,
      });

      // Setup event listeners
      this.setupEventListeners();

      // Join conference
      await this.mediasoupClient.joinConference();

      this.connectionInfo = {
        conferenceId,
        participantId: finalParticipantId,
        participantName,
        isConnected: true,
      };

      // Add local participant
      this.participants.set(finalParticipantId, {
        id: finalParticipantId,
        name: participantName,
        isLocal: true,
      });

      this.isInitialized = true;

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
        this.socket.disconnect();
      }

      // Clean up
      this.participants.clear();
      this.remoteStreams.clear();
      this.localStream = undefined;
      this.connectionInfo = undefined;
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
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Type-safe event listener
   */
  on<K extends keyof SimpleClientEvents>(
    type: K,
    listener: (event: CustomEvent<SimpleClientEvents[K]>) => void
  ): void {
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

  private setupEventListeners(): void {
    if (!this.mediasoupClient) return;

    // MediaSoup client events
    this.mediasoupClient.addEventListener("connected", () => {
      // Already handled in connect method
    });

    this.mediasoupClient.addEventListener("localStreamReady", (event: any) => {
      this.localStream = event.detail.stream;
      this.emit("localStreamReady", { stream: event.detail.stream });
    });

    this.mediasoupClient.addEventListener("remoteStreamAdded", (event: any) => {
      const { consumerId, stream, producerId, kind } = event.detail;

      const streamInfo: StreamInfo = {
        participantId: producerId, // Using producerId as participant identifier
        streamId: consumerId,
        stream,
        type: kind === "audio" ? "audio" : "video",
      };

      this.remoteStreams.set(consumerId, streamInfo);
      this.emit("remoteStreamAdded", { stream: streamInfo });
    });

    this.mediasoupClient.addEventListener(
      "remoteStreamRemoved",
      (event: any) => {
        const { consumerId } = event.detail;
        const streamInfo = this.remoteStreams.get(consumerId);

        if (streamInfo) {
          this.remoteStreams.delete(consumerId);
          this.emit("remoteStreamRemoved", {
            streamId: consumerId,
            participantId: streamInfo.participantId,
          });
        }
      }
    );

    this.mediasoupClient.addEventListener("participantLeft", (event: any) => {
      const { participantId } = event.detail;
      const participant = this.participants.get(participantId);

      if (participant) {
        this.participants.delete(participantId);
        this.emit("participantLeft", { participant });
      }
    });

    this.mediasoupClient.addEventListener("remoteAudioMuted", (event: any) => {
      const { participantId } = event.detail;
      this.emit("audioMuted", { participantId, isLocal: false });
    });

    this.mediasoupClient.addEventListener(
      "remoteAudioUnmuted",
      (event: any) => {
        const { participantId } = event.detail;
        this.emit("audioUnmuted", { participantId, isLocal: false });
      }
    );

    this.mediasoupClient.addEventListener("remoteVideoMuted", (event: any) => {
      const { participantId } = event.detail;
      this.emit("videoMuted", { participantId, isLocal: false });
    });

    this.mediasoupClient.addEventListener(
      "remoteVideoUnmuted",
      (event: any) => {
        const { participantId } = event.detail;
        this.emit("videoUnmuted", { participantId, isLocal: false });
      }
    );

    this.mediasoupClient.addEventListener("error", (event: any) => {
      this.emit("error", {
        error:
          event.detail instanceof Error
            ? event.detail
            : new Error("MediaSoup error"),
        code: "MEDIASOUP_ERROR",
      });
    });
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
