import type { types as MediasoupTypes } from "mediasoup-client";
import type { SocketService } from "./SocketService";
import type { ConsumerInfo, ConsumerParams, StreamType } from "../types";

type Transport = MediasoupTypes.Transport;
type Consumer = MediasoupTypes.Consumer;
type RtpCapabilities = MediasoupTypes.RtpCapabilities;

/**
 * ConsumerService handles consuming media from remote participants
 */
export class ConsumerService {
  private consumers: Map<string, ConsumerInfo> = new Map();
  private socketService: SocketService;
  private debug: boolean;

  constructor(socketService: SocketService, debug: boolean = false) {
    this.socketService = socketService;
    this.debug = debug;
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[ConsumerService] ${message}`, data ?? "");
    }
  }

  /**
   * Generate unique consumer stream ID
   */
  private generateStreamId(participantId: string, type: StreamType): string {
    return `${participantId}-${type}-${Date.now()}`;
  }

  // ========================================================================
  // CONSUMING
  // ========================================================================

  /**
   * Consume all media from a participant
   */
  async consumeParticipant(
    recvTransport: Transport,
    rtpCapabilities: RtpCapabilities,
    participantId: string,
    participantName: string
  ): Promise<ConsumerInfo[]> {
    this.log(`Consuming media from: ${participantName}`, { participantId });

    // Get consumer params from server
    const consumerParamsList = await this.socketService.consumeParticipant({
      targetParticipantId: participantId,
      rtpCapabilities,
    });

    if (!consumerParamsList || consumerParamsList.length === 0) {
      this.log(`No streams to consume from: ${participantName}`);
      return [];
    }

    const consumedStreams: ConsumerInfo[] = [];

    for (const params of consumerParamsList) {
      // Skip if we already have a consumer for this producer
      if (this.getConsumerByProducerId(params.producerId)) {
        this.log(`Already have consumer for producer: ${params.producerId}, skipping`);
        continue;
      }

      try {
        const consumerInfo = await this.createConsumer(
          recvTransport,
          params,
          participantId,
          participantName
        );
        consumedStreams.push(consumerInfo);
      } catch (error) {
        this.log(`Error consuming stream: ${error}`, params);
      }
    }

    return consumedStreams;
  }

  /**
   * Create a single consumer
   */
  private async createConsumer(
    recvTransport: Transport,
    params: ConsumerParams,
    participantId: string,
    participantName: string
  ): Promise<ConsumerInfo> {
    // Determine stream type
    const streamType: StreamType = params.streamType || (params.kind as StreamType);
    const streamId = this.generateStreamId(participantId, streamType);

    this.log(`Creating consumer for ${streamType}`, { streamId, producerId: params.producerId });

    // Create consumer
    const consumer = await recvTransport.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters as any,
    });

    // Resume the consumer (they start paused)
    await this.socketService.resumeConsumer(consumer.id);

    // Create MediaStream
    const stream = new MediaStream([consumer.track]);

    const consumerInfo: ConsumerInfo = {
      id: streamId,
      type: streamType,
      consumer,
      stream,
      producerId: params.producerId,
      participantId,
      participantName,
    };

    this.consumers.set(streamId, consumerInfo);

    this.log(`Consumer created: ${streamId}`);
    return consumerInfo;
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  /**
   * Get all consumers
   */
  getConsumers(): Map<string, ConsumerInfo> {
    return this.consumers;
  }

  /**
   * Get a specific consumer
   */
  getConsumer(streamId: string): ConsumerInfo | undefined {
    return this.consumers.get(streamId);
  }

  /**
   * Get consumers by participant ID
   */
  getConsumersByParticipant(participantId: string): ConsumerInfo[] {
    return Array.from(this.consumers.values()).filter(
      (c) => c.participantId === participantId
    );
  }

  /**
   * Get consumer by producer ID
   */
  getConsumerByProducerId(producerId: string): ConsumerInfo | undefined {
    return Array.from(this.consumers.values()).find(
      (c) => c.producerId === producerId
    );
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  /**
   * Close a specific consumer
   */
  async closeConsumer(streamId: string): Promise<void> {
    const consumerInfo = this.consumers.get(streamId);
    if (!consumerInfo) {
      return;
    }

    this.log(`Closing consumer: ${streamId}`);

    consumerInfo.consumer.close();
    
    try {
      await this.socketService.closeConsumer(consumerInfo.consumer.id);
    } catch (error) {
      this.log(`Error closing consumer on server: ${error}`);
    }

    this.consumers.delete(streamId);
  }

  /**
   * Close all consumers for a participant
   */
  async closeParticipantConsumers(participantId: string): Promise<string[]> {
    this.log(`Closing all consumers for participant: ${participantId}`);
    
    const closedStreamIds: string[] = [];
    
    for (const [streamId, consumerInfo] of this.consumers) {
      if (consumerInfo.participantId === participantId) {
        await this.closeConsumer(streamId);
        closedStreamIds.push(streamId);
      }
    }
    
    return closedStreamIds;
  }

  /**
   * Remove consumer by producer ID (when producer closes)
   */
  removeByProducerId(producerId: string): ConsumerInfo | undefined {
    for (const [streamId, consumerInfo] of this.consumers) {
      if (consumerInfo.producerId === producerId) {
        this.log(`Removing consumer by producerId: ${producerId}`);
        consumerInfo.consumer.close();
        this.consumers.delete(streamId);
        return consumerInfo;
      }
    }
    return undefined;
  }

  /**
   * Close all consumers
   */
  async closeAllConsumers(): Promise<void> {
    this.log("Closing all consumers");
    
    for (const [streamId, consumerInfo] of this.consumers) {
      try {
        consumerInfo.consumer.close();
        await this.socketService.closeConsumer(consumerInfo.consumer.id);
      } catch (error) {
        this.log(`Error closing consumer ${streamId}: ${error}`);
      }
    }
    
    this.consumers.clear();
  }

  /**
   * Reset the service
   */
  reset(): void {
    this.log("Resetting consumer service");
    
    for (const consumerInfo of this.consumers.values()) {
      consumerInfo.consumer.close();
    }
    
    this.consumers.clear();
  }
}
