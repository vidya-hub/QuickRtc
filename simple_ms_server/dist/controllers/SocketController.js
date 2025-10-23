"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extras_1 = require("mediasoup/extras");
class SocketEventController extends extras_1.EnhancedEventEmitter {
    constructor(mediasoupController, mediasoupSocket) {
        super();
        this.mediasoupController = mediasoupController;
        this.mediasoupSocket = mediasoupSocket;
        this.setupSocketEvents();
    }
    setupSocketEvents() {
        this.mediasoupSocket.on("connection", (socket) => {
            this.emit("newConnection", socket);
            this.onNewConnection(socket);
            socket.on("disconnect", () => {
                this.emit("clientDisconnected", socket);
                this.onUserDisconnected(socket);
            });
            socket.on("joinConference", async (socketEventData, callback) => {
                await this.handleJoinConference(socketEventData.data, socket, callback);
            });
            socket.on("createTransport", async (socketEventData, callback) => {
                await this.createTransport(socketEventData, callback);
            });
            socket.on("connectTransport", async (socketEventData, callback) => {
                await this.connectTransport(socketEventData, callback);
            });
            socket.on("produce", async (socketEventData, callback) => {
                await this.produce(socketEventData, socket, callback);
            });
            socket.on("consume", async (socketEventData, callback) => {
                await this.consume(socketEventData, callback);
            });
            socket.on("resumeConsumer", async (socketEventData, callback) => {
                await this.resumeConsumer(socketEventData, callback);
            });
            socket.on("leaveConference", async (socketEventData, callback) => {
                await this.handleLeaveConference(socket, socketEventData, callback);
            });
            socket.on("resumeProducer", async (socketEventData, callback) => {
                await this.resumeProducer(socketEventData, callback);
            });
            socket.on("getProducers", (socketEventData, callback) => {
                this.getProducers(socketEventData, callback);
            });
            socket.on("pauseProducer", async (socketEventData, callback) => {
                await this.pauseProducerHandler(socketEventData, callback);
            });
            socket.on("pauseConsumer", async (socketEventData, callback) => {
                await this.pauseConsumer(socketEventData, callback);
            });
            socket.on("closeProducer", async (socketEventData, callback) => {
                await this.closeProducer(socketEventData, callback);
            });
            socket.on("closeConsumer", async (socketEventData, callback) => {
                await this.closeConsumer(socketEventData, callback);
            });
            socket.on("muteAudio", async (socketEventData, callback) => {
                await this.muteAudio(socketEventData, callback);
            });
            socket.on("unmuteAudio", async (socketEventData, callback) => {
                await this.unmuteAudio(socketEventData, callback);
            });
            socket.on("muteVideo", async (socketEventData, callback) => {
                await this.muteVideo(socketEventData, callback);
            });
            socket.on("unmuteVideo", async (socketEventData, callback) => {
                await this.unmuteVideo(socketEventData, callback);
            });
            socket.on("getMediaStates", async (socketEventData, callback) => {
                await this.getMediaStates(socketEventData, callback);
            });
            socket.on("getParticipants", async (socketEventData, callback) => {
                await this.getParticipants(socketEventData, callback);
            });
            socket.on("getProducersWithParticipants", async (socketEventData, callback) => {
                await this.getProducersWithParticipants(socketEventData, callback);
            });
            socket.on("consumeParticipantMedia", async (socketEventData, callback) => {
                await this.consumeParticipantMedia(socketEventData, callback);
            });
            socket.on("unpauseConsumer", async (socketEventData, callback) => {
                await this.unpauseConsumer(socketEventData, callback);
            });
            socket.on("getProducersWithParticipantId", (socketEventData, callback) => {
                this.getProducersWithParticipantId(socketEventData, callback);
            });
        });
    }
    async getParticipants(socketEventData, callback) {
        const { conferenceId } = socketEventData;
        try {
            const participants = this.mediasoupController?.getParticipants(conferenceId);
            callback({ status: "ok", data: participants });
        }
        catch (error) {
            console.error("Error getting participants:", error);
            callback({ status: "error", data: error });
        }
    }
    async getProducersWithParticipants(socketEventData, callback) {
        const { data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            // Get existing producer data using the existing method
            const producerData = this.mediasoupController?.getExistingProducerIds(participantId, conferenceId);
            if (!producerData || producerData.length === 0) {
                callback({ status: "ok", data: [] });
                return;
            }
            // Get all participants to get their names
            const allParticipants = this.mediasoupController?.getParticipants(conferenceId);
            const participantMap = new Map();
            if (allParticipants) {
                for (const participant of allParticipants) {
                    participantMap.set(participant.participantId, participant.participantName);
                }
            }
            // Transform the data to include participant names and producer details
            const participantsWithProducers = producerData.map((item) => {
                const producers = item.producerIds.map((producerId) => ({
                    producerId,
                    kind: "unknown", // We could enhance this later by accessing the actual producer objects
                    enabled: true, // Default to enabled, could be enhanced with actual producer state
                    appData: {},
                }));
                return {
                    participantId: item.participantId,
                    participantName: participantMap.get(item.participantId) || "Unknown Participant",
                    producers: producers,
                };
            });
            callback({ status: "ok", data: participantsWithProducers });
        }
        catch (error) {
            console.error("Error getting producers with participants:", error);
            callback({ status: "error", data: error });
        }
    }
    /**
     * Simplified method to consume media by participant ID
     * Client sends participant ID and gets consumer parameters for all their producers
     */
    async consumeParticipantMedia(socketEventData, callback) {
        const { conferenceId, participantId, targetParticipantId, rtpCapabilities, } = socketEventData;
        try {
            if (!conferenceId ||
                !participantId ||
                !targetParticipantId ||
                !rtpCapabilities) {
                callback({
                    status: "error",
                    data: "Missing required parameters: conferenceId, participantId, targetParticipantId, rtpCapabilities",
                });
                return;
            }
            // Get producer IDs for the target participant
            const producerData = this.mediasoupController?.getExistingProducerIds(participantId, // requesting participant (to exclude from results)
            conferenceId);
            if (!producerData || producerData.length === 0) {
                callback({ status: "ok", data: [] });
                return;
            }
            // Find the target participant's producers
            const targetParticipantData = producerData.find((item) => item.participantId === targetParticipantId);
            if (!targetParticipantData ||
                targetParticipantData.producerIds.length === 0) {
                callback({ status: "ok", data: [] });
                return;
            }
            // Create consumers for each producer
            const consumerParams = [];
            for (const producerId of targetParticipantData.producerIds) {
                try {
                    const consumerResponse = await this.mediasoupController?.consume({
                        conferenceId,
                        participantId,
                        consumeOptions: {
                            producerId,
                            rtpCapabilities,
                        },
                    });
                    if (consumerResponse) {
                        consumerParams.push({
                            ...consumerResponse,
                            targetParticipantId,
                        });
                    }
                }
                catch (error) {
                    console.error(`Error creating consumer for producer ${producerId}:`, error);
                    // Continue with other producers
                }
            }
            callback({ status: "ok", data: consumerParams });
        }
        catch (error) {
            console.error("Error consuming participant media:", error);
            callback({ status: "error", data: error });
        }
    }
    /**
     * Unpause consumer - simplified version
     */
    async unpauseConsumer(socketEventData, callback) {
        const { conferenceId, participantId, consumerId } = socketEventData;
        try {
            if (!consumerId) {
                callback({ status: "error", data: "Missing consumerId" });
                return;
            }
            await this.mediasoupController?.resumeConsumer({
                conferenceId,
                participantId,
                consumerId,
            });
            callback({ status: "ok" });
        }
        catch (error) {
            console.error("Error unpausing consumer:", error);
            callback({ status: "error", data: error });
        }
    }
    getProducersWithParticipantId(socketEventData, callback) {
        try {
            const { conferenceId, participantId } = socketEventData;
            const producers = this.mediasoupController?.getProducersByParticipantId(conferenceId, participantId);
            callback({ status: "ok", data: producers });
        }
        catch (error) {
            console.error("Error getting producers:", error);
            callback({ status: "error", data: error });
        }
    }
    async pauseProducerHandler(socketEventData, callback) {
        const { data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { producerId } = extraData || {};
        if (!producerId) {
            callback({ status: "error", data: "Missing producerId" });
            return;
        }
        try {
            await this.mediasoupController?.pauseProducer({
                conferenceId,
                participantId,
                producerId,
            });
            callback({ status: "ok" });
            this.mediasoupSocket.to(conferenceId).emit("producerPaused", {
                participantId,
                producerId,
            });
            this.emit("producerPaused", { participantId, producerId });
        }
        catch (error) {
            console.error("Error pausing producer:", error);
            callback({ status: "error", data: error });
        }
    }
    async pauseConsumer(socketEventData, callback) {
        console.log("pause consumer data ", socketEventData);
        const { data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { consumerId } = extraData || {};
        if (!consumerId) {
            callback({ status: "error", data: "Missing consumerId" });
            return;
        }
        try {
            await this.mediasoupController?.pauseConsumer({
                conferenceId,
                participantId,
                consumerId,
            });
            callback({ status: "ok" });
            this.mediasoupSocket.to(conferenceId).emit("consumerPaused", {
                participantId,
                consumerId,
            });
            this.emit("consumerPaused", { participantId, consumerId });
        }
        catch (error) {
            console.error("Error pausing consumer:", error);
            callback({ status: "error", data: error });
        }
    }
    async closeProducer(socketEventData, callback) {
        const { data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { producerId } = extraData || {};
        if (!producerId) {
            callback({ status: "error", data: "Missing producerId" });
            return;
        }
        try {
            await this.mediasoupController?.closeProducer({
                conferenceId,
                participantId,
                producerId,
            });
            callback({ status: "ok" });
            this.mediasoupSocket.to(conferenceId).emit("producerClosed", {
                participantId,
                producerId,
            });
            this.emit("producerClosed", { participantId, producerId });
        }
        catch (error) {
            console.error("Error closing producer:", error);
            callback({ status: "error", data: error });
        }
    }
    async closeConsumer(socketEventData, callback) {
        const { data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { consumerId } = extraData || {};
        if (!consumerId) {
            callback({ status: "error", data: "Missing consumerId" });
            return;
        }
        try {
            await this.mediasoupController?.closeConsumer({
                conferenceId,
                participantId,
                consumerId,
            });
            callback({ status: "ok" });
            this.mediasoupSocket.to(conferenceId).emit("consumerClosed", {
                participantId,
                consumerId,
            });
            this.emit("consumerClosed", { participantId, consumerId });
        }
        catch (error) {
            console.error("Error closing consumer:", error);
            callback({ status: "error", data: error });
        }
    }
    async handleJoinConference(socketEventData, socket, callback) {
        console.log("received data socket ", socketEventData);
        try {
            const { conferenceId, participantId, conferenceName, participantName } = socketEventData;
            const conference = await this.mediasoupController?.joinConference({
                conferenceId: conferenceId,
                participantId: participantId,
                conferenceName: conferenceName,
                participantName: participantName,
                socketId: socket.id,
            });
            console.log("mediasoup con response ", conference);
            socket.join(conferenceId);
            socket.to(conferenceId).emit("participantJoined", {
                participantId,
                participantName,
                conferenceId,
            });
            this.emit("conferenceJoined", {
                ...socketEventData,
                socketId: socket.id,
            });
            if (conference) {
                callback({
                    status: "ok",
                    data: { routerCapabilities: conference.getRouterRtpsCapabilities() },
                });
            }
        }
        catch (error) {
            console.error("Error joining conference:", error);
            callback({ status: "error", data: error });
        }
    }
    async createTransport(socketEventData, callback) {
        console.log("create transport data ", socketEventData);
        const { direction, conferenceId, participantId } = socketEventData;
        try {
            const transport = await this.mediasoupController?.createTransport({
                conferenceId,
                participantId,
                direction,
                options: this.mediasoupController.workerService.mediasoupConfig
                    .transportConfig,
            });
            this.emit("transportCreated", transport);
            callback({
                status: "ok",
                data: {
                    id: transport?.id,
                    iceParameters: transport?.iceParameters,
                    iceCandidates: transport?.iceCandidates,
                    dtlsParameters: transport?.dtlsParameters,
                    sctpParameters: transport?.sctpParameters,
                },
            });
        }
        catch (error) {
            console.error("Error creating transport:", error);
            callback({ status: "error", data: error });
        }
    }
    async connectTransport(socketEventData, callback) {
        console.log("connect data ", socketEventData);
        const { conferenceId, participantId } = socketEventData;
        const { direction, dtlsParameters } = socketEventData;
        if (!direction || !dtlsParameters) {
            callback({ status: "error", data: "Missing required parameters" });
            return;
        }
        try {
            await this.mediasoupController?.connectTransport({
                conferenceId,
                participantId,
                dtlsParameters: dtlsParameters,
                direction: direction,
            });
            this.emit("transportConnected", {
                conferenceId,
                participantId,
                direction,
            });
            callback({ status: "ok", data: {} });
        }
        catch (error) {
            console.error("Error connecting transport:", error);
            callback({ status: "error", data: error });
        }
    }
    async produce(socketEventData, socket, callback) {
        const { conferenceId, participantId } = socketEventData;
        const { transportId, kind, rtpParameters } = socketEventData;
        const producerOptions = { kind, rtpParameters, appData: { participantId } };
        try {
            if (!transportId || !kind || !rtpParameters) {
                callback({
                    status: "error",
                    data: "Missing required parameters for producing",
                });
                return;
            }
            const producerId = await this.mediasoupController?.produce({
                conferenceId,
                participantId,
                transportId,
                producerOptions,
                kind,
                rtpParameters,
            });
            // Get participant name for the event
            const participants = this.mediasoupController?.getParticipants(conferenceId);
            const participant = participants?.find((p) => p.participantId === participantId);
            const participantName = participant?.participantName || "Unknown Participant";
            socket.to(conferenceId).emit("newProducer", {
                producerId,
                participantId,
                participantName,
                kind,
            });
            callback({ status: "ok", data: { producerId } });
            this.emit("producerCreated", { producerId, participantId });
        }
        catch (error) {
            console.error("Error producing:", error);
            callback({ status: "error", data: error });
        }
    }
    async consume(socketEventData, callback) {
        console.log("consume params came ", socketEventData);
        const { conferenceId, participantId, consumeOptions } = socketEventData;
        const { producerId, rtpCapabilities } = consumeOptions;
        const consumerParams = {
            conferenceId,
            participantId,
            consumeOptions,
        };
        try {
            if (!producerId || !rtpCapabilities) {
                callback({
                    status: "error",
                    data: "Missing required parameters for consuming",
                });
                return;
            }
            // Implement consume logic here
            const consumerResponse = await this.mediasoupController?.consume(consumerParams);
            console.log("consumer response ", consumerResponse);
            callback({ status: "ok", data: consumerResponse });
            this.emit("consumerCreated", { ...consumerResponse, participantId });
        }
        catch (error) {
            console.error("Error consuming:", error);
            callback({ status: "error", data: error });
        }
    }
    async resumeConsumer(socketEventData, callback) {
        const { conferenceId, participantId, consumerId } = socketEventData;
        const resumeConsumerParams = {
            conferenceId,
            participantId,
            consumerId,
        };
        if (!consumerId) {
            callback({ status: "error", data: "Missing consumerId" });
            return;
        }
        try {
            await this.mediasoupController?.resumeConsumer(resumeConsumerParams);
            callback({ status: "ok" });
            this.emit("consumerResumed", { consumerId, participantId });
        }
        catch (error) {
            console.error("Error resuming consumer:", error);
            callback({ status: "error", data: error });
        }
    }
    async onUserDisconnected(socket) {
        console.log("Client disconnected:", socket.id);
        try {
            const cleanup = await this.mediasoupController?.userRemoveWithSocketId(socket.id);
            if (cleanup?.conferenceId && cleanup?.participantId) {
                // Notify other participants about the disconnection
                socket.to(cleanup.conferenceId).emit("participantLeft", {
                    participantId: cleanup.participantId,
                    closedProducerIds: cleanup.closedProducerIds,
                    closedConsumerIds: cleanup.closedConsumerIds,
                });
                // Emit cleanup events for each closed producer and consumer
                cleanup.closedProducerIds.forEach((producerId) => {
                    socket.to(cleanup.conferenceId).emit("producerClosed", {
                        participantId: cleanup.participantId,
                        producerId,
                    });
                });
                cleanup.closedConsumerIds.forEach((consumerId) => {
                    socket.to(cleanup.conferenceId).emit("consumerClosed", {
                        participantId: cleanup.participantId,
                        consumerId,
                    });
                });
            }
            this.emit("userQuit", {
                socketId: socket.id,
                ...cleanup,
            });
        }
        catch (error) {
            console.error("Error handling user disconnect:", error);
            this.emit("userQuit", socket.id);
        }
    }
    onNewConnection(socket) {
        console.log("New client connected with socket id:", socket.id);
        this.emit("connected", socket);
    }
    async handleLeaveConference(socket, socketEventData, callback) {
        const { participantId, conferenceId } = socketEventData;
        try {
            const cleanup = await this.mediasoupController?.removeFromConference(conferenceId, participantId);
            if (cleanup) {
                // Notify other participants about the participant leaving
                socket.to(conferenceId).emit("participantLeft", {
                    participantId,
                    closedProducerIds: cleanup.closedProducerIds,
                    closedConsumerIds: cleanup.closedConsumerIds,
                });
                // Emit cleanup events for each closed producer and consumer
                cleanup.closedProducerIds.forEach((producerId) => {
                    socket.to(conferenceId).emit("producerClosed", {
                        participantId,
                        producerId,
                    });
                });
                cleanup.closedConsumerIds.forEach((consumerId) => {
                    socket.to(conferenceId).emit("consumerClosed", {
                        participantId,
                        consumerId,
                    });
                });
            }
            socket.leave(conferenceId);
            callback({ status: "ok" });
            this.emit("participantLeft", {
                participantId,
                conferenceId,
                ...cleanup,
            });
        }
        catch (error) {
            console.error("Error handling leave conference:", error);
            callback({ status: "error", data: error });
        }
    }
    getProducers(socketEventData, callback) {
        const { conferenceId, participantId } = socketEventData;
        try {
            const producerIds = this.mediasoupController?.getExistingProducerIds(conferenceId, participantId);
            callback({ status: "ok", data: producerIds });
        }
        catch (error) {
            console.error("Error getting producers:", error);
            callback({ status: "error", data: error });
        }
    }
    async resumeProducer(socketEventData, callback) {
        const { data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { producerId } = extraData || {};
        if (!producerId) {
            callback({ status: "error", data: "Missing producerId" });
            return;
        }
        try {
            await this.mediasoupController?.resumeProducer({
                conferenceId,
                participantId,
                producerId,
            });
            callback({ status: "ok" });
            this.emit("producerResumed", { producerId, participantId });
        }
        catch (error) {
            console.error("Error resuming producer:", error);
            callback({ status: "error", data: error });
        }
    }
    async muteAudio(socketEventData, callback) {
        const { data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const mutedProducerIds = await this.mediasoupController?.muteAudio({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { mutedProducerIds } });
            this.mediasoupSocket.to(conferenceId).emit("audioMuted", {
                participantId,
                mutedProducerIds,
            });
            this.emit("audioMuted", { participantId, mutedProducerIds });
        }
        catch (error) {
            console.error("Error muting audio:", error);
            callback({ status: "error", data: error });
        }
    }
    async unmuteAudio(socketEventData, callback) {
        const { data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const unmutedProducerIds = await this.mediasoupController?.unmuteAudio({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { unmutedProducerIds } });
            this.mediasoupSocket.to(conferenceId).emit("audioUnmuted", {
                participantId,
                unmutedProducerIds,
            });
            this.emit("audioUnmuted", { participantId, unmutedProducerIds });
        }
        catch (error) {
            console.error("Error unmuting audio:", error);
            callback({ status: "error", data: error });
        }
    }
    async muteVideo(socketEventData, callback) {
        const { data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const mutedProducerIds = await this.mediasoupController?.muteVideo({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { mutedProducerIds } });
            this.mediasoupSocket.to(conferenceId).emit("videoMuted", {
                participantId,
                mutedProducerIds,
            });
            this.emit("videoMuted", { participantId, mutedProducerIds });
        }
        catch (error) {
            console.error("Error muting video:", error);
            callback({ status: "error", data: error });
        }
    }
    async unmuteVideo(socketEventData, callback) {
        const { data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const unmutedProducerIds = await this.mediasoupController?.unmuteVideo({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { unmutedProducerIds } });
            this.mediasoupSocket.to(conferenceId).emit("videoUnmuted", {
                participantId,
                unmutedProducerIds,
            });
            this.emit("videoUnmuted", { participantId, unmutedProducerIds });
        }
        catch (error) {
            console.error("Error unmuting video:", error);
            callback({ status: "error", data: error });
        }
    }
    async getMediaStates(socketEventData, callback) {
        const { data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const mediaStates = this.mediasoupController?.getParticipantMediaStates(conferenceId, participantId);
            callback({ status: "ok", data: mediaStates });
        }
        catch (error) {
            console.error("Error getting media states:", error);
            callback({ status: "error", data: error });
        }
    }
}
exports.default = SocketEventController;
