import { Device } from "mediasoup-client";
import { Transport, Producer, Consumer } from "mediasoup-client/types";
import { SocketClientController } from "../controller/SocketClientController";
import { ClientSocket } from "quickrtc-types";

/**
 * Configuration for ConferenceClient
 */
export interface ConferenceClientConfig {
  conferenceId: string;
  conferenceName?: string;
  participantId: string;
  participantName: string;
  socket: ClientSocket;
}

/**
 * Remote participant information
 */
export interface RemoteParticipant {
  participantId: string;
  participantName: string;
  videoStream?: MediaStream;
  audioStream?: MediaStream;
  videoConsumer?: Consumer;
  audioConsumer?: Consumer;
}

/**
 * Local stream types
 */
export type LocalStreamType = "audio" | "video" | "screenshare";

/**
 * Local stream information
 */
export interface LocalStreamInfo {
  id: string; // Unique ID for this stream
  type: LocalStreamType;
  track: MediaStreamTrack;
  producer: Producer;
  stream: MediaStream; // For frontend display
}

/**
 * Events emitted by ConferenceClient
 */
export interface ConferenceClientEvents {
  participantJoined: { participantId: string; participantName: string };
  participantLeft: { participantId: string };
  remoteStreamAdded: {
    participantId: string;
    kind: "audio" | "video";
    stream: MediaStream;
  };
  remoteStreamRemoved: { participantId: string; kind: "audio" | "video" };
  localStreamAdded: {
    streamId: string;
    type: LocalStreamType;
    stream: MediaStream;
  };
  localStreamRemoved: { streamId: string; type: LocalStreamType };
  localAudioToggled: { streamId: string; enabled: boolean };
  localVideoToggled: { streamId: string; enabled: boolean };
  remoteAudioToggled: { participantId: string; enabled: boolean };
  remoteVideoToggled: { participantId: string; enabled: boolean };
  error: { message: string; error?: any };
}

/**
 * Simplified MediaSoup Conference Client
 *
 * Usage:
 * 1. Create client with config
 * 2. Call joinMeeting()
 * 3. Get media tracks from navigator.mediaDevices.getUserMedia()
 * 4. Extract audio/video tracks and call produceMedia(audioTrack, videoTrack) to send media
 * 5. Listen to events for remote participants
 * 6. Use toggleAudio/toggleVideo for media controls
 * 7. Call leaveMeeting() when done
 *
 * Example:
 *   const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
 *   const audioTrack = mediaStream.getAudioTracks()[0];
 *   const videoTrack = mediaStream.getVideoTracks()[0];
 *   await client.produceMedia(audioTrack, videoTrack);
 */
export class ConferenceClient extends EventTarget {
  public config: ConferenceClientConfig;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private socketController: SocketClientController | null = null;

  // Local media state - array of stream objects
  private localStreams: LocalStreamInfo[] = [];

  // Remote participants tracking
  private remoteParticipants: Map<string, RemoteParticipant> = new Map();

  // State flags
  private isJoined: boolean = false;

  constructor(config: ConferenceClientConfig) {
    super();
    this.config = config;
  }

  /**
   * 1. Join the meeting
   * Loads device, creates transports, and joins the conference
   */
  public async joinMeeting(): Promise<void> {
    if (this.isJoined) {
      throw new Error("Already joined the meeting");
    }

    try {
      // Initialize socket controller
      this.socketController = new SocketClientController(this.config.socket, {
        conferenceId: this.config.conferenceId,
        participantId: this.config.participantId,
        participantName: this.config.participantName,
        conferenceName: this.config.conferenceName,
        socketId: this.config.socket.id,
      });

      // Setup socket event listeners
      this.setupSocketEventListeners();

      // Join conference and get router capabilities
      const routerCapabilities = await this.socketController.joinConference();
      if (!routerCapabilities) {
        throw new Error("Failed to get router capabilities");
      }

      // Load device with router capabilities
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities: routerCapabilities });

      // Create send and receive transports
      const transports = await this.socketController.createTransports();
      if (!transports) {
        throw new Error("Failed to create transports");
      }

      // Setup send transport
      this.sendTransport = this.device.createSendTransport(
        transports.sendTransport
      );
      this.socketController.addSendTransportListener({
        sendTransport: this.sendTransport,
        onProduce: (params) => {
          console.log("Producer created:", params.kind, params.producerId);
        },
      });

      // Setup receive transport
      this.recvTransport = this.device.createRecvTransport(
        transports.recvTransport
      );
      this.socketController.addConsumeTransportListener({
        recvTransport: this.recvTransport,
        onConsume: (params) => {
          console.log("Consumer created:", params.kind, params.id);
        },
      });

      this.isJoined = true;
      console.log("Successfully joined meeting");
    } catch (error) {
      console.error("Error joining meeting:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to join meeting", error },
        })
      );
      throw error;
    }
  }

  /**
   * 2. Produce media to the conference
   * Takes audio and/or video tracks and sends them to other participants
   * Returns stream IDs for tracking and toggling
   * @param audioTrack - Optional audio MediaStreamTrack to produce
   * @param videoTrack - Optional video MediaStreamTrack to produce
   * @param type - Type of stream: "audio", "video", or "screenshare"
   * @returns Object with streamIds for audio and video
   */
  public async produceMedia(
    audioTrack?: MediaStreamTrack,
    videoTrack?: MediaStreamTrack,
    type: LocalStreamType = "video"
  ): Promise<{ audioStreamId?: string; videoStreamId?: string }> {
    if (!this.isJoined || !this.sendTransport) {
      throw new Error("Must join meeting before producing media");
    }

    const result: { audioStreamId?: string; videoStreamId?: string } = {};

    try {
      // Produce audio if provided
      if (audioTrack) {
        const audioProducer = await this.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
          },
        });

        const audioStreamId = `audio-${Date.now()}`;
        const audioStream = new MediaStream([audioTrack]);

        const streamInfo: LocalStreamInfo = {
          id: audioStreamId,
          type: "audio",
          track: audioTrack,
          producer: audioProducer,
          stream: audioStream,
        };

        this.localStreams.push(streamInfo);
        result.audioStreamId = audioStreamId;

        console.log(
          "Audio producer created:",
          audioProducer.id,
          "StreamID:",
          audioStreamId
        );

        // Emit event
        this.dispatchEvent(
          new CustomEvent("localStreamAdded", {
            detail: {
              streamId: audioStreamId,
              type: "audio",
              stream: audioStream,
            },
          })
        );
      }

      // Produce video if provided
      if (videoTrack) {
        const videoProducer = await this.sendTransport.produce({
          track: videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
        });

        const videoStreamId = `${type}-${Date.now()}`;
        const videoStream = new MediaStream([videoTrack]);

        const streamInfo: LocalStreamInfo = {
          id: videoStreamId,
          type: type,
          track: videoTrack,
          producer: videoProducer,
          stream: videoStream,
        };

        this.localStreams.push(streamInfo);
        result.videoStreamId = videoStreamId;

        console.log(
          "Video producer created:",
          videoProducer.id,
          "StreamID:",
          videoStreamId
        );

        // Emit event
        this.dispatchEvent(
          new CustomEvent("localStreamAdded", {
            detail: {
              streamId: videoStreamId,
              type: type,
              stream: videoStream,
            },
          })
        );
      }

      return result;
    } catch (error) {
      console.error("Error producing media:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to produce media", error },
        })
      );
      throw error;
    }
  }

  /**
   * 3. Consume existing participants' streams
   * Fetches and consumes media from all participants already in the conference
   */
  public async consumeExistingStreams(): Promise<void> {
    if (!this.isJoined || !this.device || !this.recvTransport) {
      throw new Error("Must join meeting before consuming streams");
    }

    try {
      // Get list of participants
      const participants = await this.socketController!.getParticipants();
      if (!participants || participants.length === 0) {
        console.log("No existing participants to consume");
        return;
      }

      console.log("Found existing participants:", participants);

      // Consume media from each participant (except self)
      for (const participant of participants) {
        if (participant.participantId === this.config.participantId) {
          continue; // Skip self
        }

        await this.consumeParticipantMedia(
          participant.participantId,
          participant.participantName
        );
      }
    } catch (error) {
      console.error("Error consuming existing streams:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to consume existing streams", error },
        })
      );
    }
  }

  /**
   * Helper method to consume a specific participant's media
   */
  private async consumeParticipantMedia(
    participantId: string,
    participantName?: string
  ): Promise<void> {
    if (!this.device || !this.recvTransport) {
      throw new Error("Device or receive transport not initialized");
    }

    try {
      // Get consumer parameters for this participant
      const consumerParams =
        await this.socketController!.consumeParticipantMedia(
          participantId,
          this.device.rtpCapabilities
        );

      if (!consumerParams || consumerParams.length === 0) {
        console.log(`No media to consume from participant ${participantId}`);
        return;
      }

      // Create or get participant record
      let participant = this.remoteParticipants.get(participantId);
      if (!participant) {
        // Use provided name or fallback to participantId
        const name =
          participantName || `Participant ${participantId.substring(0, 8)}`;
        participant = {
          participantId,
          participantName: name,
        };
        this.remoteParticipants.set(participantId, participant);
      }

      // Create consumers for each media type
      for (const params of consumerParams) {
        const consumer = await this.recvTransport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });

        // Resume consumer to start receiving media
        await this.socketController!.unpauseConsumer(consumer.id);

        // Create media stream from consumer track
        const stream = new MediaStream([consumer.track]);

        // Store consumer and stream
        if (params.kind === "audio") {
          participant.audioConsumer = consumer;
          participant.audioStream = stream;
        } else if (params.kind === "video") {
          participant.videoConsumer = consumer;
          participant.videoStream = stream;
        }

        // Emit event for UI to handle
        this.dispatchEvent(
          new CustomEvent("remoteStreamAdded", {
            detail: {
              participantId,
              participantName: participant.participantName,
              kind: params.kind,
              stream,
            },
          })
        );

        console.log(
          `Consuming ${params.kind} from participant ${participantId}`
        );
      }
    } catch (error) {
      console.error(
        `Error consuming media from participant ${participantId}:`,
        error
      );
    }
  }

  /**
   * 4. Stop watching a specific participant's stream
   * Closes consumers and removes streams for a participant
   */
  public async stopWatchingStream(participantId: string): Promise<void> {
    const participant = this.remoteParticipants.get(participantId);
    if (!participant) {
      console.warn(`Participant ${participantId} not found`);
      return;
    }

    try {
      // Close audio consumer
      if (participant.audioConsumer) {
        await this.socketController!.closeConsumer(
          participant.audioConsumer.id
        );
        participant.audioConsumer.close();
        participant.audioConsumer = undefined;
        participant.audioStream = undefined;

        this.dispatchEvent(
          new CustomEvent("remoteStreamRemoved", {
            detail: { participantId, kind: "audio" },
          })
        );
      }

      // Close video consumer
      if (participant.videoConsumer) {
        await this.socketController!.closeConsumer(
          participant.videoConsumer.id
        );
        participant.videoConsumer.close();
        participant.videoConsumer = undefined;
        participant.videoStream = undefined;

        this.dispatchEvent(
          new CustomEvent("remoteStreamRemoved", {
            detail: { participantId, kind: "video" },
          })
        );
      }

      // Remove participant from map
      this.remoteParticipants.delete(participantId);
      console.log(`Stopped watching stream from participant ${participantId}`);
    } catch (error) {
      console.error(
        `Error stopping stream from participant ${participantId}:`,
        error
      );
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to stop watching stream", error },
        })
      );
    }
  }

  /**
   * 5a. Toggle local audio on/off
   * Stops the audio track and closes producer when muting
   * Creates new track and producer when unmuting
   * @param streamId - ID of the audio stream to toggle, or first audio stream if not provided
   * @param mute - Explicit mute state (true = mute, false = unmute)
   */
  public async toggleAudio(
    streamId?: string,
    mute?: boolean
  ): Promise<boolean> {
    // Find the audio stream
    let audioStream: LocalStreamInfo | undefined;

    if (streamId) {
      audioStream = this.localStreams.find((s) => s.id === streamId);
      if (!audioStream || audioStream.type !== "audio") {
        console.warn(`Audio stream ${streamId} not found`);
        return false;
      }
    } else {
      // Find first audio stream
      audioStream = this.localStreams.find((s) => s.type === "audio");
    }

    if (!audioStream) {
      console.warn("No audio stream available");
      return false;
    }

    try {
      const isCurrentlyEnabled = !audioStream.producer.closed;
      const shouldMute = mute !== undefined ? mute : isCurrentlyEnabled;

      if (shouldMute) {
        // Mute: Close producer and stop track
        await this.stopLocalStream(audioStream.id);
        console.log(`Audio muted for stream ${audioStream.id}`);
        return false;
      } else {
        // This shouldn't happen - if stream exists and we want to unmute, it's already unmuted
        console.warn("Audio stream already active");
        return true;
      }
    } catch (error) {
      console.error("Error toggling audio:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to toggle audio", error },
        })
      );
      return false;
    }
  }

  /**
   * 5b. Toggle local video on/off
   * Stops the video track and closes producer when muting
   * Creates new track and producer when unmuting
   * @param streamId - ID of the video stream to toggle, or first video stream if not provided
   * @param mute - Explicit mute state (true = mute, false = unmute)
   */
  public async toggleVideo(
    streamId?: string,
    mute?: boolean
  ): Promise<boolean> {
    // Find the video stream
    let videoStream: LocalStreamInfo | undefined;

    if (streamId) {
      videoStream = this.localStreams.find((s) => s.id === streamId);
      if (
        !videoStream ||
        (videoStream.type !== "video" && videoStream.type !== "screenshare")
      ) {
        console.warn(`Video stream ${streamId} not found`);
        return false;
      }
    } else {
      // Find first video stream (not screenshare)
      videoStream = this.localStreams.find((s) => s.type === "video");
    }

    if (!videoStream) {
      console.warn("No video stream available");
      return false;
    }

    try {
      const isCurrentlyEnabled = !videoStream.producer.closed;
      const shouldMute = mute !== undefined ? mute : isCurrentlyEnabled;

      if (shouldMute) {
        // Mute: Close producer and stop track
        await this.stopLocalStream(videoStream.id);
        console.log(`Video muted for stream ${videoStream.id}`);
        return false;
      } else {
        // This shouldn't happen - if stream exists and we want to unmute, it's already unmuted
        console.warn("Video stream already active");
        return true;
      }
    } catch (error) {
      console.error("Error toggling video:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to toggle video", error },
        })
      );
      return false;
    }
  }

  /**
   * 5c. Stop a specific local stream
   * Useful for stopping screen share or individual streams
   * @param streamId - ID of the stream to stop
   */
  public async stopLocalStream(streamId: string): Promise<boolean> {
    const streamIndex = this.localStreams.findIndex((s) => s.id === streamId);

    if (streamIndex === -1) {
      console.warn(`Stream ${streamId} not found`);
      return false;
    }

    try {
      const streamInfo = this.localStreams[streamIndex];

      // Stop the track
      streamInfo.track.stop();

      // Close the producer
      await this.socketController!.closeProducer(streamInfo.producer.id);
      streamInfo.producer.close();

      // Remove from array
      this.localStreams.splice(streamIndex, 1);

      // Emit event
      this.dispatchEvent(
        new CustomEvent("localStreamRemoved", {
          detail: { streamId: streamInfo.id, type: streamInfo.type },
        })
      );

      console.log(`Stopped local stream ${streamId}`);
      return true;
    } catch (error) {
      console.error("Error stopping stream:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to stop stream", error },
        })
      );
      return false;
    }
  }

  /**
   * 6. Leave the meeting
   * Cleans up all resources and disconnects
   */
  public async leaveMeeting(): Promise<void> {
    if (!this.isJoined) {
      console.warn("Not currently in a meeting");
      return;
    }

    try {
      // Stop and close all local streams
      for (const streamInfo of this.localStreams) {
        streamInfo.track.stop();
        await this.socketController!.closeProducer(streamInfo.producer.id);
        streamInfo.producer.close();

        this.dispatchEvent(
          new CustomEvent("localStreamRemoved", {
            detail: { streamId: streamInfo.id, type: streamInfo.type },
          })
        );
      }
      this.localStreams = [];

      // Close all consumers
      for (const [participantId, participant] of this.remoteParticipants) {
        if (participant.audioConsumer) {
          await this.socketController!.closeConsumer(
            participant.audioConsumer.id
          );
          participant.audioConsumer.close();
        }
        if (participant.videoConsumer) {
          await this.socketController!.closeConsumer(
            participant.videoConsumer.id
          );
          participant.videoConsumer.close();
        }
      }
      this.remoteParticipants.clear();

      // Close transports
      if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
      }

      if (this.recvTransport) {
        this.recvTransport.close();
        this.recvTransport = null;
      }

      // Leave conference on server
      await this.socketController!.leaveConference();

      // Reset state
      this.device = null;
      this.isJoined = false;

      console.log("Successfully left meeting");
    } catch (error) {
      console.error("Error leaving meeting:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to leave meeting", error },
        })
      );
      throw error;
    }
  }

  /**
   * 7. Setup event listeners for socket events
   * Handles participant joined/left and media state changes
   */
  private setupSocketEventListeners(): void {
    if (!this.socketController) {
      return;
    }

    // Setup event listeners from socket controller
    this.socketController.setupEventListeners();

    // Participant joined
    this.socketController.addEventListener("participantJoined", ((
      event: CustomEvent
    ) => {
      const { participantId, participantName } = event.detail;
      console.log("Participant joined:", participantName, participantId);

      // Dispatch event for UI
      this.dispatchEvent(
        new CustomEvent("participantJoined", {
          detail: { participantId, participantName },
        })
      );

      // Auto-consume new participant's media
      this.consumeParticipantMedia(participantId, participantName).catch(
        (error) => {
          console.error("Error consuming new participant media:", error);
        }
      );
    }) as EventListener);

    // Participant left
    this.socketController.addEventListener("participantLeft", ((
      event: CustomEvent
    ) => {
      const { participantId } = event.detail;
      console.log("Participant left:", participantId);

      // Clean up participant
      this.stopWatchingStream(participantId);

      // Dispatch event for UI
      this.dispatchEvent(
        new CustomEvent("participantLeft", {
          detail: { participantId },
        })
      );
    }) as EventListener);

    // New producer (media track) available
    this.socketController.addEventListener("newProducer", ((
      event: CustomEvent
    ) => {
      const { producerId, participantId, participantName } = event.detail;
      console.log("New producer available:", producerId, "from", participantId);

      // Consume the new media from this participant
      this.consumeParticipantMedia(participantId, participantName).catch(
        (error) => {
          console.error("Error consuming new producer:", error);
        }
      );
    }) as EventListener);

    // Producer closed
    this.socketController.addEventListener("producerClosed", ((
      event: CustomEvent
    ) => {
      const { producerId, participantId, kind } = event.detail;
      console.log(
        `Producer closed: ${producerId} (${kind}) from participant ${participantId}`
      );

      // Find and close the corresponding consumer
      const participant = this.remoteParticipants.get(participantId);
      if (!participant) {
        return;
      }

      // Close the appropriate consumer based on kind
      if (kind === "audio" && participant.audioConsumer) {
        participant.audioConsumer.close();
        participant.audioConsumer = undefined;
        participant.audioStream = undefined;

        // Emit event for UI to remove audio
        this.dispatchEvent(
          new CustomEvent("remoteStreamRemoved", {
            detail: { participantId, kind: "audio" },
          })
        );
      } else if (kind === "video" && participant.videoConsumer) {
        participant.videoConsumer.close();
        participant.videoConsumer = undefined;
        participant.videoStream = undefined;

        // Emit event for UI to remove video
        this.dispatchEvent(
          new CustomEvent("remoteStreamRemoved", {
            detail: { participantId, kind: "video" },
          })
        );
      }

      // If both consumers are closed, remove the participant
      if (!participant.audioConsumer && !participant.videoConsumer) {
        this.remoteParticipants.delete(participantId);
      }
    }) as EventListener);

    // Consumer closed
    this.socketController.addEventListener("consumerClosed", ((
      event: CustomEvent
    ) => {
      const { consumerId } = event.detail;
      console.log("Consumer closed:", consumerId);
    }) as EventListener);

    // Socket errors    // Remote participant audio unmuted
    // Socket errors
    this.socketController.addEventListener("error", ((event: CustomEvent) => {
      console.error("Socket error:", event.detail);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Socket error", error: event.detail },
        })
      );
    }) as EventListener);
  }

  /**
   * Get list of all participants in the conference
   */
  public async getParticipants(): Promise<any[]> {
    if (!this.socketController) {
      throw new Error("Not connected to conference");
    }
    return await this.socketController.getParticipants();
  }

  /**
   * Get remote participant by ID
   */
  public getRemoteParticipant(
    participantId: string
  ): RemoteParticipant | undefined {
    return this.remoteParticipants.get(participantId);
  }

  /**
   * Get all remote participants
   */
  public getAllRemoteParticipants(): RemoteParticipant[] {
    return Array.from(this.remoteParticipants.values());
  }

  /**
   * Check if currently in a meeting
   */
  public isInMeeting(): boolean {
    return this.isJoined;
  }

  /**
   * Check if local media is enabled
   */
  public isLocalMediaEnabled(): boolean {
    return this.localStreams.length > 0;
  }

  /**
   * Get all local streams
   */
  public getLocalStreams(): LocalStreamInfo[] {
    return this.localStreams;
  }

  /**
   * Get a specific local stream by ID
   */
  public getLocalStream(streamId: string): MediaStream | null {
    const streamInfo = this.localStreams.find((s) => s.id === streamId);
    return streamInfo ? streamInfo.stream : null;
  }

  /**
   * Get local streams by type
   */
  public getLocalStreamsByType(type: LocalStreamType): LocalStreamInfo[] {
    return this.localStreams.filter((s) => s.type === type);
  }
}
