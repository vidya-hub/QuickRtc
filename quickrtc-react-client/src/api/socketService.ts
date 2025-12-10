import {
  ClientSocket,
  JoinConferenceRequest,
  CreateTransportParams,
  ConnectTransportParams,
  ProduceParams,
  ConsumerParams,
  ConsumeParticipantMediaRequest,
  UnpauseConsumerRequest,
  GetParticipantsRequest,
  ParticipantInfo,
  ProducerControlRequest,
  CloseConsumerRequest,
  LeaveConferenceRequest,
} from "quickrtc-types";
import { RtpCapabilities } from "mediasoup-client/lib/types";
import type { TransportPair } from "../types";

/**
 * Service for managing Socket.IO communication with the server
 * Handles all socket events and requests using typed socket interface
 */
export class SocketService {
  private socket: ClientSocket | null = null;
  private eventListeners: Map<string, Set<(...args: any[]) => void>> =
    new Map();
  private conferenceId: string = "";
  private participantId: string = "";

  /**
   * Initialize socket connection with conference context
   */
  public setSocket(
    socket: ClientSocket,
    conferenceId: string,
    participantId: string
  ): void {
    this.socket = socket;
    this.conferenceId = conferenceId;
    this.participantId = participantId;
  }

  /**
   * Get current socket instance
   */
  public getSocket(): ClientSocket | null {
    return this.socket;
  }

  /**
   * Join conference
   */
  public async joinConference(params: {
    conferenceId: string;
    conferenceName?: string;
    participantId: string;
    participantName: string;
  }): Promise<RtpCapabilities> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: JoinConferenceRequest = {
      data: {
        conferenceId: params.conferenceId,
        conferenceName: params.conferenceName,
        participantId: params.participantId,
        participantName: params.participantName,
      },
    };

    const response = await this.socket.emitWithAck(
      "joinConference",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to join conference");
    }

    return response.data!.routerCapabilities;
  }

  /**
   * Create transports (send and receive)
   */
  public async createTransports(): Promise<TransportPair> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    // Create send transport
    const createSendTransportData: CreateTransportParams = {
      conferenceId: this.conferenceId,
      direction: "producer",
      participantId: this.participantId,
    };

    const sendTransportResponse = await this.socket.emitWithAck(
      "createTransport",
      createSendTransportData
    );

    if (sendTransportResponse.status === "error") {
      throw new Error(
        sendTransportResponse.error || "Failed to create send transport"
      );
    }

    // Create receive transport
    const createRecvTransportData: CreateTransportParams = {
      conferenceId: this.conferenceId,
      direction: "consumer",
      participantId: this.participantId,
    };

    const recvTransportResponse = await this.socket.emitWithAck(
      "createTransport",
      createRecvTransportData
    );

    if (recvTransportResponse.status === "error") {
      throw new Error(
        recvTransportResponse.error || "Failed to create receive transport"
      );
    }

    return {
      sendTransport: sendTransportResponse.data!,
      recvTransport: recvTransportResponse.data!,
    };
  }

  /**
   * Connect transport
   */
  public async connectTransport(params: {
    transportId: string;
    dtlsParameters: any;
    direction: "producer" | "consumer";
  }): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: ConnectTransportParams = {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      direction: params.direction,
      dtlsParameters: params.dtlsParameters,
    };

    const response = await this.socket.emitWithAck(
      "connectTransport",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to connect transport");
    }
  }

  /**
   * Produce media (create producer)
   */
  public async produce(params: {
    transportId: string;
    kind: "audio" | "video";
    rtpParameters: any;
    streamType?: "audio" | "video" | "screenshare";
  }): Promise<string> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: ProduceParams = {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      transportId: params.transportId,
      kind: params.kind,
      rtpParameters: params.rtpParameters,
      producerOptions: {
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      },
      streamType: params.streamType || (params.kind === 'audio' ? 'audio' : 'video'),
    };

    const response = await this.socket.emitWithAck("produce", requestData);

    if (response.status === "error") {
      throw new Error(response.error || "Failed to produce");
    }

    return response.data!.producerId;
  }

  /**
   * Consume participant media
   */
  public async consumeParticipantMedia(params: {
    participantId: string;
    rtpCapabilities: RtpCapabilities;
  }): Promise<ConsumerParams[]> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: ConsumeParticipantMediaRequest = {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      targetParticipantId: params.participantId,
      rtpCapabilities: params.rtpCapabilities,
    };

    const response = await this.socket.emitWithAck(
      "consumeParticipantMedia",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to consume media");
    }

    return response.data!;
  }

  /**
   * Resume consumer (unpause)
   */
  public async resumeConsumer(consumerId: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: UnpauseConsumerRequest = {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      consumerId,
    };

    const response = await this.socket.emitWithAck(
      "unpauseConsumer",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to resume consumer");
    }
  }

  /**
   * Close producer
   */
  public async closeProducer(producerId: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: ProducerControlRequest = {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      extraData: { producerId },
    };

    const response = await this.socket.emitWithAck(
      "closeProducer",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to close producer");
    }
  }

  /**
   * Close consumer
   */
  public async closeConsumer(consumerId: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: CloseConsumerRequest = {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      extraData: { consumerId },
    };

    const response = await this.socket.emitWithAck(
      "closeConsumer",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to close consumer");
    }
  }

  /**
   * Get participants list
   */
  public async getParticipants(): Promise<ParticipantInfo[]> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: GetParticipantsRequest = {
      conferenceId: this.conferenceId,
    };

    const response = await this.socket.emitWithAck(
      "getParticipants",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to get participants");
    }

    return response.data!;
  }

  /**
   * Leave conference
   */
  public async leaveConference(): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const requestData: LeaveConferenceRequest = {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
    };

    const response = await this.socket.emitWithAck(
      "leaveConference",
      requestData
    );

    if (response.status === "error") {
      throw new Error(response.error || "Failed to leave conference");
    }
  }

  /**
   * Register event listener for server-to-client events
   */
  public on<K extends keyof import("quickrtc-types").ServerToClientEvents>(
    event: K,
    callback: import("quickrtc-types").ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    // Use 'any' socket to bypass type restrictions for event listeners
    const anySocket = this.socket as any;
    anySocket.on(event, callback);

    // Track for cleanup
    if (!this.eventListeners.has(event as string)) {
      this.eventListeners.set(event as string, new Set());
    }
    this.eventListeners.get(event as string)!.add(callback);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof import("quickrtc-types").ServerToClientEvents>(
    event: K,
    callback: import("quickrtc-types").ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      return;
    }

    const anySocket = this.socket as any;
    anySocket.off(event, callback);

    const listeners = this.eventListeners.get(event as string);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Remove all event listeners
   */
  public removeAllListeners(): void {
    if (!this.socket) {
      return;
    }

    const anySocket = this.socket as any;
    for (const [event, listeners] of this.eventListeners) {
      for (const listener of listeners) {
        anySocket.off(event, listener);
      }
    }

    this.eventListeners.clear();
  }

  /**
   * Setup event listeners with enhanced logging
   */
  public setupEventListeners(
    handlers: Partial<import("quickrtc-types").ServerToClientEvents>
  ): void {
    const logger = (
      message: string,
      level: "info" | "warn" | "error" = "info",
      data?: any
    ) => {
      const timestamp = new Date().toISOString();
      const prefix = `[SocketService:${this.participantId || "unknown"}]`;
      const logMessage = `${timestamp} ${prefix} ${message}`;

      if (data) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    };

    if (!this.socket) {
      logger("Cannot setup event listeners - socket not initialized", "error");
      return;
    }

    logger("🔧 Setting up socket event listeners");

    // Participant joined event
    if (handlers.participantJoined) {
      this.on("participantJoined", (data) => {
        logger(
          `🎉 Participant joined: ${data.participantName} (${data.participantId})`,
          "info",
          { conferenceId: data.conferenceId }
        );
        handlers.participantJoined!(data);
      });
    }

    // Participant left event
    if (handlers.participantLeft) {
      this.on("participantLeft", (data) => {
        logger(`👋 Participant left: ${data.participantId}`, "info", {
          closedProducers: data.closedProducerIds.length,
          closedConsumers: data.closedConsumerIds.length,
        });
        handlers.participantLeft!(data);
      });
    }

    // New producer event
    if (handlers.newProducer) {
      this.on("newProducer", (data) => {
        logger(
          `📡 New ${data.kind} producer from ${data.participantName}`,
          "info",
          { producerId: data.producerId, participantId: data.participantId }
        );
        handlers.newProducer!(data);
      });
    }

    // Producer closed event
    if (handlers.producerClosed) {
      this.on("producerClosed", (data) => {
        logger(
          `❌ Producer closed: ${data.kind} from ${data.participantId}`,
          "info",
          { producerId: data.producerId }
        );
        handlers.producerClosed!(data);
      });
    }

    // Consumer closed event
    if (handlers.consumerClosed) {
      this.on("consumerClosed", (data) => {
        logger(`❌ Consumer closed: ${data.consumerId}`, "info", {
          participantId: data.participantId,
        });
        handlers.consumerClosed!(data);
      });
    }

    // Audio muted event
    if (handlers.audioMuted) {
      this.on("audioMuted", (data) => {
        logger(`🔇 Audio muted by ${data.participantId}`, "info", {
          producers: data.mutedProducerIds,
        });
        handlers.audioMuted!(data);
      });
    }

    // Audio unmuted event
    if (handlers.audioUnmuted) {
      this.on("audioUnmuted", (data) => {
        logger(`🔊 Audio unmuted by ${data.participantId}`, "info");
        handlers.audioUnmuted!(data);
      });
    }

    // Video muted event
    if (handlers.videoMuted) {
      this.on("videoMuted", (data) => {
        logger(`📵 Video muted by ${data.participantId}`, "info", {
          producers: data.mutedProducerIds,
        });
        handlers.videoMuted!(data);
      });
    }

    // Video unmuted event
    if (handlers.videoUnmuted) {
      this.on("videoUnmuted", (data) => {
        logger(`📹 Video unmuted by ${data.participantId}`, "info");
        handlers.videoUnmuted!(data);
      });
    }

    // Disconnect event
    if (handlers.disconnect) {
      this.on("disconnect", (reason) => {
        logger(`🔌 Disconnected: ${reason}`, "warn");
        handlers.disconnect!(reason);
      });
    }

    // Connection events using any socket
    const anySocket = this.socket as any;

    anySocket.on("connect", () => {
      logger("✅ Socket connected successfully");
      if (handlers.connect) {
        handlers.connect();
      }
    });

    anySocket.on("connect_error", (error: any) => {
      logger(`❌ Socket connection error: ${error.message}`, "error", {
        error: error.stack,
      });
    });

    anySocket.on("reconnect", (attemptNumber: number) => {
      logger(`🔄 Socket reconnected after ${attemptNumber} attempt(s)`, "info");
    });

    anySocket.on("reconnecting", (attemptNumber: number) => {
      logger(`⏳ Socket reconnecting... (attempt ${attemptNumber})`, "warn");
    });

    anySocket.on("error", (error: any) => {
      logger(`❌ Socket error: ${error}`, "error", { error });
    });

    logger("✅ Socket event listeners setup complete");
  }

  /**
   * Reset socket (for cleanup)
   */
  public reset(): void {
    this.removeAllListeners();
    this.socket = null;
  }
}

// Export singleton instance
export const socketService = new SocketService();
