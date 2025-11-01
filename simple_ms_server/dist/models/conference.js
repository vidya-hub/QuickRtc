"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const participant_1 = __importDefault(require("./participant"));
class MediasoupConference {
    constructor(id, name, participants, conferenceId, worker, router = null) {
        this.socketIds = [];
        this.router = null;
        this.name = name;
        this.participants = participants;
        this.conferenceId = conferenceId;
        this.worker = worker;
        this.router = router;
        this.id = id;
    }
    addParticipant(participant) {
        this.participants.set(participant.id, participant);
        this.socketIds.push(participant.socketId);
    }
    async removeParticipant(participantId) {
        const participant = this.participants.get(participantId);
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
    async removeWithSocketId(socketId) {
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
    getParticipants() {
        return this.participantsMapToArray(this.participants);
    }
    getParticipant(participantId) {
        return this.participants.get(participantId);
    }
    getName() {
        return this.name;
    }
    getConferenceId() {
        return this.conferenceId;
    }
    getRouterRtpsCapabilities() {
        return this.router?.rtpCapabilities;
    }
    getRouter() {
        return this.router;
    }
    getWorker() {
        return this.worker;
    }
    createParticipant(participantId, participantName, socketId) {
        return new participant_1.default(participantId, participantName, socketId);
    }
    async createTransport(transportParams) {
        const { participantId } = transportParams;
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        const router = this.getRouter();
        if (!router) {
            throw new Error("Router is not initialized for the conference");
        }
        const transport = await participant.createTransport(router, transportParams);
        return transport;
    }
    async connectTransport(connectParams) {
        const { participantId, dtlsParameters, direction } = connectParams;
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        try {
            await participant.connectTransport(direction, dtlsParameters);
        }
        catch (error) {
            throw new Error(`Failed to connect transport: ${error}`);
        }
    }
    async produce(produceParams) {
        const { participantId } = produceParams;
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        try {
            const producer = await participant.produce(produceParams);
            return producer;
        }
        catch (error) {
            throw new Error(`Failed to produce: ${error}`);
        }
    }
    async consume(consumeParams) {
        const { participantId } = consumeParams;
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        try {
            const consumer = await participant.consume(consumeParams);
            return consumer;
        }
        catch (error) {
            throw new Error(`Failed to consume: ${error}`);
        }
    }
    async resumeConsumer(resumeParams) {
        const { participantId, consumerId } = resumeParams;
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        try {
            await participant.resumeConsumer(consumerId);
        }
        catch (error) {
            throw new Error(`Failed to resume consumer: ${error}`);
        }
    }
    participantsMapToArray(participantsMap) {
        return Array.from(participantsMap.values());
    }
    pauseProducer(participantId, producerId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        participant.pauseProducer(producerId);
    }
    getExistingProducerIds(currentParticipantId) {
        const producerData = [];
        for (const [participantId, participant] of this.participants.entries()) {
            if (participantId === currentParticipantId) {
                continue;
            }
            const mediasoupParticipant = participant;
            const participantProducerIds = mediasoupParticipant.getProducerIds();
            producerData.push({
                participantId,
                producerIds: participantProducerIds,
            });
        }
        return producerData;
    }
    async resumeProducer(participantId, producerId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        participant.resumeProducer(producerId);
    }
    async pauseConsumer(participantId, consumerId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        participant.pauseConsumer(consumerId);
    }
    async closeProducer(participantId, producerId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        return participant.removeProducer(producerId);
    }
    async closeConsumer(participantId, consumerId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        participant.removeConsumer(consumerId);
    }
    isEmpty() {
        return this.participants.size === 0;
    }
    getParticipantCount() {
        return this.participants.size;
    }
    async muteParticipantAudio(participantId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        return participant.muteAudio();
    }
    async unmuteParticipantAudio(participantId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        return participant.unmuteAudio();
    }
    async muteParticipantVideo(participantId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        return participant.muteVideo();
    }
    async unmuteParticipantVideo(participantId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            throw new Error("Participant does not exist in the conference");
        }
        return participant.unmuteVideo();
    }
    getParticipantMediaStates(participantId) {
        const participant = this.getParticipant(participantId);
        if (!participant) {
            return null;
        }
        return participant.getMediaStates();
    }
    async cleanup() {
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
exports.default = MediasoupConference;
