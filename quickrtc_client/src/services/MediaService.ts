import { Device } from "mediasoup-client";
import type { types as MediasoupTypes } from "mediasoup-client";
import type { SocketService } from "./SocketService";
import type { ProducerInfo, StreamType } from "../types";

type Transport = MediasoupTypes.Transport;
type Producer = MediasoupTypes.Producer;
type RtpCapabilities = MediasoupTypes.RtpCapabilities;

/**
 * MediaService handles MediaSoup device, transports, and producers
 */
export class MediaService {
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers: Map<string, ProducerInfo> = new Map();
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
      console.log(`[MediaService] ${message}`, data ?? "");
    }
  }

  /**
   * Generate unique stream ID
   */
  private generateStreamId(type: StreamType): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========================================================================
  // DEVICE & TRANSPORTS
  // ========================================================================

  /**
   * Initialize the MediaSoup device
   */
  async loadDevice(routerRtpCapabilities: RtpCapabilities): Promise<Device> {
    this.log("Loading device with router capabilities");
    
    this.device = new Device();
    await this.device.load({ routerRtpCapabilities });
    
    this.log("Device loaded successfully");
    return this.device;
  }

  /**
   * Get the device
   */
  getDevice(): Device | null {
    return this.device;
  }

  /**
   * Get RTP capabilities
   */
  getRtpCapabilities(): RtpCapabilities | undefined {
    return this.device?.rtpCapabilities;
  }

  /**
   * Create and setup transports
   */
  async createTransports(): Promise<{
    sendTransport: Transport;
    recvTransport: Transport;
  }> {
    if (!this.device) {
      throw new Error("Device not loaded");
    }

    this.log("Creating transports");
    
    const { sendTransport, recvTransport } = await this.socketService.createTransports();

    // Create send transport
    this.sendTransport = this.device.createSendTransport(sendTransport as any);
    this.setupSendTransport(this.sendTransport);

    // Create receive transport
    this.recvTransport = this.device.createRecvTransport(recvTransport as any);
    this.setupRecvTransport(this.recvTransport);

    this.log("Transports created successfully");
    
    return {
      sendTransport: this.sendTransport,
      recvTransport: this.recvTransport,
    };
  }

  /**
   * Setup send transport event listeners
   */
  private setupSendTransport(transport: Transport): void {
    transport.on("connect", async (
      { dtlsParameters }: { dtlsParameters: unknown },
      callback: () => void,
      errback: (error: Error) => void
    ) => {
      try {
        this.log("Send transport connecting");
        await this.socketService.connectTransport({
          transportId: transport.id,
          dtlsParameters,
          direction: "producer",
        });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    transport.on("produce", async (
      { kind, rtpParameters, appData }: { kind: "audio" | "video"; rtpParameters: unknown; appData: Record<string, unknown> },
      callback: (params: { id: string }) => void,
      errback: (error: Error) => void
    ) => {
      try {
        this.log(`Producing ${kind}`, appData);
        const producerId = await this.socketService.produce({
          transportId: transport.id,
          kind,
          rtpParameters,
          streamType: appData?.streamType as string,
        });
        callback({ id: producerId });
      } catch (error) {
        errback(error as Error);
      }
    });

    transport.on("connectionstatechange", (state: string) => {
      this.log(`Send transport state: ${state}`);
    });
  }

  /**
   * Setup receive transport event listeners
   */
  private setupRecvTransport(transport: Transport): void {
    transport.on("connect", async (
      { dtlsParameters }: { dtlsParameters: unknown },
      callback: () => void,
      errback: (error: Error) => void
    ) => {
      try {
        this.log("Receive transport connecting");
        await this.socketService.connectTransport({
          transportId: transport.id,
          dtlsParameters,
          direction: "consumer",
        });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    transport.on("connectionstatechange", (state: string) => {
      this.log(`Receive transport state: ${state}`);
    });
  }

  /**
   * Get the receive transport (for consumers)
   */
  getRecvTransport(): Transport | null {
    return this.recvTransport;
  }

  // ========================================================================
  // PRODUCERS
  // ========================================================================

  /**
   * Produce a media track
   */
  async produce(
    track: MediaStreamTrack,
    type?: StreamType
  ): Promise<ProducerInfo> {
    if (!this.sendTransport) {
      throw new Error("Send transport not available");
    }

    // Determine stream type
    const streamType: StreamType = type || (track.kind as StreamType);
    const streamId = this.generateStreamId(streamType);

    this.log(`Producing ${streamType} track`, { streamId });

    // Create producer
    const producer = await this.sendTransport.produce({
      track,
      appData: { streamType, streamId },
      // Audio settings
      ...(track.kind === "audio" && {
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
        },
      }),
    });

    // Create MediaStream for the track
    const stream = new MediaStream([track]);

    const producerInfo: ProducerInfo = {
      id: streamId,
      type: streamType,
      track,
      producer,
      stream,
      paused: false,
    };

    this.producers.set(streamId, producerInfo);

    this.log(`Producer created: ${streamId}`);
    return producerInfo;
  }

  /**
   * Get all producers
   */
  getProducers(): Map<string, ProducerInfo> {
    return this.producers;
  }

  /**
   * Get a specific producer
   */
  getProducer(streamId: string): ProducerInfo | undefined {
    return this.producers.get(streamId);
  }

  /**
   * Pause a producer
   */
  async pauseProducer(streamId: string): Promise<void> {
    const producerInfo = this.producers.get(streamId);
    if (!producerInfo) {
      throw new Error(`Producer not found: ${streamId}`);
    }

    this.log(`Pausing producer: ${streamId}`);
    
    producerInfo.producer.pause();
    await this.socketService.pauseProducer(producerInfo.producer.id);
    producerInfo.paused = true;
  }

  /**
   * Resume a producer
   */
  async resumeProducer(streamId: string): Promise<void> {
    const producerInfo = this.producers.get(streamId);
    if (!producerInfo) {
      throw new Error(`Producer not found: ${streamId}`);
    }

    this.log(`Resuming producer: ${streamId}`);
    
    producerInfo.producer.resume();
    await this.socketService.resumeProducer(producerInfo.producer.id);
    producerInfo.paused = false;
  }

  /**
   * Stop and close a producer
   */
  async stopProducer(streamId: string): Promise<void> {
    const producerInfo = this.producers.get(streamId);
    if (!producerInfo) {
      throw new Error(`Producer not found: ${streamId}`);
    }

    this.log(`Stopping producer: ${streamId}`);

    // Stop the track
    producerInfo.track.stop();

    // Close the producer locally
    producerInfo.producer.close();

    // Notify server
    try {
      await this.socketService.closeProducer(producerInfo.producer.id);
    } catch (error) {
      this.log(`Error closing producer on server: ${error}`);
    }

    // Remove from map
    this.producers.delete(streamId);
  }

  /**
   * Check if can produce a specific kind
   */
  canProduce(kind: "audio" | "video"): boolean {
    return this.device?.canProduce(kind) ?? false;
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  /**
   * Close all producers
   */
  async closeAllProducers(): Promise<void> {
    this.log("Closing all producers");
    
    for (const [streamId, producerInfo] of this.producers) {
      try {
        producerInfo.track.stop();
        producerInfo.producer.close();
        await this.socketService.closeProducer(producerInfo.producer.id);
      } catch (error) {
        this.log(`Error closing producer ${streamId}: ${error}`);
      }
    }
    
    this.producers.clear();
  }

  /**
   * Close transports
   */
  closeTransports(): void {
    this.log("Closing transports");
    
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }
  }

  /**
   * Reset the service
   */
  reset(): void {
    this.log("Resetting media service");
    
    this.closeTransports();
    this.producers.clear();
    this.device = null;
  }
}
