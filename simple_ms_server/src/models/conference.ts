import { WebRtcTransport } from "mediasoup/types";
import MediasoupParticipant from "./participant";
import * as mediasoup from "mediasoup";
import {
  Conference,
  ConnectTransportParams,
  ConsumeParams,
  CreateTransportParams,
  Participant,
  ParticipantsMap,
  ProduceParams,
  ResumeConsumerParams,
} from "@simple-mediasoup/types";

class MediasoupConference implements Conference {
  public participants: ParticipantsMap;
  public name: string;
  public conferenceId: string;
  public socketIds: string[] = [];
  public router: mediasoup.types.Router | null = null;
  public worker: mediasoup.types.Worker;
  public id: string;
  constructor(
    id: string,
    name: string,
    participants: ParticipantsMap,
    conferenceId: string,
    worker: mediasoup.types.Worker,
    router: mediasoup.types.Router | null = null
  ) {
    this.name = name;
    this.participants = participants;
    this.conferenceId = conferenceId;
    this.worker = worker;
    this.router = router;
    this.id = id;
  }

  addParticipant(participant: MediasoupParticipant) {
    this.participants.set(participant.id, participant);
    this.socketIds.push(participant.socketId);
  }
  removeParticipant(participantId: string) {
    this.participants.delete(participantId);
  }
  removeWithSocketId(socketId: string) {
    for (const [participantId, participant] of this.participants) {
      if (participant.socketId === socketId) {
        this.participants.delete(participantId);
      }
    }
  }
  getParticipants(): MediasoupParticipant[] {
    return participantsMapToArray(this.participants);
  }
  getParticipant(participantId: string): Participant | undefined {
    return this.participants.get(participantId);
  }
  getName(): string {
    return this.name;
  }
  getConferenceId(): string {
    return this.conferenceId;
  }

  getRouterRtpsCapabilities() {
    return this.router?.rtpCapabilities;
  }

  getRouter(): mediasoup.types.Router | null {
    return this.router;
  }

  getWorker(): mediasoup.types.Worker {
    return this.worker;
  }

  createParticipant(
    participantId: string,
    participantName: string,
    socketId: string
  ): MediasoupParticipant {
    return new MediasoupParticipant(participantId, participantName, socketId);
  }
  async createTransport(
    transportParams: CreateTransportParams
  ): Promise<WebRtcTransport> {
    const { participantId } = transportParams;
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    const router = this.getRouter();
    if (!router) {
      throw new Error("Router is not initialized for the conference");
    }
    const transport = await participant.createTransport(
      router,
      transportParams
    );

    return transport;
  }

  async connectTransport(connectParams: ConnectTransportParams) {
    const { participantId, dtlsParameters, direction } = connectParams;
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    try {
      await participant.connectTransport(direction, dtlsParameters);
    } catch (error) {
      throw new Error(`Failed to connect transport: ${error}`);
    }
  }
  async produce(produceParams: ProduceParams) {
    const { participantId } = produceParams;
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    try {
      const producer = await participant.produce(produceParams);
      return producer;
    } catch (error) {
      throw new Error(`Failed to produce: ${error}`);
    }
  }
  async consume(consumeParams: ConsumeParams) {
    const { participantId } = consumeParams;
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    try {
      const consumer = await participant.consume(consumeParams);
      return consumer;
    } catch (error) {
      throw new Error(`Failed to consume: ${error}`);
    }
  }
  async resumeConsumer(resumeParams: ResumeConsumerParams) {
    const { participantId, consumerId } = resumeParams;
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    try {
      await participant.resumeConsumer(consumerId);
    } catch (error) {
      throw new Error(`Failed to resume consumer: ${error}`);
    }
  }

  participantsMapToArray(
    participantsMap: ParticipantsMap
  ): MediasoupParticipant[] {
    return Array.from(participantsMap.values()) as MediasoupParticipant[];
  }
}

function participantsMapToArray(
  participantsMap: ParticipantsMap
): MediasoupParticipant[] {
  return Array.from(participantsMap.values()) as MediasoupParticipant[];
}

export default MediasoupConference;
