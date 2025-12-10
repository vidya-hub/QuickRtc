import type {
  Device,
  Transport,
  Producer,
  Consumer,
} from "mediasoup-client/lib/types";
import type {
  LocalStreamInfo,
  LocalStreamType,
  ProduceMediaOptions,
  ProduceMediaResult,
  RemoteParticipant,
  RemoteStreamInfo,
} from "../types";
import { socketService } from "./socketService";

/**
 * Enhanced logger for stream service
 */
const logger = {
  info: (method: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[StreamService:${method}]`;
    if (data) {
      console.info(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.info(`${timestamp} ${prefix} ${message}`);
    }
  },
  error: (method: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[StreamService:${method}]`;
    if (error) {
      console.error(`${timestamp} ${prefix} ${message}`, error);
    } else {
      console.error(`${timestamp} ${prefix} ${message}`);
    }
  },
  debug: (method: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[StreamService:${method}]`;
    if (data) {
      console.debug(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.debug(`${timestamp} ${prefix} ${message}`);
    }
  },
};

/**
 * Service for managing media streams (local and remote)
 * Handles producers and consumers
 */
export class StreamService {
  /**
   * Produce media from tracks
   */
  public async produceMedia(
    sendTransport: Transport,
    options: ProduceMediaOptions
  ): Promise<ProduceMediaResult> {
    const result: ProduceMediaResult = {};

    try {
      // Produce audio if provided
      if (options.audioTrack) {
        await sendTransport.produce({
          track: options.audioTrack,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
          },
        });

        result.audioStreamId = `audio-${Date.now()}`;
      }

      // Produce video if provided
      if (options.videoTrack) {
        await sendTransport.produce({
          track: options.videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
        });

        const type = options.type || "video";
        result.videoStreamId = `${type}-${Date.now()}`;
      }

      return result;
    } catch (error) {
      console.error("Error producing media:", error);
      throw error;
    }
  }

  /**
   * Create local stream info from track and producer
   */
  public createLocalStreamInfo(
    streamId: string,
    type: LocalStreamType,
    track: MediaStreamTrack,
    producer: Producer
  ): LocalStreamInfo {
    const stream = new MediaStream([track]);
    
    logger.info('createLocalStreamInfo', `Creating local stream info`, {
      streamId,
      type,
      producerId: producer.id,
      trackId: track.id,
      trackKind: track.kind,
    });

    return {
      id: streamId,
      type,
      track,
      producer,
      stream,
      enabled: true,
    };
  }

  /**
   * Stop local stream
   */
  public async stopLocalStream(streamInfo: LocalStreamInfo): Promise<void> {
    const METHOD = 'stopLocalStream';
    try {
      logger.info(METHOD, `Stopping local stream`, {
        streamId: streamInfo.id,
        type: streamInfo.type,
        producerId: streamInfo.producer.id,
        trackId: streamInfo.track.id,
        trackReadyState: streamInfo.track.readyState,
        producerClosed: streamInfo.producer.closed,
      });

      // Stop the track
      logger.debug(METHOD, `Stopping track ${streamInfo.track.id}`);
      streamInfo.track.stop();

      // Close the producer on server
      logger.debug(METHOD, `Closing producer ${streamInfo.producer.id} on server`);
      await socketService.closeProducer(streamInfo.producer.id);

      // Close the producer locally
      logger.debug(METHOD, `Closing producer ${streamInfo.producer.id} locally`);
      streamInfo.producer.close();
      
      logger.info(METHOD, `Successfully stopped ${streamInfo.type} stream`, {
        streamId: streamInfo.id,
        producerId: streamInfo.producer.id,
      });
    } catch (error) {
      logger.error(METHOD, `Error stopping local stream ${streamInfo.id}`, error);
      throw error;
    }
  }

  /**
   * Consume participant media
   */
  public async consumeParticipant(
    device: Device,
    recvTransport: Transport,
    participantId: string,
    participantName: string
  ): Promise<Partial<RemoteParticipant>> {
    try {
      // Get RTP capabilities
      const rtpCapabilities = device.rtpCapabilities;
      if (!rtpCapabilities) {
        throw new Error("Device RTP capabilities not available");
      }

      // Request consumer parameters from server
      const consumerParams = await socketService.consumeParticipantMedia({
        participantId,
        rtpCapabilities,
      });

      if (!consumerParams || consumerParams.length === 0) {
        console.log(`No media to consume from participant ${participantId}`);
        return {};
      }

      const result: Partial<RemoteParticipant> = {
        participantId,
        participantName,
        isAudioEnabled: false,
        isVideoEnabled: false,
        isScreenShareEnabled: false,
        streams: [],
      };

      // Create consumers for each media type
      for (const params of consumerParams) {
        const consumer = await recvTransport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });

        // Resume consumer
        await socketService.resumeConsumer(consumer.id);

        // Create media stream
        const stream = new MediaStream([consumer.track]);

        // Determine stream type from server response or fallback to kind
        const serverStreamType = (params as any).streamType;
        let streamType: "audio" | "video" | "screenshare";
        
        if (serverStreamType === 'screenshare') {
          streamType = 'screenshare';
          result.isScreenShareEnabled = true;
        } else if (params.kind === "audio" || serverStreamType === 'audio') {
          streamType = "audio";
          // Keep backward compatibility
          result.audioConsumer = consumer;
          result.audioStream = stream;
          result.isAudioEnabled = true;
        } else {
          // Video camera
          streamType = "video";
          // Keep backward compatibility
          result.videoConsumer = consumer;
          result.videoStream = stream;
          result.isVideoEnabled = true;
        }

        // Add to streams array
        const streamInfo: RemoteStreamInfo = {
          id: `${participantId}-${streamType}-${Date.now()}`,
          type: streamType,
          stream,
          consumer,
          producerId: params.producerId,
        };
        result.streams!.push(streamInfo);
      }

      return result;
    } catch (error) {
      console.error(`Error consuming participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Stop consuming participant media
   */
  public async stopConsumingParticipant(
    participant: RemoteParticipant
  ): Promise<void> {
    try {
      // Close all streams
      if (participant.streams && participant.streams.length > 0) {
        for (const streamInfo of participant.streams) {
          try {
            await socketService.closeConsumer(streamInfo.consumer.id);
            streamInfo.consumer.close();
          } catch (error) {
            console.error(`Error closing consumer ${streamInfo.consumer.id}:`, error);
          }
        }
      } else {
        // Backward compatibility: close legacy consumers
        if (participant.audioConsumer) {
          await socketService.closeConsumer(participant.audioConsumer.id);
          participant.audioConsumer.close();
        }

        if (participant.videoConsumer) {
          await socketService.closeConsumer(participant.videoConsumer.id);
          participant.videoConsumer.close();
        }
      }
    } catch (error) {
      console.error("Error stopping participant consumption:", error);
      throw error;
    }
  }

  /**
   * Close specific consumer (audio or video)
   */
  public closeConsumer(consumer: Consumer): void {
    try {
      consumer.close();
    } catch (error) {
      console.error("Error closing consumer:", error);
    }
  }
}

// Export singleton instance
export const streamService = new StreamService();
