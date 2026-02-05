import { Server } from "socket.io";
import { createServer, Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import MediasoupController from "./controllers/MediasoupController";
import SocketEventController from "./controllers/SocketController";
import { WorkerService } from "./workers/WorkerService";
import type { MediasoupConfig } from "quickrtc-types";
import {
  QuickRTCMediasoupConfig,
  mergeMediasoupConfig,
} from "./config/defaultMediasoupConfig";

// Simple, easy-to-use types
export interface QuickRTCServerConfig {
  // HTTP server injection - provide your own HTTP/HTTPS server
  httpServer?: HttpServer | HttpsServer;

  // Socket.IO server injection - provide your own Socket.IO server
  socketServer?: Server;

  // Legacy options for backward compatibility (only used if httpServer not provided)
  port?: number;
  host?: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };

  /**
   * QuickRTC mediasoup configuration
   * If not provided, uses sensible defaults
   * You can override any part of the config - missing values will use defaults
   *
   * @example
   * ```ts
   * quickrtcConfig: {
   *   // Only override what you need
   *   webRtcServerOptions: {
   *     listenInfos: [{ ip: "0.0.0.0", announcedIp: "your-public-ip" }]
   *   }
   * }
   * ```
   */
  quickrtcConfig?: Partial<QuickRTCMediasoupConfig>;
}

export interface ConferenceInfo {
  id: string;
  name?: string;
  participantCount: number;
  createdAt: Date;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  conferenceId: string;
  socketId: string;
  joinedAt: Date;
  /** Extra participant metadata (permissions, role, etc.) */
  info?: Record<string, unknown>;
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioProducerIds: string[];
    videoProducerIds: string[];
  };
}

// Event types for better type safety
export interface QuickRTCServerEvents {
  // Server events
  serverStarted: { port: number; host: string };
  serverError: { error: Error };

  // Connection events
  clientConnected: { socketId: string };
  clientDisconnected: { socketId: string };

  // Conference events
  conferenceCreated: { conference: ConferenceInfo };
  conferenceDestroyed: { conferenceId: string };
  participantJoined: { participant: ParticipantInfo };
  participantLeft: { participant: ParticipantInfo };

  // Media events
  producerCreated: {
    participantId: string;
    producerId: string;
    kind: "audio" | "video";
  };
  producerClosed: { participantId: string; producerId: string };
  consumerCreated: {
    participantId: string;
    consumerId: string;
    producerId: string;
  };
  consumerClosed: { participantId: string; consumerId: string };

  // Media state events
  audioMuted: { participantId: string; conferenceId: string };
  audioUnmuted: { participantId: string; conferenceId: string };
  videoMuted: { participantId: string; conferenceId: string };
  videoUnmuted: { participantId: string; conferenceId: string };
}

/**
 * QuickRTCServer - A high-level, easy-to-use MediaSoup server abstraction
 *
 * Features:
 * - Simple setup with minimal configuration
 * - Event-driven architecture
 * - Automatic conference management
 * - Built-in error handling
 * - Real-time participant tracking
 */
export class QuickRTCServer extends EventTarget {
  private config: QuickRTCServerConfig;
  private httpServer?: HttpServer | HttpsServer;
  private io?: Server;
  private workerService?: WorkerService;
  private mediasoupController?: MediasoupController;
  private socketController?: SocketEventController;
  private conferences: Map<string, ConferenceInfo> = new Map();
  private participants: Map<string, ParticipantInfo> = new Map();
  private isStarted = false;
  private isExternalServer = false;

  constructor(config: QuickRTCServerConfig = {}) {
    super();
    this.config = {
      port: 3000,
      host: "0.0.0.0",
      cors: {
        origin: "*",
        credentials: true,
      },
      ...config,
    };
  }

  /**
   * Start the server with external HTTP server injection
   * @param externalHttpServer - Optional external HTTP/HTTPS server to use
   * @param externalSocketServer - Optional external Socket.IO server to use
   */
  async start(
    externalHttpServer?: HttpServer | HttpsServer,
    externalSocketServer?: Server
  ): Promise<void> {
    try {
      if (this.isStarted) {
        throw new Error("Server is already started");
      }

      // Use provided servers or config servers or create new ones
      this.httpServer =
        externalHttpServer || this.config.httpServer || createServer();

      this.io =
        externalSocketServer ||
        this.config.socketServer ||
        new Server(this.httpServer, {
          cors: this.config.cors || {
            origin: "*",
            credentials: true,
          },
          transports: ["websocket", "polling"],
        });

      // Track if we're using external servers
      this.isExternalServer = !!(externalHttpServer || this.config.httpServer);

      // Initialize MediaSoup components
      await this.initializeMediaSoup();

      // Setup event handling
      this.setupEventHandlers();

      // Only start the HTTP server if it's our own (not externally managed)
      if (!this.isExternalServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.listen(this.config.port, this.config.host, () => {
            console.log(
              `🚀 QuickRTC Server started on ${this.config.host}:${this.config.port}`
            );
            this.isStarted = true;
            this.emit("serverStarted", {
              port: this.config.port!,
              host: this.config.host!,
            });
            resolve();
          });

          this.httpServer!.on("error", (error: Error) => {
            reject(error);
          });
        });
      } else {
        // For external servers, just mark as started
        this.isStarted = true;
        console.log("🚀 QuickRTC Server initialized with external HTTP server");
        this.emit("serverStarted", {
          port: 0, // Port managed externally
          host: "external",
        });
      }
    } catch (error) {
      console.error("Failed to start server:", error);
      this.emit("serverError", {
        error:
          error instanceof Error ? error : new Error("Unknown server error"),
      });
      throw error;
    }
  }

  /**
   * Stop the server
   * Note: If using external HTTP server, you need to manage its lifecycle separately
   */
  async stop(): Promise<void> {
    try {
      if (!this.isStarted) {
        return;
      }

      // Close Socket.IO connections (only if we created it)
      if (this.io && !this.config.socketServer) {
        this.io.close();
      }

      // Close HTTP server only if we created it (not externally managed)
      if (this.httpServer && !this.isExternalServer) {
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => {
            resolve();
          });
        });
      }

      // Clean up MediaSoup resources
      if (this.workerService) {
        // Close all workers manually
        const workers = this.workerService.getWorkers();
        await Promise.all(workers.map((worker) => worker.close()));
      }

      // Clear data
      this.conferences.clear();
      this.participants.clear();
      this.isStarted = false;
      this.isExternalServer = false;

      console.log("🛑 QuickRTC Server stopped");
    } catch (error) {
      console.error("Error stopping server:", error);
      this.emit("serverError", {
        error: error instanceof Error ? error : new Error("Unknown stop error"),
      });
    }
  }

  /**
   * Get all active conferences
   */
  getConferences(): ConferenceInfo[] {
    return Array.from(this.conferences.values());
  }

  /**
   * Get conference by ID
   */
  getConference(conferenceId: string): ConferenceInfo | undefined {
    return this.conferences.get(conferenceId);
  }

  /**
   * Get all participants
   */
  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get participants in a specific conference
   */
  getConferenceParticipants(conferenceId: string): ParticipantInfo[] {
    return Array.from(this.participants.values()).filter(
      (p) => p.conferenceId === conferenceId
    );
  }

  /**
   * Get participant by ID
   */
  getParticipant(participantId: string): ParticipantInfo | undefined {
    return this.participants.get(participantId);
  }

  /**
   * Kick a participant from conference
   */
  async kickParticipant(participantId: string, reason?: string): Promise<void> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    try {
      // Find the socket and disconnect it
      const socket = this.io?.sockets.sockets.get(participant.socketId);
      if (socket) {
        socket.emit("kicked", { reason: reason || "Kicked by administrator" });
        socket.disconnect(true);
      }

      console.log(
        `👢 Kicked participant ${participantId} from conference ${participant.conferenceId}`
      );
    } catch (error) {
      console.error("Failed to kick participant:", error);
      throw error;
    }
  }

  /**
   * Close a conference (kick all participants)
   */
  async closeConference(conferenceId: string, reason?: string): Promise<void> {
    const participants = this.getConferenceParticipants(conferenceId);

    try {
      // Kick all participants
      await Promise.all(
        participants.map((p) => this.kickParticipant(p.id, reason))
      );

      // Remove conference
      this.conferences.delete(conferenceId);

      console.log(`🏠 Closed conference ${conferenceId}`);
      this.emit("conferenceDestroyed", { conferenceId });
    } catch (error) {
      console.error("Failed to close conference:", error);
      throw error;
    }
  }

  /**
   * Broadcast message to all participants in a conference
   */
  broadcastToConference(conferenceId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(conferenceId).emit(event, data);
    }
  }

  /**
   * Send message to specific participant
   */
  sendToParticipant(participantId: string, event: string, data: any): void {
    const participant = this.participants.get(participantId);
    if (participant && this.io) {
      const socket = this.io.sockets.sockets.get(participant.socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  getSocketServer(): Server | undefined {
    return this.io;
  }

  /**
   * Get the HTTP server instance
   */
  getHttpServer(): HttpServer | HttpsServer | undefined {
    return this.httpServer;
  }

  /**
   * Get server statistics
   */
  getStats(): {
    uptime: number;
    conferenceCount: number;
    participantCount: number;
    producerCount: number;
    consumerCount: number;
    totalConnections: number;
  } {
    // Calculate producer and consumer counts across all conferences
    let producerCount = 0;
    let consumerCount = 0;
    
    if (this.mediasoupController) {
      const conferences = this.mediasoupController.getConferences();
      for (const [, conference] of conferences) {
        producerCount += conference.getProducerCount();
        consumerCount += conference.getConsumerCount();
      }
    }
    
    return {
      uptime: process.uptime(),
      conferenceCount: this.conferences.size,
      participantCount: this.participants.size,
      producerCount,
      consumerCount,
      totalConnections: this.io?.sockets.sockets.size || 0,
    };
  }

  /**
   * Type-safe event emitter
   */
  private emit<K extends keyof QuickRTCServerEvents>(
    type: K,
    detail: QuickRTCServerEvents[K]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Type-safe event listener
   */
  on<K extends keyof QuickRTCServerEvents>(
    type: K,
    listener: (event: CustomEvent<QuickRTCServerEvents[K]>) => void
  ): void {
    this.addEventListener(type, listener as EventListener);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof QuickRTCServerEvents>(
    type: K,
    listener: (event: CustomEvent<QuickRTCServerEvents[K]>) => void
  ): void {
    this.removeEventListener(type, listener as EventListener);
  }

  private async initializeMediaSoup(): Promise<void> {
    try {
      // Merge user config with defaults
      const mergedConfig = mergeMediasoupConfig(this.config.quickrtcConfig);

      // Build the MediasoupConfig for WorkerService
      const mediasoupConfig: MediasoupConfig = {
        workerConfig: mergedConfig.workerSettings,
        routerConfig: mergedConfig.routerOptions,
        transportConfig: {
          ...mergedConfig.transportOptions,
          listenIps: mergedConfig.webRtcServerOptions.listenInfos.map(
            (info) => ({
              ip: info.ip,
              announcedIp: info.announcedIp ?? undefined,
            })
          ),
        },
      };

      this.workerService = new WorkerService(mediasoupConfig);
      await this.workerService.createWorkers();

      // Initialize MediaSoup Controller
      this.mediasoupController = new MediasoupController(this.workerService);

      // Initialize Socket Controller
      this.socketController = new SocketEventController(
        this.mediasoupController,
        this.io!
      );

      console.log("✅ MediaSoup components initialized");
    } catch (error) {
      console.error("Failed to initialize MediaSoup:", error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socketController) return;

    // Connection events
    this.socketController.on("newConnection", (socket: any) => {
      console.log(`🔌 New connection: ${socket.id}`);
      this.emit("clientConnected", { socketId: socket.id });
    });

    this.socketController.on("clientDisconnected", (socket: any) => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      this.emit("clientDisconnected", { socketId: socket.id });
    });

    // Conference events
    this.socketController.on("conferenceJoined", (data: any) => {
      console.log("conference event came here ", data);

      const { conferenceId, participantId, conferenceName, participantName } =
        data;
      const socketId = data.socketId || "unknown";

      // Create or update conference
      if (!this.conferences.has(conferenceId)) {
        const conference: ConferenceInfo = {
          id: conferenceId,
          name: conferenceName,
          participantCount: 0,
          createdAt: new Date(),
        };
        this.conferences.set(conferenceId, conference);
        this.emit("conferenceCreated", { conference });
      }

      // Add participant
      const participant: ParticipantInfo = {
        id: participantId,
        name: participantName,
        conferenceId,
        socketId,
        joinedAt: new Date(),
        info: data.participantInfo,
        mediaState: {
          audioEnabled: true,
          videoEnabled: true,
          audioProducerIds: [],
          videoProducerIds: [],
        },
      };

      this.participants.set(participantId, participant);

      // Update conference participant count
      const conference = this.conferences.get(conferenceId);
      if (conference) {
        conference.participantCount =
          this.getConferenceParticipants(conferenceId).length;
      }

      console.log(`👋 ${participantName} joined conference ${conferenceId}`);
      this.emit("participantJoined", { participant });
    });

    this.socketController.on("participantLeft", (data: any) => {
      const { participantId, conferenceId } = data;
      const participant = this.participants.get(participantId);

      if (participant) {
        this.participants.delete(participantId);

        // Update conference participant count
        const conference = this.conferences.get(conferenceId);
        if (conference) {
          const remainingParticipants =
            this.getConferenceParticipants(conferenceId);
          conference.participantCount = remainingParticipants.length;

          // Remove conference if empty
          if (remainingParticipants.length === 0) {
            this.conferences.delete(conferenceId);
            this.emit("conferenceDestroyed", { conferenceId });
          }
        }

        console.log(`👋 ${participant.name} left conference ${conferenceId}`);
        this.emit("participantLeft", { participant });
      }
    });

    // Media events
    this.socketController.on("producerCreated", (data: any) => {
      const { producerId, participantId } = data;
      const participant = this.participants.get(participantId);

      if (participant) {
        // In a real implementation, you would determine the media type from the producer data
        // For now, we'll track all producers in the video array and let the client handle the logic
        participant.mediaState.videoProducerIds.push(producerId);

        console.log(
          `📹 Producer created: ${producerId} for ${participant.name}`
        );
        this.emit("producerCreated", {
          participantId,
          producerId,
          kind: "video",
        });
      }
    });

    this.socketController.on("producerClosed", (data: any) => {
      const { producerId, participantId } = data;
      console.log(
        `📹 Producer closed: ${producerId} for participant ${participantId}`
      );
      this.emit("producerClosed", { participantId, producerId });
    });

    this.socketController.on("consumerCreated", (data: any) => {
      console.log("consume created data ", data);

      const { id, participantId, producerId } = data;
      console.log(
        `📺 Consumer created: ${id} for participant ${participantId}`
      );
      this.emit("consumerCreated", {
        participantId,
        consumerId: id,
        producerId,
      });
    });

    this.socketController.on("consumerClosed", (data: any) => {
      const { consumerId, participantId } = data;
      console.log(
        `📺 Consumer closed: ${consumerId} for participant ${participantId}`
      );
      this.emit("consumerClosed", { participantId, consumerId });
    });

    // Media state events
    this.socketController.on("audioMuted", (data: any) => {
      const { participantId } = data;
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.mediaState.audioEnabled = false;
        console.log(`🔇 Audio muted for ${participant.name}`);
        this.emit("audioMuted", {
          participantId,
          conferenceId: participant.conferenceId,
        });
      }
    });

    this.socketController.on("audioUnmuted", (data: any) => {
      const { participantId } = data;
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.mediaState.audioEnabled = true;
        console.log(`🔊 Audio unmuted for ${participant.name}`);
        this.emit("audioUnmuted", {
          participantId,
          conferenceId: participant.conferenceId,
        });
      }
    });

    this.socketController.on("videoMuted", (data: any) => {
      const { participantId } = data;
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.mediaState.videoEnabled = false;
        console.log(`📵 Video muted for ${participant.name}`);
        this.emit("videoMuted", {
          participantId,
          conferenceId: participant.conferenceId,
        });
      }
    });

    this.socketController.on("videoUnmuted", (data: any) => {
      const { participantId } = data;
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.mediaState.videoEnabled = true;
        console.log(`📹 Video unmuted for ${participant.name}`);
        this.emit("videoUnmuted", {
          participantId,
          conferenceId: participant.conferenceId,
        });
      }
    });
  }
}
