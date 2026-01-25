import MediasoupConference from "../models/conference";
import * as mediasoup from "mediasoup";
import WorkerService from "../workers/WorkerService";
import { EnhancedEventEmitter } from "mediasoup/extras";
import { ErrorHandler, ErrorType } from "../utils/ErrorHandler";
import {
  AppState,
  Conference,
  ConferenceMap,
  ConnectTransportParams,
  ConsumeParams,
  ConsumerResponse,
  CreateTransportParams,
  JoinConferenceParams,
  ProduceParams,
  ResumeConsumerParams,
} from "quickrtc-types";
class MediasoupController extends EnhancedEventEmitter implements AppState {
  conferences: ConferenceMap;
  workerService: WorkerService;
  errorHandler: ErrorHandler;
  private cleanupInterval?: NodeJS.Timeout;
  private statsInterval?: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly STATS_INTERVAL = 30 * 1000; // 30 seconds

  constructor(workerService: WorkerService) {
    super();
    this.conferences = new Map<string, Conference>();
    this.workerService = workerService;
    this.errorHandler = new ErrorHandler();
    this.setupErrorHandling();
    this.startPeriodicCleanup();
    this.startStatsCollection();
  }
  getConferences(): ConferenceMap {
    return this.conferences;
  }
  async joinConference(params: JoinConferenceParams) {
    try {
      const {
        conferenceId,
        conferenceName,
        participantId,
        participantName,
        socketId,
        participantInfo,
      } = params;

      // Validate parameters
      if (!conferenceId || !participantId || !socketId) {
        throw this.errorHandler.handleError(
          ErrorType.VALIDATION,
          "Missing required parameters for joining conference",
          { conferenceId, participantId, socketId },
          participantId,
          conferenceId
        );
      }

      let conference = this.conferences.get(conferenceId);
      if (!conference) {
        await this.createConference(conferenceId, conferenceName);
        conference = this.conferences.get(conferenceId);
      }

      if (!conference) {
        throw this.errorHandler.handleError(
          ErrorType.CONFERENCE,
          "Failed to create or retrieve conference",
          { conferenceId },
          participantId,
          conferenceId
        );
      }

      let participant = conference.getParticipant(participantId);
      if (!participant) {
        participant = conference.createParticipant(
          participantId,
          participantName,
          socketId,
          participantInfo
        );
      }
      conference.addParticipant(participant);
      return conference;
    } catch (error) {
      if (error instanceof Error) {
        this.errorHandler.handleError(
          ErrorType.CONFERENCE,
          "Failed to join conference",
          error.message,
          params.participantId,
          params.conferenceId,
          error
        );
      }
      throw error;
    }
  }
  async createConference(conferenceId: string, name: string) {
    const worker = await this.workerService.getWorker();
    const newConference = new MediasoupConference(
      conferenceId,
      name || "Default",
      new Map(),
      conferenceId,
      worker.worker,
      worker.router
    );
    this.conferences.set(conferenceId, newConference);
    this.emit("conferenceCreated", newConference);
  }
  getConference(conferenceId: string): Conference | undefined {
    return this.conferences.get(conferenceId);
  }

  async createTransport(
    transportParams: CreateTransportParams
  ): Promise<mediasoup.types.WebRtcTransport> {
    try {
      const { conferenceId, participantId } = transportParams;

      if (!conferenceId || !participantId) {
        throw this.errorHandler.handleError(
          ErrorType.VALIDATION,
          "Missing required parameters for transport creation",
          transportParams,
          participantId,
          conferenceId
        );
      }

      const conference = this.conferences.get(conferenceId);
      if (!conference) {
        throw this.errorHandler.handleError(
          ErrorType.CONFERENCE,
          "Conference does not exist",
          { conferenceId },
          participantId,
          conferenceId
        );
      }

      const transport = await conference.createTransport(transportParams);
      return transport;
    } catch (error) {
      if (error instanceof Error) {
        this.errorHandler.handleError(
          ErrorType.TRANSPORT,
          "Failed to create transport",
          error.message,
          transportParams.participantId,
          transportParams.conferenceId,
          error
        );
      }
      throw error;
    }
  }
  async connectTransport(connectParams: ConnectTransportParams) {
    const { conferenceId } = connectParams;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    try {
      await conference.connectTransport(connectParams);
    } catch (error) {
      throw new Error(`Failed to connect transport: ${error}`);
    }
  }
  async produce(produceParams: ProduceParams): Promise<string> {
    const { conferenceId } = produceParams;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    try {
      return await conference.produce(produceParams);
    } catch (error) {
      throw new Error(`Failed to produce: ${error}`);
    }
  }
  async consume(consumeParams: ConsumeParams): Promise<ConsumerResponse> {
    const { conferenceId } = consumeParams;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    try {
      return await conference.consume(consumeParams);
    } catch (error) {
      throw new Error(`Failed to consume: ${error}`);
    }
  }
  async resumeConsumer(resumeParams: ResumeConsumerParams): Promise<void> {
    const { conferenceId } = resumeParams;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    try {
      await conference.resumeConsumer(resumeParams);
    } catch (error) {
      throw new Error(`Failed to resume consumer: ${error}`);
    }
  }

  async removeFromConference(
    conferenceId: string,
    participantId: string
  ): Promise<{
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }> {
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      return { closedProducerIds: [], closedConsumerIds: [] };
    }

    const cleanup = await conference.removeParticipant(participantId);

    // Check if conference is empty and clean it up
    if (conference.isEmpty()) {
      await this.cleanupConference(conferenceId);
    }

    this.emit("participantLeft", {
      conferenceId,
      participantId,
      ...cleanup,
    });

    return cleanup;
  }

  async userRemoveWithSocketId(socketId: string): Promise<{
    conferenceId: string | null;
    participantId: string | null;
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }> {
    for (const [conferenceId, conference] of this.conferences) {
      if (
        conference
          .getParticipants()
          .some((participant) => participant.socketId === socketId)
      ) {
        const cleanup = await conference.removeWithSocketId(socketId);

        // Check if conference is empty and clean it up
        if (conference.isEmpty()) {
          await this.cleanupConference(conferenceId);
        }

        if (cleanup.participantId) {
          this.emit("participantLeft", {
            conferenceId,
            participantId: cleanup.participantId,
            closedProducerIds: cleanup.closedProducerIds,
            closedConsumerIds: cleanup.closedConsumerIds,
          });
        }

        return {
          conferenceId,
          ...cleanup,
        };
      }
    }

    return {
      conferenceId: null,
      participantId: null,
      closedProducerIds: [],
      closedConsumerIds: [],
    };
  }

  private async cleanupConference(conferenceId: string): Promise<void> {
    const conference = this.conferences.get(conferenceId);
    if (conference) {
      await conference.cleanup();
      this.conferences.delete(conferenceId);
      this.emit("conferenceDestroyed", { conferenceId });
    }
  }
  isConferenceExists(conferenceId: string): boolean {
    return this.conferences.has(conferenceId);
  }
  async pauseProducer(params: {
    conferenceId: string;
    participantId: string;
    producerId: string;
  }): Promise<"audio" | "video" | null> {
    const { conferenceId, participantId, producerId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    return conference.pauseProducer(participantId, producerId);
  }
  getExistingProducerIds(
    participantId: string,
    conferenceId: string
  ): Array<{
    participantId: string;
    producerIds: string[];
  }> {
    const producers = this.conferences
      .get(conferenceId)
      ?.getExistingProducerIds(participantId);
    return producers ?? [];
  }
  async resumeProducer(params: {
    conferenceId: string;
    participantId: string;
    producerId: string;
  }): Promise<"audio" | "video" | null> {
    const { conferenceId, participantId, producerId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    return await conference.resumeProducer(participantId, producerId);
  }

  async pauseConsumer(params: {
    conferenceId: string;
    participantId: string;
    consumerId: string;
  }): Promise<void> {
    const { conferenceId, participantId, consumerId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    await conference.pauseConsumer(participantId, consumerId);
  }

  async closeProducer(params: {
    conferenceId: string;
    participantId: string;
    producerId: string;
  }): Promise<"audio" | "video" | null> {
    const { conferenceId, participantId, producerId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    const kind = await conference.closeProducer(participantId, producerId);

    this.emit("producerClosed", {
      conferenceId,
      participantId,
      producerId,
      kind,
    });

    console.log(
      `📹 Producer closed: ${producerId} for participant ${participantId}`
    );
    console.log(
      `[${new Date().toISOString()}] 📹 Producer closed: ${producerId}`
    );
    console.log(
      `[${new Date().toISOString()}] 👤 Participant: ${participantId}`
    );
    console.log(`[${new Date().toISOString()}] 🎭 Media kind: ${kind}`);

    return kind;
  }

  async closeConsumer(params: {
    conferenceId: string;
    participantId: string;
    consumerId: string;
  }): Promise<void> {
    const { conferenceId, participantId, consumerId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    await conference.closeConsumer(participantId, consumerId);

    this.emit("consumerClosed", {
      conferenceId,
      participantId,
      consumerId,
    });
  }

  async muteAudio(params: {
    conferenceId: string;
    participantId: string;
  }): Promise<string[]> {
    const { conferenceId, participantId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    const mutedProducerIds = await conference.muteParticipantAudio(
      participantId
    );

    this.emit("audioMuted", {
      conferenceId,
      participantId,
      mutedProducerIds,
    });

    return mutedProducerIds;
  }

  async unmuteAudio(params: {
    conferenceId: string;
    participantId: string;
  }): Promise<string[]> {
    const { conferenceId, participantId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    const unmutedProducerIds = await conference.unmuteParticipantAudio(
      participantId
    );

    this.emit("audioUnmuted", {
      conferenceId,
      participantId,
      unmutedProducerIds,
    });

    return unmutedProducerIds;
  }

  async muteVideo(params: {
    conferenceId: string;
    participantId: string;
  }): Promise<string[]> {
    const { conferenceId, participantId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    const mutedProducerIds = await conference.muteParticipantVideo(
      participantId
    );

    this.emit("videoMuted", {
      conferenceId,
      participantId,
      mutedProducerIds,
    });

    return mutedProducerIds;
  }

  async unmuteVideo(params: {
    conferenceId: string;
    participantId: string;
  }): Promise<string[]> {
    const { conferenceId, participantId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    const unmutedProducerIds = await conference.unmuteParticipantVideo(
      participantId
    );

    this.emit("videoUnmuted", {
      conferenceId,
      participantId,
      unmutedProducerIds,
    });

    return unmutedProducerIds;
  }

  getParticipantMediaStates(
    conferenceId: string,
    participantId: string
  ): Array<{
    producerId: string;
    kind: "audio" | "video";
    paused: boolean;
    closed: boolean;
  }> | null {
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      return null;
    }
    return conference.getParticipantMediaStates(participantId);
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      this.collectAndEmitStats();
    }, this.STATS_INTERVAL);
  }

  private async performPeriodicCleanup(): Promise<void> {
    try {
      // Clean up empty conferences
      const emptyConferences = Array.from(this.conferences.entries())
        .filter(([, conference]) => conference.isEmpty())
        .map(([conferenceId]) => conferenceId);

      for (const conferenceId of emptyConferences) {
        await this.cleanupConference(conferenceId);
      }

      // Clean up closed routers in WorkerService
      await this.workerService.cleanupClosedRouters();

      this.emit("cleanup", {
        cleanedConferences: emptyConferences.length,
        totalConferences: this.conferences.size,
      });
    } catch (error) {
      console.error("Error during periodic cleanup:", error);
    }
  }

  private collectAndEmitStats(): void {
    try {
      const stats = {
        conferences: this.conferences.size,
        totalParticipants: Array.from(this.conferences.values()).reduce(
          (total, conf) => total + conf.getParticipantCount(),
          0
        ),
        workerStats: this.workerService.getWorkerStats(),
        timestamp: Date.now(),
      };

      this.emit("stats", stats);
    } catch (error) {
      console.error("Error collecting stats:", error);
    }
  }

  public getStats(): {
    conferences: number;
    totalParticipants: number;
    workerStats: Array<{
      workerId: string;
      routerCount: number;
      cpuUsage: number;
      lastUsed: number;
    }>;
  } {
    return {
      conferences: this.conferences.size,
      totalParticipants: Array.from(this.conferences.values()).reduce(
        (total, conf) => total + conf.getParticipantCount(),
        0
      ),
      workerStats: this.workerService.getWorkerStats(),
    };
  }

  private setupErrorHandling(): void {
    this.errorHandler.on("error", (error) => {
      this.emit("error", error);

      // Handle critical errors
      if (error.type === ErrorType.WORKER) {
        this.handleWorkerError(error);
      }
    });
  }

  private async handleWorkerError(error: any): Promise<void> {
    console.error("Critical worker error detected:", error);
    // Implement worker recovery logic if needed
  }

  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Clean up all conferences
    const conferenceIds = Array.from(this.conferences.keys());
    for (const conferenceId of conferenceIds) {
      await this.cleanupConference(conferenceId);
    }

    this.emit("shutdown");
  }
  public getParticipants(conferenceId: string): {
    participantId: string;
    participantName: string;
    socketId: string;
    participantInfo?: Record<string, unknown>;
  }[] {
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    return conference.getParticipants().map(function (participant) {
      return {
        participantId: participant.id,
        participantName: participant.name,
        socketId: participant.socketId,
        participantInfo: participant.info,
        producers: participant.getProducerIds(),
      };
    });
  }
  public getProducersByParticipantId(
    conferenceId: string,
    participantId: string
  ): string[] {
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    const participant = conference.getParticipant(participantId);
    if (!participant) {
      throw new Error("Participant does not exist");
    }
    return participant.getProducerIds();
  }
}

export default MediasoupController;
