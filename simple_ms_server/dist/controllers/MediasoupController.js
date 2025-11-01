"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conference_1 = __importDefault(require("../models/conference"));
const extras_1 = require("mediasoup/extras");
const ErrorHandler_1 = require("../utils/ErrorHandler");
class MediasoupController extends extras_1.EnhancedEventEmitter {
    constructor(workerService) {
        super();
        this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.STATS_INTERVAL = 30 * 1000; // 30 seconds
        this.conferences = new Map();
        this.workerService = workerService;
        this.errorHandler = new ErrorHandler_1.ErrorHandler();
        this.setupErrorHandling();
        this.startPeriodicCleanup();
        this.startStatsCollection();
    }
    getConferences() {
        return this.conferences;
    }
    async joinConference(params) {
        try {
            const { conferenceId, conferenceName, participantId, participantName, socketId, } = params;
            // Validate parameters
            if (!conferenceId || !participantId || !socketId) {
                throw this.errorHandler.handleError(ErrorHandler_1.ErrorType.VALIDATION, "Missing required parameters for joining conference", { conferenceId, participantId, socketId }, participantId, conferenceId);
            }
            let conference = this.conferences.get(conferenceId);
            if (!conference) {
                await this.createConference(conferenceId, conferenceName);
                conference = this.conferences.get(conferenceId);
            }
            if (!conference) {
                throw this.errorHandler.handleError(ErrorHandler_1.ErrorType.CONFERENCE, "Failed to create or retrieve conference", { conferenceId }, participantId, conferenceId);
            }
            let participant = conference.getParticipant(participantId);
            if (!participant) {
                participant = conference.createParticipant(participantId, participantName, socketId);
            }
            conference.addParticipant(participant);
            return conference;
        }
        catch (error) {
            if (error instanceof Error) {
                this.errorHandler.handleError(ErrorHandler_1.ErrorType.CONFERENCE, "Failed to join conference", error.message, params.participantId, params.conferenceId, error);
            }
            throw error;
        }
    }
    async createConference(conferenceId, name) {
        const worker = await this.workerService.getWorker();
        const newConference = new conference_1.default(conferenceId, name || "Default", new Map(), conferenceId, worker.worker, worker.router);
        this.conferences.set(conferenceId, newConference);
        this.emit("conferenceCreated", newConference);
    }
    getConference(conferenceId) {
        return this.conferences.get(conferenceId);
    }
    async createTransport(transportParams) {
        try {
            const { conferenceId, participantId } = transportParams;
            if (!conferenceId || !participantId) {
                throw this.errorHandler.handleError(ErrorHandler_1.ErrorType.VALIDATION, "Missing required parameters for transport creation", transportParams, participantId, conferenceId);
            }
            const conference = this.conferences.get(conferenceId);
            if (!conference) {
                throw this.errorHandler.handleError(ErrorHandler_1.ErrorType.CONFERENCE, "Conference does not exist", { conferenceId }, participantId, conferenceId);
            }
            const transport = await conference.createTransport(transportParams);
            return transport;
        }
        catch (error) {
            if (error instanceof Error) {
                this.errorHandler.handleError(ErrorHandler_1.ErrorType.TRANSPORT, "Failed to create transport", error.message, transportParams.participantId, transportParams.conferenceId, error);
            }
            throw error;
        }
    }
    async connectTransport(connectParams) {
        const { conferenceId } = connectParams;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        try {
            await conference.connectTransport(connectParams);
        }
        catch (error) {
            throw new Error(`Failed to connect transport: ${error}`);
        }
    }
    async produce(produceParams) {
        const { conferenceId } = produceParams;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        try {
            return await conference.produce(produceParams);
        }
        catch (error) {
            throw new Error(`Failed to produce: ${error}`);
        }
    }
    async consume(consumeParams) {
        const { conferenceId } = consumeParams;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        try {
            return await conference.consume(consumeParams);
        }
        catch (error) {
            throw new Error(`Failed to consume: ${error}`);
        }
    }
    async resumeConsumer(resumeParams) {
        const { conferenceId } = resumeParams;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        try {
            await conference.resumeConsumer(resumeParams);
        }
        catch (error) {
            throw new Error(`Failed to resume consumer: ${error}`);
        }
    }
    async removeFromConference(conferenceId, participantId) {
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
    async userRemoveWithSocketId(socketId) {
        for (const [conferenceId, conference] of this.conferences) {
            if (conference
                .getParticipants()
                .some((participant) => participant.socketId === socketId)) {
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
    async cleanupConference(conferenceId) {
        const conference = this.conferences.get(conferenceId);
        if (conference) {
            await conference.cleanup();
            this.conferences.delete(conferenceId);
            this.emit("conferenceDestroyed", { conferenceId });
        }
    }
    isConferenceExists(conferenceId) {
        return this.conferences.has(conferenceId);
    }
    async pauseProducer(params) {
        const { conferenceId, participantId, producerId } = params;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        return conference.pauseProducer(participantId, producerId);
    }
    getExistingProducerIds(participantId, conferenceId) {
        const producers = this.conferences
            .get(conferenceId)
            ?.getExistingProducerIds(participantId);
        return producers ?? [];
    }
    async resumeProducer(params) {
        const { conferenceId, participantId, producerId } = params;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        await conference.resumeProducer(participantId, producerId);
    }
    async pauseConsumer(params) {
        const { conferenceId, participantId, consumerId } = params;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        await conference.pauseConsumer(participantId, consumerId);
    }
    async closeProducer(params) {
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
        console.log(`📹 Producer closed: ${producerId} for participant ${participantId}`);
        console.log(`[${new Date().toISOString()}] 📹 Producer closed: ${producerId}`);
        console.log(`[${new Date().toISOString()}] 👤 Participant: ${participantId}`);
        console.log(`[${new Date().toISOString()}] 🎭 Media kind: ${kind}`);
        return kind;
    }
    async closeConsumer(params) {
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
    async muteAudio(params) {
        const { conferenceId, participantId } = params;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        const mutedProducerIds = await conference.muteParticipantAudio(participantId);
        this.emit("audioMuted", {
            conferenceId,
            participantId,
            mutedProducerIds,
        });
        return mutedProducerIds;
    }
    async unmuteAudio(params) {
        const { conferenceId, participantId } = params;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        const unmutedProducerIds = await conference.unmuteParticipantAudio(participantId);
        this.emit("audioUnmuted", {
            conferenceId,
            participantId,
            unmutedProducerIds,
        });
        return unmutedProducerIds;
    }
    async muteVideo(params) {
        const { conferenceId, participantId } = params;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        const mutedProducerIds = await conference.muteParticipantVideo(participantId);
        this.emit("videoMuted", {
            conferenceId,
            participantId,
            mutedProducerIds,
        });
        return mutedProducerIds;
    }
    async unmuteVideo(params) {
        const { conferenceId, participantId } = params;
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        const unmutedProducerIds = await conference.unmuteParticipantVideo(participantId);
        this.emit("videoUnmuted", {
            conferenceId,
            participantId,
            unmutedProducerIds,
        });
        return unmutedProducerIds;
    }
    getParticipantMediaStates(conferenceId, participantId) {
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            return null;
        }
        return conference.getParticipantMediaStates(participantId);
    }
    startPeriodicCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.performPeriodicCleanup();
        }, this.CLEANUP_INTERVAL);
    }
    startStatsCollection() {
        this.statsInterval = setInterval(() => {
            this.collectAndEmitStats();
        }, this.STATS_INTERVAL);
    }
    async performPeriodicCleanup() {
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
        }
        catch (error) {
            console.error("Error during periodic cleanup:", error);
        }
    }
    collectAndEmitStats() {
        try {
            const stats = {
                conferences: this.conferences.size,
                totalParticipants: Array.from(this.conferences.values()).reduce((total, conf) => total + conf.getParticipantCount(), 0),
                workerStats: this.workerService.getWorkerStats(),
                timestamp: Date.now(),
            };
            this.emit("stats", stats);
        }
        catch (error) {
            console.error("Error collecting stats:", error);
        }
    }
    getStats() {
        return {
            conferences: this.conferences.size,
            totalParticipants: Array.from(this.conferences.values()).reduce((total, conf) => total + conf.getParticipantCount(), 0),
            workerStats: this.workerService.getWorkerStats(),
        };
    }
    setupErrorHandling() {
        this.errorHandler.on("error", (error) => {
            this.emit("error", error);
            // Handle critical errors
            if (error.type === ErrorHandler_1.ErrorType.WORKER) {
                this.handleWorkerError(error);
            }
        });
    }
    async handleWorkerError(error) {
        console.error("Critical worker error detected:", error);
        // Implement worker recovery logic if needed
    }
    async shutdown() {
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
    getParticipants(conferenceId) {
        const conference = this.conferences.get(conferenceId);
        if (!conference) {
            throw new Error("Conference does not exist");
        }
        return conference.getParticipants().map(function (participant) {
            return {
                participantId: participant.id,
                participantName: participant.name,
                socketId: participant.socketId,
                producers: participant.getProducerIds(),
            };
        });
    }
    getProducersByParticipantId(conferenceId, participantId) {
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
exports.default = MediasoupController;
