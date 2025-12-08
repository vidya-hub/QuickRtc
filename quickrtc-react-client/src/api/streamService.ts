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
} from "../types";
import { socketService } from "./socketService";

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
    try {
      // Stop the track
      streamInfo.track.stop();

      // Close the producer on server
      await socketService.closeProducer(streamInfo.producer.id);

      // Close the producer locally
      streamInfo.producer.close();
    } catch (error) {
      console.error("Error stopping local stream:", error);
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

        // Store consumer and stream
        if (params.kind === "audio") {
          result.audioConsumer = consumer;
          result.audioStream = stream;
          result.isAudioEnabled = true;
        } else if (params.kind === "video") {
          result.videoConsumer = consumer;
          result.videoStream = stream;
          result.isVideoEnabled = true;
        }
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
      // Close audio consumer
      if (participant.audioConsumer) {
        await socketService.closeConsumer(participant.audioConsumer.id);
        participant.audioConsumer.close();
      }

      // Close video consumer
      if (participant.videoConsumer) {
        await socketService.closeConsumer(participant.videoConsumer.id);
        participant.videoConsumer.close();
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
