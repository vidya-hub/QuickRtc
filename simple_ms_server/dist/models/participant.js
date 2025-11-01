"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MediasoupParticipant {
    constructor(id, name, socketId) {
        this.mediaStates = new Map();
        this.id = id;
        this.name = name;
        this.socketId = socketId;
        this.producers = new Map();
        this.consumers = new Map();
    }
    setProducerTransport(transport) {
        this.producerTransport = transport;
    }
    setConsumerTransport(transport) {
        this.consumerTransport = transport;
    }
    addProducer(producer) {
        const userProducers = this.producers.get(this.id) || {};
        userProducers[producer.id] = producer;
        this.producers.set(this.id, userProducers);
    }
    addConsumer(consumer) {
        const userConsumers = this.consumers.get(this.id) || {};
        userConsumers[consumer.id] = consumer;
        this.consumers.set(this.id, userConsumers);
    }
    removeProducer(producerId) {
        const userProducers = this.producers.get(this.id);
        if (userProducers && userProducers[producerId]) {
            const producer = userProducers[producerId];
            const mediaState = this.getMediaState(producerId);
            const kind = mediaState?.kind || producer.kind;
            producer.close();
            delete userProducers[producerId];
            this.producers.set(this.id, userProducers);
            this.updateMediaState(producerId, { closed: true });
            return kind;
        }
        return null;
    }
    removeConsumer(consumerId) {
        const userConsumers = this.consumers.get(this.id);
        if (userConsumers && userConsumers[consumerId]) {
            const consumer = userConsumers[consumerId];
            consumer.close();
            delete userConsumers[consumerId];
            this.consumers.set(this.id, userConsumers);
        }
    }
    async closeAllProducers() {
        const userProducers = this.producers.get(this.id);
        const closedProducerIds = [];
        if (userProducers) {
            for (const [producerId, producer] of Object.entries(userProducers)) {
                try {
                    producer.close();
                    closedProducerIds.push(producerId);
                }
                catch (error) {
                    console.error(`Error closing producer ${producerId}:`, error);
                }
            }
            this.producers.set(this.id, {});
        }
        return closedProducerIds;
    }
    async closeAllConsumers() {
        const userConsumers = this.consumers.get(this.id);
        const closedConsumerIds = [];
        if (userConsumers) {
            for (const [consumerId, consumer] of Object.entries(userConsumers)) {
                try {
                    consumer.close();
                    closedConsumerIds.push(consumerId);
                }
                catch (error) {
                    console.error(`Error closing consumer ${consumerId}:`, error);
                }
            }
            this.consumers.set(this.id, {});
        }
        return closedConsumerIds;
    }
    async closeTransports() {
        try {
            if (this.producerTransport && !this.producerTransport.closed) {
                this.producerTransport.close();
            }
            if (this.consumerTransport && !this.consumerTransport.closed) {
                this.consumerTransport.close();
            }
        }
        catch (error) {
            console.error("Error closing transports:", error);
        }
    }
    async cleanup() {
        const closedProducerIds = await this.closeAllProducers();
        const closedConsumerIds = await this.closeAllConsumers();
        await this.closeTransports();
        return { closedProducerIds, closedConsumerIds };
    }
    async createTransport(router, createTransportParams) {
        if (!createTransportParams.options) {
            throw new Error("Transport options are required");
        }
        const transport = await router.createWebRtcTransport(createTransportParams.options);
        if (createTransportParams.direction === "producer") {
            this.setProducerTransport(transport);
        }
        else if (createTransportParams.direction === "consumer") {
            this.setConsumerTransport(transport);
        }
        console.log("transport is created ", transport.id);
        return transport;
    }
    async connectTransport(direction, dtlsParameters) {
        if (direction === "producer" && this.producerTransport) {
            await this.producerTransport.connect({ dtlsParameters });
        }
        else if (direction === "consumer" && this.consumerTransport) {
            await this.consumerTransport.connect({ dtlsParameters });
        }
        else {
            throw new Error("Transport not found for the given direction");
        }
    }
    async produce(produceParams) {
        if (!this.producerTransport) {
            throw new Error("Producer transport is not established");
        }
        const { producerOptions } = produceParams;
        const producer = await this.producerTransport.produce(producerOptions);
        this.addProducer(producer);
        // Track media state
        this.setMediaState(producer.id, producer.kind, false, false);
        return producer.id;
    }
    async consume(consumeParams) {
        if (!this.consumerTransport) {
            throw new Error("Consumer transport is not established");
        }
        const { producerId, rtpCapabilities } = consumeParams.consumeOptions;
        const consumer = await this.consumerTransport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
        });
        const consumerParams = {
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
    async resumeConsumer(consumerId) {
        const userConsumers = this.consumers.get(this.id);
        if (userConsumers && userConsumers[consumerId]) {
            const consumer = userConsumers[consumerId];
            await consumer.resume();
            console.log("consumer resumed in ", consumerId);
        }
        else {
            throw new Error("Consumer not found");
        }
    }
    pauseProducer(producerId) {
        const userProducers = this.producers.get(this.id);
        if (userProducers && userProducers[producerId]) {
            const producer = userProducers[producerId];
            const mediaState = this.getMediaState(producerId);
            const kind = mediaState?.kind || producer.kind;
            producer.pause();
            this.updateMediaState(producerId, { paused: true });
            return kind;
        }
        else {
            throw new Error("Producer not found");
        }
    }
    resumeProducer(producerId) {
        const userProducers = this.producers.get(this.id);
        if (userProducers && userProducers[producerId]) {
            const producer = userProducers[producerId];
            producer.resume();
            this.updateMediaState(producerId, { paused: false });
        }
        else {
            throw new Error("Producer not found");
        }
    }
    pauseConsumer(consumerId) {
        const userConsumers = this.consumers.get(this.id);
        if (userConsumers && userConsumers[consumerId]) {
            const consumer = userConsumers[consumerId];
            consumer.pause();
        }
        else {
            throw new Error("Consumer not found");
        }
    }
    getProducerById(producerId) {
        const userProducers = this.producers.get(this.id);
        return userProducers?.[producerId] || null;
    }
    getConsumerById(consumerId) {
        const userConsumers = this.consumers.get(this.id);
        return userConsumers?.[consumerId] || null;
    }
    getAllProducers() {
        const userProducers = this.producers.get(this.id);
        return userProducers ? Object.values(userProducers) : [];
    }
    getAllConsumers() {
        const userConsumers = this.consumers.get(this.id);
        return userConsumers ? Object.values(userConsumers) : [];
    }
    getMediaState(producerId) {
        return this.mediaStates.get(producerId) || null;
    }
    setMediaState(producerId, kind, paused = false, closed = false) {
        this.mediaStates.set(producerId, { kind, paused, closed });
    }
    updateMediaState(producerId, updates) {
        const currentState = this.mediaStates.get(producerId);
        if (currentState) {
            this.mediaStates.set(producerId, {
                ...currentState,
                ...updates,
            });
        }
    }
    getMediaStates() {
        return Array.from(this.mediaStates.entries()).map(([producerId, state]) => ({
            producerId,
            ...state,
        }));
    }
    isAudioMuted() {
        const audioStates = Array.from(this.mediaStates.values()).filter((state) => state.kind === "audio");
        return (audioStates.length > 0 &&
            audioStates.every((state) => state.paused || state.closed));
    }
    isVideoMuted() {
        const videoStates = Array.from(this.mediaStates.values()).filter((state) => state.kind === "video");
        return (videoStates.length > 0 &&
            videoStates.every((state) => state.paused || state.closed));
    }
    muteAudio() {
        const mutedProducerIds = [];
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
    unmuteAudio() {
        const unmutedProducerIds = [];
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
    muteVideo() {
        const mutedProducerIds = [];
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
    unmuteVideo() {
        const unmutedProducerIds = [];
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
    getProducerIds() {
        const userProducers = this.producers.get(this.id);
        if (userProducers) {
            return Object.keys(userProducers);
        }
        return [];
    }
}
exports.default = MediasoupParticipant;
