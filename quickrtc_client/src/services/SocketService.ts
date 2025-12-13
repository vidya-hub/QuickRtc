import type { Socket } from "socket.io-client";
import type {
  SocketResponse,
  JoinResponse,
  TransportOptions,
  ConsumerParams,
} from "../types";

/**
 * SocketService handles all Socket.IO communication with the server
 */
export class SocketService {
  private socket: Socket;
  private conferenceId: string = "";
  private participantId: string = "";
  private debug: boolean;

  constructor(socket: Socket, debug: boolean = false) {
    this.socket = socket;
    this.debug = debug;
  }

  /**
   * Set conference context
   */
  setContext(conferenceId: string, participantId: string): void {
    this.conferenceId = conferenceId;
    this.participantId = participantId;
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket {
    return this.socket;
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[SocketService] ${message}`, data ?? "");
    }
  }

  /**
   * Emit with acknowledgement and error handling
   */
  private async emit<T>(event: string, data: unknown): Promise<T> {
    this.log(`Emitting: ${event}`, data);
    
    const response = await this.socket.emitWithAck(event, data) as SocketResponse<T>;
    
    if (response.status === "error") {
      throw new Error(response.error || `${event} failed`);
    }
    
    this.log(`Response: ${event}`, response.data);
    return response.data as T;
  }

  // ========================================================================
  // CONFERENCE OPERATIONS
  // ========================================================================

  /**
   * Join a conference
   */
  async joinConference(params: {
    conferenceId: string;
    conferenceName?: string;
    participantId: string;
    participantName: string;
    participantInfo?: Record<string, unknown>;
  }): Promise<JoinResponse> {
    return this.emit<JoinResponse>("joinConference", {
      data: {
        conferenceId: params.conferenceId,
        conferenceName: params.conferenceName,
        participantId: params.participantId,
        participantName: params.participantName,
        participantInfo: params.participantInfo || {},
      },
    });
  }

  /**
   * Leave the conference
   */
  async leaveConference(): Promise<void> {
    await this.emit("leaveConference", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
    });
  }

  /**
   * Get all participants in the conference
   */
  async getParticipants(): Promise<Array<{
    participantId: string;
    participantName: string;
    participantInfo?: Record<string, unknown>;
  }>> {
    return this.emit("getParticipants", {
      conferenceId: this.conferenceId,
    });
  }

  // ========================================================================
  // TRANSPORT OPERATIONS
  // ========================================================================

  /**
   * Create send and receive transports
   */
  async createTransports(): Promise<{
    sendTransport: TransportOptions;
    recvTransport: TransportOptions;
  }> {
    const [sendTransport, recvTransport] = await Promise.all([
      this.emit<TransportOptions>("createTransport", {
        conferenceId: this.conferenceId,
        participantId: this.participantId,
        direction: "producer",
      }),
      this.emit<TransportOptions>("createTransport", {
        conferenceId: this.conferenceId,
        participantId: this.participantId,
        direction: "consumer",
      }),
    ]);

    return { sendTransport, recvTransport };
  }

  /**
   * Connect a transport
   */
  async connectTransport(params: {
    transportId: string;
    dtlsParameters: unknown;
    direction: "producer" | "consumer";
  }): Promise<void> {
    await this.emit("connectTransport", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      direction: params.direction,
      dtlsParameters: params.dtlsParameters,
    });
  }

  // ========================================================================
  // PRODUCER OPERATIONS
  // ========================================================================

  /**
   * Create a producer
   */
  async produce(params: {
    transportId: string;
    kind: "audio" | "video";
    rtpParameters: unknown;
    streamType?: string;
  }): Promise<string> {
    const response = await this.emit<{ producerId: string }>("produce", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      transportId: params.transportId,
      kind: params.kind,
      rtpParameters: params.rtpParameters,
      producerOptions: {
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      },
      streamType: params.streamType || params.kind,
    });

    return response.producerId;
  }

  /**
   * Pause a producer
   */
  async pauseProducer(producerId: string): Promise<void> {
    await this.emit("pauseProducer", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      extraData: { producerId },
    });
  }

  /**
   * Resume a producer
   */
  async resumeProducer(producerId: string): Promise<void> {
    await this.emit("resumeProducer", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      extraData: { producerId },
    });
  }

  /**
   * Close a producer
   */
  async closeProducer(producerId: string): Promise<void> {
    await this.emit("closeProducer", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      extraData: { producerId },
    });
  }

  // ========================================================================
  // CONSUMER OPERATIONS
  // ========================================================================

  /**
   * Consume all media from a participant
   */
  async consumeParticipant(params: {
    targetParticipantId: string;
    rtpCapabilities: unknown;
  }): Promise<ConsumerParams[]> {
    return this.emit<ConsumerParams[]>("consumeParticipantMedia", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      targetParticipantId: params.targetParticipantId,
      rtpCapabilities: params.rtpCapabilities,
    });
  }

  /**
   * Resume a consumer (unpause)
   */
  async resumeConsumer(consumerId: string): Promise<void> {
    await this.emit("unpauseConsumer", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      consumerId,
    });
  }

  /**
   * Close a consumer
   */
  async closeConsumer(consumerId: string): Promise<void> {
    await this.emit("closeConsumer", {
      conferenceId: this.conferenceId,
      participantId: this.participantId,
      extraData: { consumerId },
    });
  }

  // ========================================================================
  // EVENT HANDLING
  // ========================================================================

  /**
   * Subscribe to a socket event
   */
  on<T>(event: string, handler: (data: T) => void): void {
    this.socket.on(event, handler);
  }

  /**
   * Unsubscribe from a socket event
   */
  off<T>(event: string, handler: (data: T) => void): void {
    this.socket.off(event, handler);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.socket.removeAllListeners();
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket.connected;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    this.socket.disconnect();
  }
}
