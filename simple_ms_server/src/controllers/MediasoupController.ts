import MediasoupConference from "../models/conference";
import * as mediasoup from "mediasoup";
import WorkerService from "../workers/WorkerService";
import { EnhancedEventEmitter } from "mediasoup/extras";
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
} from "@simple-mediasoup/types";
class MediasoupController extends EnhancedEventEmitter implements AppState {
  conferences: ConferenceMap;
  workerService: WorkerService;
  constructor(workerService: WorkerService) {
    super();
    this.conferences = new Map<string, Conference>();
    this.workerService = workerService;
  }
  getConferences(): ConferenceMap {
    return this.conferences;
  }
  async joinConference(params: JoinConferenceParams) {
    const {
      conferenceId,
      conferenceName,
      participantId,
      participantName,
      socketId,
    } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      await this.createConference(conferenceId, conferenceName);
    }
    let participant = conference!.getParticipant(participantId);
    if (!participant) {
      participant = conference?.createParticipant(
        participantId,
        participantName,
        socketId
      );
    }
    conference?.addParticipant(participant!);
    return conference;
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
    const { conferenceId, participantId } = transportParams;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    try {
      const transport = await conference.createTransport(transportParams);
      return transport;
    } catch (error) {
      throw new Error(`Failed to create transport: ${error}`);
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

  removeFromConference(conferenceId: string, participantId: string) {
    const conference = this.conferences.get(conferenceId);
    if (conference) {
      conference.removeParticipant(participantId);
    }
  }
  userRemoveWithSocketId(socketId: string) {
    this.conferences.forEach((conference) => {
      if (
        conference
          .getParticipants()
          .some((participant) => participant.socketId === socketId)
      ) {
        conference.removeWithSocketId(socketId);
      }
    });
  }
  isConferenceExists(conferenceId: string): boolean {
    return this.conferences.has(conferenceId);
  }
  async pauseProducer(params: {
    conferenceId: string;
    participantId: string;
    producerId: string;
  }) {
    const { conferenceId, participantId, producerId } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      throw new Error("Conference does not exist");
    }
    return conference.pauseProducer(participantId, producerId);
  }
}

export default MediasoupController;
