import { EnhancedEventEmitter } from "mediasoup/extras";
import * as mediasoup from "mediasoup";
import { AppData, DtlsParameters, Router, Transport } from "mediasoup/types";
import {
  ConsumeParams,
  ConsumerResponse,
  ConsumersToUsers,
  CreateTransportParams,
  ProduceParams,
  ProducersToUsers,
  Participant,
} from "@simple-mediasoup/types";
class MediasoupParticipant implements Participant {
  id: string;
  socketId: string;
  name: string;
  producerTransport?: mediasoup.types.Transport;
  consumerTransport?: mediasoup.types.Transport;
  producers: ProducersToUsers;
  consumers: ConsumersToUsers;
  private mediaStates: Map<
    string,
    {
      kind: "audio" | "video";
      paused: boolean;
      closed: boolean;
    }
  > = new Map();

  constructor(id: string, name: string, socketId: string) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
    this.producers = new Map();
    this.consumers = new Map();
  }
  setProducerTransport(transport: Transport) {
    this.producerTransport = transport;
  }
  setConsumerTransport(transport: Transport) {
    this.consumerTransport = transport;
  }
  addProducer(producer: mediasoup.types.Producer) {
    const userProducers = this.producers.get(this.id) || {};
    userProducers[producer.id] = producer;
    this.producers.set(this.id, userProducers);
  }
  addConsumer(consumer: mediasoup.types.Consumer) {
    const userConsumers = this.consumers.get(this.id) || {};
    userConsumers[consumer.id] = consumer;
    this.consumers.set(this.id, userConsumers);
  }
  removeProducer(producerId: string) {
    const userProducers = this.producers.get(this.id);
    if (userProducers && userProducers[producerId]) {
      const producer = userProducers[producerId];
      producer.close();
      delete userProducers[producerId];
      this.producers.set(this.id, userProducers);
      this.updateMediaState(producerId, { closed: true });
    }
  }

  removeConsumer(consumerId: string) {
    const userConsumers = this.consumers.get(this.id);
    if (userConsumers && userConsumers[consumerId]) {
      const consumer = userConsumers[consumerId];
      consumer.close();
      delete userConsumers[consumerId];
      this.consumers.set(this.id, userConsumers);
    }
  }

  async closeAllProducers(): Promise<string[]> {
    const userProducers = this.producers.get(this.id);
    const closedProducerIds: string[] = [];
    if (userProducers) {
      for (const [producerId, producer] of Object.entries(userProducers)) {
        try {
          producer.close();
          closedProducerIds.push(producerId);
        } catch (error) {
          console.error(`Error closing producer ${producerId}:`, error);
        }
      }
      this.producers.set(this.id, {});
    }
    return closedProducerIds;
  }

  async closeAllConsumers(): Promise<string[]> {
    const userConsumers = this.consumers.get(this.id);
    const closedConsumerIds: string[] = [];
    if (userConsumers) {
      for (const [consumerId, consumer] of Object.entries(userConsumers)) {
        try {
          consumer.close();
          closedConsumerIds.push(consumerId);
        } catch (error) {
          console.error(`Error closing consumer ${consumerId}:`, error);
        }
      }
      this.consumers.set(this.id, {});
    }
    return closedConsumerIds;
  }

  async closeTransports(): Promise<void> {
    try {
      if (this.producerTransport && !this.producerTransport.closed) {
        this.producerTransport.close();
      }
      if (this.consumerTransport && !this.consumerTransport.closed) {
        this.consumerTransport.close();
      }
    } catch (error) {
      console.error("Error closing transports:", error);
    }
  }

  async cleanup(): Promise<{
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }> {
    const closedProducerIds = await this.closeAllProducers();
    const closedConsumerIds = await this.closeAllConsumers();
    await this.closeTransports();
    return { closedProducerIds, closedConsumerIds };
  }
  async createTransport(
    router: Router<AppData>,
    createTransportParams: CreateTransportParams
  ) {
    if (!createTransportParams.options) {
      throw new Error("Transport options are required");
    }
    const transport = await router.createWebRtcTransport(
      createTransportParams.options
    );
    if (createTransportParams.direction === "producer") {
      this.setProducerTransport(transport);
    } else if (createTransportParams.direction === "consumer") {
      this.setConsumerTransport(transport);
    }
    return transport; // Return the transport to avoid unused variable warning
  }
  async connectTransport(direction: string, dtlsParameters: DtlsParameters) {
    if (direction === "producer" && this.producerTransport) {
      await this.producerTransport.connect({ dtlsParameters });
    } else if (direction === "consumer" && this.consumerTransport) {
      await this.consumerTransport.connect({ dtlsParameters });
    } else {
      throw new Error("Transport not found for the given direction");
    }
  }
  async produce(produceParams: ProduceParams) {
    if (!this.producerTransport) {
      throw new Error("Producer transport is not established");
    }
    const { producerOptions } = produceParams;
    const producer = await this.producerTransport.produce(producerOptions);
    this.addProducer(producer);

    // Track media state
    this.setMediaState(
      producer.id,
      producer.kind as "audio" | "video",
      false,
      false
    );

    return producer.id;
  }
  async consume(consumeParams: ConsumeParams) {
    if (!this.consumerTransport) {
      throw new Error("Consumer transport is not established");
    }
    const { producerId, rtpCapabilities } = consumeParams.consumeOptions;
    const consumer = await this.consumerTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });
    const consumerParams: ConsumerResponse = {
      producerId: producerId,
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      producerUserId: this.id,
      type: consumer.kind,
    };

    this.addConsumer(consumer);
    return consumerParams;
  }
  async resumeConsumer(consumerId: string) {
    const userConsumers = this.consumers.get(this.id);
    if (userConsumers && userConsumers[consumerId]) {
      const consumer = userConsumers[consumerId];
      await consumer.resume();
    } else {
      throw new Error("Consumer not found");
    }
  }
  public pauseProducer(producerId: string): void {
    const userProducers = this.producers.get(this.id);
    if (userProducers && userProducers[producerId]) {
      const producer = userProducers[producerId];
      producer.pause();
      this.updateMediaState(producerId, { paused: true });
    } else {
      throw new Error("Producer not found");
    }
  }

  public resumeProducer(producerId: string): void {
    const userProducers = this.producers.get(this.id);
    if (userProducers && userProducers[producerId]) {
      const producer = userProducers[producerId];
      producer.resume();
      this.updateMediaState(producerId, { paused: false });
    } else {
      throw new Error("Producer not found");
    }
  }

  public pauseConsumer(consumerId: string): void {
    const userConsumers = this.consumers.get(this.id);
    if (userConsumers && userConsumers[consumerId]) {
      const consumer = userConsumers[consumerId];
      consumer.pause();
    } else {
      throw new Error("Consumer not found");
    }
  }

  public getProducerById(producerId: string): mediasoup.types.Producer | null {
    const userProducers = this.producers.get(this.id);
    return userProducers?.[producerId] || null;
  }

  public getConsumerById(consumerId: string): mediasoup.types.Consumer | null {
    const userConsumers = this.consumers.get(this.id);
    return userConsumers?.[consumerId] || null;
  }

  public getAllProducers(): mediasoup.types.Producer[] {
    const userProducers = this.producers.get(this.id);
    return userProducers ? Object.values(userProducers) : [];
  }

  public getAllConsumers(): mediasoup.types.Consumer[] {
    const userConsumers = this.consumers.get(this.id);
    return userConsumers ? Object.values(userConsumers) : [];
  }

  public getMediaState(producerId: string): {
    kind: "audio" | "video";
    paused: boolean;
    closed: boolean;
  } | null {
    return this.mediaStates.get(producerId) || null;
  }

  public setMediaState(
    producerId: string,
    kind: "audio" | "video",
    paused: boolean = false,
    closed: boolean = false
  ): void {
    this.mediaStates.set(producerId, { kind, paused, closed });
  }

  public updateMediaState(
    producerId: string,
    updates: { paused?: boolean; closed?: boolean }
  ): void {
    const currentState = this.mediaStates.get(producerId);
    if (currentState) {
      this.mediaStates.set(producerId, {
        ...currentState,
        ...updates,
      });
    }
  }

  public getMediaStates(): Array<{
    producerId: string;
    kind: "audio" | "video";
    paused: boolean;
    closed: boolean;
  }> {
    return Array.from(this.mediaStates.entries()).map(
      ([producerId, state]) => ({
        producerId,
        ...state,
      })
    );
  }

  public isAudioMuted(): boolean {
    const audioStates = Array.from(this.mediaStates.values()).filter(
      (state) => state.kind === "audio"
    );
    return (
      audioStates.length > 0 &&
      audioStates.every((state) => state.paused || state.closed)
    );
  }

  public isVideoMuted(): boolean {
    const videoStates = Array.from(this.mediaStates.values()).filter(
      (state) => state.kind === "video"
    );
    return (
      videoStates.length > 0 &&
      videoStates.every((state) => state.paused || state.closed)
    );
  }

  public muteAudio(): string[] {
    const mutedProducerIds: string[] = [];
    const userProducers = this.producers.get(this.id);
    if (userProducers) {
      for (const [producerId, producer] of Object.entries(userProducers)) {
        const state = this.mediaStates.get(producerId);
        if (state?.kind === "audio" && !state.paused && !state.closed) {
          producer.pause();
          this.updateMediaState(producerId, { paused: true });
          mutedProducerIds.push(producerId);
        }
      }
    }
    return mutedProducerIds;
  }

  public unmuteAudio(): string[] {
    const unmutedProducerIds: string[] = [];
    const userProducers = this.producers.get(this.id);
    if (userProducers) {
      for (const [producerId, producer] of Object.entries(userProducers)) {
        const state = this.mediaStates.get(producerId);
        if (state?.kind === "audio" && state.paused && !state.closed) {
          producer.resume();
          this.updateMediaState(producerId, { paused: false });
          unmutedProducerIds.push(producerId);
        }
      }
    }
    return unmutedProducerIds;
  }

  public muteVideo(): string[] {
    const mutedProducerIds: string[] = [];
    const userProducers = this.producers.get(this.id);
    if (userProducers) {
      for (const [producerId, producer] of Object.entries(userProducers)) {
        const state = this.mediaStates.get(producerId);
        if (state?.kind === "video" && !state.paused && !state.closed) {
          producer.pause();
          this.updateMediaState(producerId, { paused: true });
          mutedProducerIds.push(producerId);
        }
      }
    }
    return mutedProducerIds;
  }

  public unmuteVideo(): string[] {
    const unmutedProducerIds: string[] = [];
    const userProducers = this.producers.get(this.id);
    if (userProducers) {
      for (const [producerId, producer] of Object.entries(userProducers)) {
        const state = this.mediaStates.get(producerId);
        if (state?.kind === "video" && state.paused && !state.closed) {
          producer.resume();
          this.updateMediaState(producerId, { paused: false });
          unmutedProducerIds.push(producerId);
        }
      }
    }
    return unmutedProducerIds;
  }
  public getProducerIds(): string[] {
    const userProducers = this.producers.get(this.id);
    if (userProducers) {
      return Object.keys(userProducers);
    }
    return [];
  }
}

export default MediasoupParticipant;
