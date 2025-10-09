import { WebRtcTransport } from "mediasoup/types";
import {
  ConnectTransportParams,
  ConsumeParams,
  CreateTransportParams,
  ParticipantsMap,
  participantsMapToArray,
  ProduceParams as ProduceTransportParams,
} from "../types";
import Participant from "./participant";
import * as mediasoup from "mediasoup";

class Conference {
  private participants: ParticipantsMap;
  private name: string;
  private conferenceId: string;
  private socketIds: string[] = [];
  private router: mediasoup.types.Router | null = null;
  private worker: mediasoup.types.Worker;

  constructor(
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
  }

  addParticipant(participant: Participant) {
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
  getParticipants(): Participant[] {
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
  ): Participant {
    return new Participant(participantId, participantName, socketId);
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
  async produce(produceParams: ProduceTransportParams) {
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
}

export default Conference;
