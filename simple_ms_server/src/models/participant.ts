import { EnhancedEventEmitter } from "mediasoup/extras";
import * as mediasoup from "mediasoup";
import {
  ConsumeParams,
  ConsumerResponse,
  CreateTransportParams,
  ParticipantsConsumersToUsers,
  ParticipantsProducersToUsers,
  ProduceParams,
} from "../types";
import { AppData, DtlsParameters, Router, Transport } from "mediasoup/types";
class Participant {
  id: string;
  socketId: string;
  name: string;
  producerTransport?: mediasoup.types.Transport;
  consumerTransport?: mediasoup.types.Transport;
  producers: ParticipantsProducersToUsers;
  consumers: ParticipantsConsumersToUsers;

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
      delete userProducers[producerId];
      this.producers.set(this.id, userProducers);
    }
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
    this.consumerTransport?.consume;
    this.addProducer(producer);
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
}

export default Participant;
