import { RtpCapabilities, WebRtcTransport } from "mediasoup/types";
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
} from "quickrtc-types";

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
  async removeParticipant(participantId: string): Promise<{
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }> {
    const participant = this.participants.get(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      return { closedProducerIds: [], closedConsumerIds: [] };
    }

    // Clean up participant's resources
    const cleanup = await participant.cleanup();

    // Remove from participants map
    this.participants.delete(participantId);

    // Remove socket ID from the list
    this.socketIds = this.socketIds.filter((id) => id !== participant.socketId);

    return cleanup;
  }

  async removeWithSocketId(socketId: string): Promise<{
    participantId: string | null;
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }> {
    for (const [participantId, participant] of this.participants) {
      if (participant.socketId === socketId) {
        const cleanup = await this.removeParticipant(participantId);
        return {
          participantId,
          ...cleanup,
        };
      }
    }
    return {
      participantId: null,
      closedProducerIds: [],
      closedConsumerIds: [],
    };
  }
  getParticipants(): MediasoupParticipant[] {
    return this.participantsMapToArray(this.participants);
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

  getRouterRtpsCapabilities(): RtpCapabilities | undefined {
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
  pauseProducer(participantId: string, producerId: string): void {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    participant.pauseProducer(producerId);
  }
  getExistingProducerIds(currentParticipantId: string): Array<{
    participantId: string;
    producerIds: string[];
  }> {
    const producerData: Array<{
      participantId: string;
      producerIds: string[];
    }> = [];
    for (const [participantId, participant] of this.participants.entries()) {
      if (participantId === currentParticipantId) {
        continue;
      }
      const mediasoupParticipant = participant as MediasoupParticipant;
      const participantProducerIds = mediasoupParticipant.getProducerIds();
      producerData.push({
        participantId,
        producerIds: participantProducerIds,
      });
    }
    return producerData;
  }
  async resumeProducer(
    participantId: string,
    producerId: string
  ): Promise<void> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    participant.resumeProducer(producerId);
  }

  async pauseConsumer(
    participantId: string,
    consumerId: string
  ): Promise<void> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    participant.pauseConsumer(consumerId);
  }

  async closeProducer(
    participantId: string,
    producerId: string
  ): Promise<"audio" | "video" | null> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    return participant.removeProducer(producerId);
  }

  async closeConsumer(
    participantId: string,
    consumerId: string
  ): Promise<void> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    participant.removeConsumer(consumerId);
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  async muteParticipantAudio(participantId: string): Promise<string[]> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    return participant.muteAudio();
  }

  async unmuteParticipantAudio(participantId: string): Promise<string[]> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    return participant.unmuteAudio();
  }

  async muteParticipantVideo(participantId: string): Promise<string[]> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    return participant.muteVideo();
  }

  async unmuteParticipantVideo(participantId: string): Promise<string[]> {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      throw new Error("Participant does not exist in the conference");
    }
    return participant.unmuteVideo();
  }

  getParticipantMediaStates(participantId: string): Array<{
    producerId: string;
    kind: "audio" | "video";
    paused: boolean;
    closed: boolean;
  }> | null {
    const participant = this.getParticipant(
      participantId
    ) as MediasoupParticipant;
    if (!participant) {
      return null;
    }
    return participant.getMediaStates();
  }

  async cleanup(): Promise<void> {
    // Close all participants
    for (const [participantId] of this.participants) {
      await this.removeParticipant(participantId);
    }

    // Close router if it exists
    if (this.router && !this.router.closed) {
      this.router.close();
    }
  }
}

export default MediasoupConference;
