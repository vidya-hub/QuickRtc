import type { Socket } from "socket.io-client";
import { SocketService, MediaService, ConsumerService } from "./services";
import type {
  QuickRTCConfig,
  JoinConfig,
  QuickRTCEvents,
  EventHandler,
  LocalStream,
  RemoteStream,
  ProduceInput,
  TrackWithType,
  Participant,
  ProducerInfo,
  StreamType,
  ParticipantJoinedData,
  ParticipantLeftData,
  NewProducerData,
  ProducerClosedData,
  NewParticipantEvent,
} from "./types";

/**
 * QuickRTC - Simple WebRTC conferencing client
 * 
 * @example
 * ```typescript
 * const rtc = new QuickRTC({ socket });
 * 
 * // Listen for new participants with their streams ready
 * rtc.on("newParticipant", ({ participantId, participantName, streams }) => {
 *   console.log(`${participantName} joined with ${streams.length} streams`);
 *   // streams are already consumed and ready to use!
 * });
 * 
 * rtc.on("streamRemoved", ({ streamId }) => {
 *   // Remove stream from UI
 * });
 * 
 * // Join a conference
 * await rtc.join({
 *   conferenceId: "room-123",
 *   participantName: "Alice"
 * });
 * 
 * // Produce media - pass tracks from any source
 * const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
 * const localStreams = await rtc.produce(stream.getTracks());
 * 
 * // Or produce screen share
 * const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
 * const [screenShare] = await rtc.produce(screenStream.getVideoTracks());
 * 
 * // Leave
 * await rtc.leave();
 * ```
 */
export class QuickRTC {
  // Services
  private socketService: SocketService;
  private mediaService: MediaService;
  private consumerService: ConsumerService;

  // State
  private _isConnected: boolean = false;
  private _conferenceId: string | null = null;
  private _participantId: string | null = null;
  private _participantName: string | null = null;
  private _participants: Map<string, Participant> = new Map();
  
  // Track consumed producers to avoid duplicates
  private _consumedProducerIds: Set<string> = new Set();

  // Configuration
  private config: QuickRTCConfig;
  private maxParticipants: number;
  private debug: boolean;

  // Event handlers
  private eventHandlers: Map<keyof QuickRTCEvents, Set<EventHandler<any>>> = new Map();

  constructor(config: QuickRTCConfig) {
    this.config = config;
    this.maxParticipants = config.maxParticipants ?? 0;
    this.debug = config.debug ?? false;

    // Initialize services
    this.socketService = new SocketService(config.socket, this.debug);
    this.mediaService = new MediaService(this.socketService, this.debug);
    this.consumerService = new ConsumerService(this.socketService, this.debug);
  }

  // ========================================================================
  // LOGGING
  // ========================================================================

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[QuickRTC] ${message}`, data ?? "");
    }
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  /** Whether connected to a conference */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /** Current conference ID */
  get conferenceId(): string | null {
    return this._conferenceId;
  }

  /** Current participant ID */
  get participantId(): string | null {
    return this._participantId;
  }

  /** Current participant name */
  get participantName(): string | null {
    return this._participantName;
  }

  /** Map of local streams */
  get localStreams(): Map<string, LocalStream> {
    const streams = new Map<string, LocalStream>();
    
    for (const [id, info] of this.mediaService.getProducers()) {
      streams.set(id, this.createLocalStreamHandle(info));
    }
    
    return streams;
  }

  /** Map of remote participants */
  get participants(): Map<string, Participant> {
    return new Map(this._participants);
  }

  /** Map of remote streams */
  get remoteStreams(): Map<string, RemoteStream> {
    const streams = new Map<string, RemoteStream>();
    
    for (const [id, info] of this.consumerService.getConsumers()) {
      streams.set(id, {
        id: info.id,
        type: info.type,
        stream: info.stream,
        producerId: info.producerId,
        participantId: info.participantId,
        participantName: info.participantName,
      });
    }
    
    return streams;
  }

  // ========================================================================
  // CONNECTION
  // ========================================================================

  /**
   * Join a conference
   */
  async join(config: JoinConfig): Promise<void> {
    if (this._isConnected) {
      throw new Error("Already connected to a conference");
    }

    this.log("Joining conference", config);

    // Generate participant ID if not provided
    const participantId = config.participantId || this.generateParticipantId();

    try {
      // Set socket context
      this.socketService.setContext(config.conferenceId, participantId);

      // Setup socket event listeners
      this.setupSocketListeners();

      // Join conference and get router capabilities
      const { routerCapabilities } = await this.socketService.joinConference({
        conferenceId: config.conferenceId,
        conferenceName: config.conferenceName,
        participantId,
        participantName: config.participantName,
        participantInfo: config.participantInfo,
      });

      // Load device
      await this.mediaService.loadDevice(routerCapabilities);

      // Create transports
      await this.mediaService.createTransports();

      // Update state
      this._isConnected = true;
      this._conferenceId = config.conferenceId;
      this._participantId = participantId;
      this._participantName = config.participantName;

      this.log("Successfully joined conference");

      // Emit connected event
      this.emit("connected", {
        conferenceId: config.conferenceId,
        participantId,
      });

      // Auto-consume existing participants
      await this.consumeExistingParticipants();

    } catch (error) {
      this.log("Failed to join conference", error);
      this.emit("error", {
        message: "Failed to join conference",
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Auto-consume all existing participants in the conference
   * Called after successfully joining
   */
  private async consumeExistingParticipants(): Promise<void> {
    this.log("Fetching and consuming existing participants...");

    try {
      const participants = await this.socketService.getParticipants();
      
      for (const p of participants) {
        // Skip self
        if (p.participantId === this._participantId) continue;

        // Store participant
        const participant: Participant = {
          id: p.participantId,
          name: p.participantName,
          info: p.participantInfo || {},
        };
        this._participants.set(p.participantId, participant);

        // Consume their streams (may be empty)
        const streams = await this.consumeParticipantInternal(p.participantId, p.participantName, p.participantInfo || {});

        this.log(`Existing participant: ${p.participantName} with ${streams.length} streams`);
        
        // Always emit newParticipant (even with empty streams)
        this.emit("newParticipant", {
          participantId: p.participantId,
          participantName: p.participantName,
          participantInfo: p.participantInfo || {},
          streams,
        });
      }
    } catch (error) {
      this.log("Error consuming existing participants", error);
      // Don't throw - this shouldn't break the join flow
    }
  }

  /**
   * Leave the conference
   */
  async leave(): Promise<void> {
    if (!this._isConnected) {
      return;
    }

    this.log("Leaving conference");

    try {
      // Close all producers
      await this.mediaService.closeAllProducers();

      // Close all consumers
      await this.consumerService.closeAllConsumers();

      // Leave conference on server
      await this.socketService.leaveConference();

    } catch (error) {
      this.log("Error during leave", error);
    } finally {
      // Cleanup
      this.cleanup();

      this.emit("disconnected", { reason: "user_left" });
    }
  }

  /**
   * Cleanup all resources
   */
  private cleanup(): void {
    // Remove socket listeners
    this.socketService.removeAllListeners();

    // Reset services
    this.mediaService.reset();
    this.consumerService.reset();

    // Reset state
    this._isConnected = false;
    this._conferenceId = null;
    this._participantId = null;
    this._participantName = null;
    this._participants.clear();
    this._consumedProducerIds.clear();
  }

  // ========================================================================
  // PRODUCING
  // ========================================================================

  /**
   * Produce media tracks
   * 
   * Accepts:
   * - Single track: `produce(track)`
   * - Array of tracks: `produce([audioTrack, videoTrack])`
   * - Track with type hint: `produce({ track, type: "screenshare" })`
   * - Array of tracks with types: `produce([{ track: screenTrack, type: "screenshare" }])`
   * 
   * @returns Array of LocalStream handles with pause/resume/stop methods
   * 
   * @example
   * ```typescript
   * // From getUserMedia
   * const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
   * const localStreams = await rtc.produce(stream.getTracks());
   * 
   * // Screen share with type hint
   * const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
   * const [screenStream] = await rtc.produce({ track: screen.getVideoTracks()[0], type: "screenshare" });
   * ```
   */
  async produce(input: ProduceInput): Promise<LocalStream[]> {
    if (!this._isConnected) {
      throw new Error("Not connected to a conference");
    }

    // Normalize input to array of TrackWithType
    const tracksWithTypes = this.normalizeProduceInput(input);
    
    this.log("Producing tracks", { count: tracksWithTypes.length });

    const results: LocalStream[] = [];

    for (const { track, type } of tracksWithTypes) {
      const streamType = type || this.inferStreamType(track);
      this.log("Producing track", { kind: track.kind, type: streamType });

      const producerInfo = await this.mediaService.produce(track, streamType);
      
      // Handle native track ended (e.g., browser "Stop sharing" button)
      track.onended = async () => {
        this.log(`Track ended externally: ${producerInfo.id} (${streamType})`);
        
        // Only cleanup if we still have this producer
        if (this.mediaService.getProducer(producerInfo.id)) {
          await this.stop(producerInfo.id);
          
          // Emit event so app can update its state
          this.emit("localStreamEnded", {
            streamId: producerInfo.id,
            type: streamType,
          });
        }
      };
      
      results.push(this.createLocalStreamHandle(producerInfo));
    }

    return results;
  }

  /**
   * Normalize produce input to array of TrackWithType
   */
  private normalizeProduceInput(input: ProduceInput): TrackWithType[] {
    // Single MediaStreamTrack
    if (input instanceof MediaStreamTrack) {
      return [{ track: input }];
    }

    // Array of MediaStreamTracks
    if (Array.isArray(input) && input.length > 0 && input[0] instanceof MediaStreamTrack) {
      return (input as MediaStreamTrack[]).map(track => ({ track }));
    }

    // Single TrackWithType
    if (!Array.isArray(input) && 'track' in input) {
      return [input as TrackWithType];
    }

    // Array of TrackWithType
    if (Array.isArray(input)) {
      return input as TrackWithType[];
    }

    return [];
  }

  /**
   * Infer stream type from track kind
   */
  private inferStreamType(track: MediaStreamTrack): StreamType {
    return track.kind === "audio" ? "audio" : "video";
  }

  /**
   * Create LocalStream handle from ProducerInfo
   */
  private createLocalStreamHandle(info: ProducerInfo): LocalStream {
    return {
      id: info.id,
      type: info.type,
      stream: info.stream,
      track: info.track,
      paused: info.paused,
      pause: () => this.pause(info.id),
      resume: () => this.resume(info.id),
      stop: () => this.stop(info.id),
    };
  }

  /**
   * Pause a local stream
   */
  async pause(streamId: string): Promise<void> {
    this.log("Pausing stream", streamId);
    await this.mediaService.pauseProducer(streamId);
  }

  /**
   * Resume a local stream
   */
  async resume(streamId: string): Promise<void> {
    this.log("Resuming stream", streamId);
    await this.mediaService.resumeProducer(streamId);
  }

  /**
   * Stop a local stream
   */
  async stop(streamId: string): Promise<void> {
    this.log("Stopping stream", streamId);
    await this.mediaService.stopProducer(streamId);
  }

  // ========================================================================
  // CONSUMING (Internal - auto-handled)
  // ========================================================================

  /**
   * Internal: Consume all media from a participant
   * Returns array of RemoteStream objects
   * 
   * This is called automatically:
   * - When joining (for existing participants)
   * - When a new producer is detected
   */
  private async consumeParticipantInternal(
    participantId: string,
    participantName: string,
    participantInfo: Record<string, unknown>
  ): Promise<RemoteStream[]> {
    if (!this._isConnected) {
      return [];
    }

    // Ensure participant is in our map
    if (!this._participants.has(participantId)) {
      this._participants.set(participantId, {
        id: participantId,
        name: participantName,
        info: participantInfo,
      });
    }

    this.log("Consuming participant", { participantId, name: participantName });

    const recvTransport = this.mediaService.getRecvTransport();
    const rtpCapabilities = this.mediaService.getRtpCapabilities();

    if (!recvTransport || !rtpCapabilities) {
      this.log("Transport not ready, skipping consume");
      return [];
    }

    try {
      const consumerInfos = await this.consumerService.consumeParticipant(
        recvTransport,
        rtpCapabilities,
        participantId,
        participantName
      );

      const streams: RemoteStream[] = [];

      for (const info of consumerInfos) {
        // Skip if we already have this producer consumed
        if (this._consumedProducerIds.has(info.producerId)) {
          this.log(`Skipping already consumed producer: ${info.producerId}`);
          continue;
        }

        // Track this producer as consumed
        this._consumedProducerIds.add(info.producerId);

        const remoteStream: RemoteStream = {
          id: info.id,
          type: info.type,
          stream: info.stream,
          producerId: info.producerId,
          participantId: info.participantId,
          participantName: info.participantName,
        };

        streams.push(remoteStream);
      }

      return streams;
    } catch (error) {
      this.log("Error consuming participant", error);
      return [];
    }
  }

  /**
   * Check if we've already consumed a specific producer
   */
  private hasConsumedProducer(producerId: string): boolean {
    return this._consumedProducerIds.has(producerId);
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /**
   * Subscribe to an event
   */
  on<K extends keyof QuickRTCEvents>(
    event: K,
    handler: EventHandler<QuickRTCEvents[K]>
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof QuickRTCEvents>(
    event: K,
    handler: EventHandler<QuickRTCEvents[K]>
  ): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit an event
   */
  private emit<K extends keyof QuickRTCEvents>(
    event: K,
    data: QuickRTCEvents[K]
  ): void {
    this.log(`Event: ${event}`, data);
    
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  // ========================================================================
  // SOCKET EVENTS
  // ========================================================================

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    // Participant joined - emit newParticipant immediately (even with empty streams)
    this.socketService.on<ParticipantJoinedData>("participantJoined", (data) => {
      this.log("Socket: participantJoined", data);

      // Check max participants
      if (this.maxParticipants > 0 && this._participants.size >= this.maxParticipants) {
        this.log("Max participants reached, ignoring new participant");
        return;
      }

      const participant: Participant = {
        id: data.participantId,
        name: data.participantName,
        info: data.participantInfo || {},
      };

      this._participants.set(data.participantId, participant);
      
      // Emit newParticipant immediately with empty streams
      // When they start producing, we'll emit streamAdded
      this.emit("newParticipant", {
        participantId: data.participantId,
        participantName: data.participantName,
        participantInfo: data.participantInfo || {},
        streams: [],
      });
    });

    // Participant left
    this.socketService.on<ParticipantLeftData>("participantLeft", (data) => {
      this.log("Socket: participantLeft", data);

      // Close all consumers for this participant
      const closedStreams = this.consumerService.getConsumersByParticipant(data.participantId);
      
      for (const stream of closedStreams) {
        // Remove from consumed tracking
        this._consumedProducerIds.delete(stream.producerId);
        
        this.emit("streamRemoved", {
          participantId: data.participantId,
          streamId: stream.id,
          type: stream.type,
        });
      }

      this.consumerService.closeParticipantConsumers(data.participantId);
      this._participants.delete(data.participantId);

      this.emit("participantLeft", {
        participantId: data.participantId,
      });
    });

    // New producer - auto-consume and emit streamAdded for existing participants
    this.socketService.on<NewProducerData>("newProducer", async (data) => {
      this.log("Socket: newProducer", data);
      
      // Check if we already consumed this producer
      if (this.hasConsumedProducer(data.producerId)) {
        this.log(`Already consumed producer ${data.producerId}, skipping`);
        return;
      }
      
      // Check if this participant is already known
      let participant = this._participants.get(data.participantId);
      const isNewParticipant = !participant;
      
      if (!participant) {
        // Edge case: participantJoined event missed or arrived late
        participant = {
          id: data.participantId,
          name: data.participantName,
          info: {},
        };
        this._participants.set(data.participantId, participant);
      }
      
      // Auto-consume this participant's streams
      const streams = await this.consumeParticipantInternal(
        data.participantId,
        data.participantName,
        participant.info
      );
      
      if (streams.length > 0) {
        this.log(`Auto-consumed ${streams.length} streams from ${data.participantName}`);
        
        if (isNewParticipant) {
          // Edge case: Emit newParticipant if we missed the participantJoined event
          this.emit("newParticipant", {
            participantId: data.participantId,
            participantName: data.participantName,
            participantInfo: participant.info,
            streams,
          });
        } else {
          // Existing participant added new stream(s) - emit streamAdded for each
          for (const stream of streams) {
            this.emit("streamAdded", stream);
          }
        }
      }
    });

    // Producer closed
    this.socketService.on<ProducerClosedData>("producerClosed", (data) => {
      this.log("Socket: producerClosed", data);

      // Remove from consumed tracking
      this._consumedProducerIds.delete(data.producerId);

      const consumerInfo = this.consumerService.removeByProducerId(data.producerId);
      
      if (consumerInfo) {
        this.emit("streamRemoved", {
          participantId: data.participantId,
          streamId: consumerInfo.id,
          type: consumerInfo.type,
        });
      }
    });

    // Socket disconnect
    this.socketService.on<string>("disconnect", (reason) => {
      this.log("Socket: disconnected", reason);
      
      if (this._isConnected) {
        this.cleanup();
        this.emit("disconnected", { reason });
      }
    });

    // Socket error
    this.socketService.on<Error>("error", (error) => {
      this.log("Socket: error", error);
      this.emit("error", { message: error.message, error });
    });
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Generate a unique participant ID
   */
  private generateParticipantId(): string {
    return `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get existing participants from server
   */
  async getParticipants(): Promise<Participant[]> {
    if (!this._isConnected) {
      throw new Error("Not connected to a conference");
    }

    const participants = await this.socketService.getParticipants();
    
    // Update local cache
    for (const p of participants) {
      if (p.participantId !== this._participantId) {
        this._participants.set(p.participantId, {
          id: p.participantId,
          name: p.participantName,
          info: p.participantInfo || {},
        });
      }
    }

    return Array.from(this._participants.values());
  }
}
