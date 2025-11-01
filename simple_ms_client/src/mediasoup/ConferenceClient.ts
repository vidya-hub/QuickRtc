import { Device } from "mediasoup-client";
import { Transport, Producer, Consumer } from "mediasoup-client/types";
import { SocketClientController } from "../controller/SocketClientController";
import { ClientSocket } from "@simple-mediasoup/types";

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
 * Events emitted by ConferenceClient
 */
export interface ConferenceClientEvents {
  participantJoined: { participantId: string; participantName: string };
  participantLeft: { participantId: string };
  remoteStreamAdded: { participantId: string; kind: "audio" | "video"; stream: MediaStream };
  remoteStreamRemoved: { participantId: string; kind: "audio" | "video" };
  localAudioToggled: { enabled: boolean };
  localVideoToggled: { enabled: boolean };
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
 * 3. Call enableMedia(audio, video)
 * 4. Listen to events for remote participants
 * 5. Use toggleAudio/toggleVideo for media controls
 * 6. Call leaveMeeting() when done
 */
export class ConferenceClient extends EventTarget {
  public config: ConferenceClientConfig;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private socketController: SocketClientController | null = null;
  
  // Local media state
  private localStream: MediaStream | null = null;
  private audioProducer: Producer | null = null;
  private videoProducer: Producer | null = null;
  
  // Remote participants tracking
  private remoteParticipants: Map<string, RemoteParticipant> = new Map();
  
  // State flags
  private isJoined: boolean = false;
  private isMediaEnabled: boolean = false;

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
      this.sendTransport = this.device.createSendTransport(transports.sendTransport);
      this.socketController.addSendTransportListener({
        sendTransport: this.sendTransport,
        onProduce: (params) => {
          console.log("Producer created:", params.kind, params.producerId);
        },
      });

      // Setup receive transport
      this.recvTransport = this.device.createRecvTransport(transports.recvTransport);
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
   * 2. Enable local media (audio/video)
   * Gets user media and creates producers
   */
  public async enableMedia(audio: boolean = true, video: boolean = true): Promise<MediaStream> {
    if (!this.isJoined || !this.sendTransport) {
      throw new Error("Must join meeting before enabling media");
    }

    if (this.isMediaEnabled) {
      console.warn("Media already enabled");
      return this.localStream!;
    }

    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });

      // Create audio producer if audio enabled
      if (audio) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          this.audioProducer = await this.sendTransport.produce({
            track: audioTrack,
            codecOptions: {
              opusStereo: true,
              opusDtx: true,
            },
          });
          console.log("Audio producer created:", this.audioProducer.id);
        }
      }

      // Create video producer if video enabled
      if (video) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          this.videoProducer = await this.sendTransport.produce({
            track: videoTrack,
            codecOptions: {
              videoGoogleStartBitrate: 1000,
            },
          });
          console.log("Video producer created:", this.videoProducer.id);
        }
      }

      this.isMediaEnabled = true;
      return this.localStream;
    } catch (error) {
      console.error("Error enabling media:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to enable media", error },
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

        await this.consumeParticipantMedia(participant.participantId, participant.participantName);
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
  private async consumeParticipantMedia(participantId: string, participantName: string): Promise<void> {
    if (!this.device || !this.recvTransport) {
      throw new Error("Device or receive transport not initialized");
    }

    try {
      // Get consumer parameters for this participant
      const consumerParams = await this.socketController!.consumeParticipantMedia(
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
        participant = {
          participantId,
          participantName,
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
              participantName,
              kind: params.kind,
              stream,
            },
          })
        );

        console.log(`Consuming ${params.kind} from participant ${participantId}`);
      }
    } catch (error) {
      console.error(`Error consuming media from participant ${participantId}:`, error);
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
        await this.socketController!.closeConsumer(participant.audioConsumer.id);
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
        await this.socketController!.closeConsumer(participant.videoConsumer.id);
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
      console.error(`Error stopping stream from participant ${participantId}:`, error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to stop watching stream", error },
        })
      );
    }
  }

  /**
   * 5a. Toggle local audio on/off
   */
  public async toggleAudio(mute?: boolean): Promise<boolean> {
    if (!this.audioProducer || !this.localStream) {
      console.warn("Audio not available");
      return false;
    }

    try {
      const shouldMute = mute !== undefined ? mute : !this.audioProducer.paused;

      if (shouldMute) {
        // Mute audio
        this.audioProducer.pause();
        this.localStream.getAudioTracks().forEach((track) => (track.enabled = false));
        await this.socketController!.pauseProducer(this.audioProducer.id);
      } else {
        // Unmute audio
        this.audioProducer.resume();
        this.localStream.getAudioTracks().forEach((track) => (track.enabled = true));
        await this.socketController!.resumeProducer(this.audioProducer.id);
      }

      this.dispatchEvent(
        new CustomEvent("localAudioToggled", {
          detail: { enabled: !shouldMute },
        })
      );

      console.log(`Audio ${shouldMute ? "muted" : "unmuted"}`);
      return !shouldMute;
    } catch (error) {
      console.error("Error toggling audio:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to toggle audio", error },
        })
      );
      return this.audioProducer.paused;
    }
  }

  /**
   * 5b. Toggle local video on/off
   */
  public async toggleVideo(mute?: boolean): Promise<boolean> {
    if (!this.videoProducer || !this.localStream) {
      console.warn("Video not available");
      return false;
    }

    try {
      const shouldMute = mute !== undefined ? mute : !this.videoProducer.paused;

      if (shouldMute) {
        // Mute video
        this.videoProducer.pause();
        this.localStream.getVideoTracks().forEach((track) => (track.enabled = false));
        await this.socketController!.pauseProducer(this.videoProducer.id);
      } else {
        // Unmute video
        this.videoProducer.resume();
        this.localStream.getVideoTracks().forEach((track) => (track.enabled = true));
        await this.socketController!.resumeProducer(this.videoProducer.id);
      }

      this.dispatchEvent(
        new CustomEvent("localVideoToggled", {
          detail: { enabled: !shouldMute },
        })
      );

      console.log(`Video ${shouldMute ? "muted" : "unmuted"}`);
      return !shouldMute;
    } catch (error) {
      console.error("Error toggling video:", error);
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Failed to toggle video", error },
        })
      );
      return this.videoProducer.paused;
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
      // Stop all local tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }

      // Close all producers
      if (this.audioProducer) {
        await this.socketController!.closeProducer(this.audioProducer.id);
        this.audioProducer.close();
        this.audioProducer = null;
      }

      if (this.videoProducer) {
        await this.socketController!.closeProducer(this.videoProducer.id);
        this.videoProducer.close();
        this.videoProducer = null;
      }

      // Close all consumers
      for (const [participantId, participant] of this.remoteParticipants) {
        if (participant.audioConsumer) {
          await this.socketController!.closeConsumer(participant.audioConsumer.id);
          participant.audioConsumer.close();
        }
        if (participant.videoConsumer) {
          await this.socketController!.closeConsumer(participant.videoConsumer.id);
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
      this.isMediaEnabled = false;

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
    this.socketController.addEventListener("participantJoined", ((event: CustomEvent) => {
      const { participantId, participantName } = event.detail;
      console.log("Participant joined:", participantName, participantId);

      // Dispatch event for UI
      this.dispatchEvent(
        new CustomEvent("participantJoined", {
          detail: { participantId, participantName },
        })
      );

      // Auto-consume new participant's media
      this.consumeParticipantMedia(participantId, participantName).catch((error) => {
        console.error("Error consuming new participant media:", error);
      });
    }) as EventListener);

    // Participant left
    this.socketController.addEventListener("participantLeft", ((event: CustomEvent) => {
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
    this.socketController.addEventListener("newProducer", ((event: CustomEvent) => {
      const { producerId, participantId } = event.detail;
      console.log("New producer available:", producerId, "from", participantId);

      // If this is from an existing participant, consume the new media
      const participant = this.remoteParticipants.get(participantId);
      if (participant) {
        this.consumeParticipantMedia(participantId, participant.participantName).catch((error) => {
          console.error("Error consuming new producer:", error);
        });
      }
    }) as EventListener);

    // Producer closed
    this.socketController.addEventListener("producerClosed", ((event: CustomEvent) => {
      const { producerId, participantId } = event.detail;
      console.log("Producer closed:", producerId, "from", participantId);
    }) as EventListener);

    // Consumer closed
    this.socketController.addEventListener("consumerClosed", ((event: CustomEvent) => {
      const { consumerId } = event.detail;
      console.log("Consumer closed:", consumerId);
    }) as EventListener);

    // Remote participant audio muted
    this.socketController.addEventListener("audioMuted", ((event: CustomEvent) => {
      const { participantId } = event.detail;
      this.dispatchEvent(
        new CustomEvent("remoteAudioToggled", {
          detail: { participantId, enabled: false },
        })
      );
    }) as EventListener);

    // Remote participant audio unmuted
    this.socketController.addEventListener("audioUnmuted", ((event: CustomEvent) => {
      const { participantId } = event.detail;
      this.dispatchEvent(
        new CustomEvent("remoteAudioToggled", {
          detail: { participantId, enabled: true },
        })
      );
    }) as EventListener);

    // Remote participant video muted
    this.socketController.addEventListener("videoMuted", ((event: CustomEvent) => {
      const { participantId } = event.detail;
      this.dispatchEvent(
        new CustomEvent("remoteVideoToggled", {
          detail: { participantId, enabled: false },
        })
      );
    }) as EventListener);

    // Remote participant video unmuted
    this.socketController.addEventListener("videoUnmuted", ((event: CustomEvent) => {
      const { participantId } = event.detail;
      this.dispatchEvent(
        new CustomEvent("remoteVideoToggled", {
          detail: { participantId, enabled: true },
        })
      );
    }) as EventListener);

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
  public getRemoteParticipant(participantId: string): RemoteParticipant | undefined {
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
    return this.isMediaEnabled;
  }

  /**
   * Get local media stream
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}
