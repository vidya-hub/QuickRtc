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
            socket.on("closeProducer", async (socketEventData, callback) => {
                await this.closeProducer(socketEventData, callback);
            });
            socket.on("closeConsumer", async (socketEventData, callback) => {
                await this.closeConsumer(socketEventData, callback);
            });
            socket.on("consumeParticipantMedia", async (socketEventData, callback) => {
                await this.consumeParticipantMedia(socketEventData, callback);
            });
            socket.on("unpauseConsumer", async (socketEventData, callback) => {
                await this.unpauseConsumer(socketEventData, callback);
            });
            socket.on("getParticipants", async (socketEventData, callback) => {
                await this.getParticipants(socketEventData, callback);
            });
            socket.on("leaveConference", async (socketEventData, callback) => {
                await this.handleLeaveConference(socket, socketEventData, callback);
            });
            socket.onAny((eventName, ...args) => {
                console.log(`[Socket Event] ${eventName}`, JSON.stringify(args, null, 2));
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
            callback({ status: "error", error: error.message });
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
                    error: "Missing required parameters: conferenceId, participantId, targetParticipantId, rtpCapabilities",
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
            callback({ status: "error", error: error.message });
        }
    }
    /**
     * Unpause consumer - simplified version
     */
    async unpauseConsumer(socketEventData, callback) {
        const { conferenceId, participantId, consumerId } = socketEventData;
        try {
            if (!consumerId) {
                callback({ status: "error", error: "Missing consumerId" });
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
            callback({ status: "error", error: error.message });
        }
    }
    async closeProducer(socketEventData, callback) {
        const { extraData, conferenceId, participantId } = socketEventData;
        const { producerId } = extraData || {};
        if (!producerId) {
            callback({ status: "error", error: "Missing producerId" });
            return;
        }
        try {
            const kind = await this.mediasoupController?.closeProducer({
                conferenceId,
                participantId,
                producerId,
            });
            callback({ status: "ok" });
            const producerClosedData = {
                participantId,
                producerId,
                kind: kind || "video", // Default to video if kind is null
            };
            this.mediasoupSocket
                .to(conferenceId)
                .emit("producerClosed", producerClosedData);
            this.emit("producerClosed", producerClosedData);
        }
        catch (error) {
            console.error("Error closing producer:", error);
            callback({ status: "error", error: error.message });
        }
    }
    async closeConsumer(socketEventData, callback) {
        const { extraData, conferenceId, participantId } = socketEventData;
        const { consumerId } = extraData || {};
        if (!consumerId) {
            callback({ status: "error", error: "Missing consumerId" });
            return;
        }
        try {
            await this.mediasoupController?.closeConsumer({
                conferenceId,
                participantId,
                consumerId,
            });
            callback({ status: "ok" });
            const consumerClosedData = {
                participantId,
                consumerId,
            };
            this.mediasoupSocket
                .to(conferenceId)
                .emit("consumerClosed", consumerClosedData);
            this.emit("consumerClosed", consumerClosedData);
        }
        catch (error) {
            console.error("Error closing consumer:", error);
            callback({ status: "error", error: error.message });
        }
    }
    async handleJoinConference(socketEventData, socket, callback) {
        console.log("received data socket ", socketEventData);
        try {
            const { conferenceId, participantId, conferenceName, participantName } = socketEventData;
            const conference = await this.mediasoupController?.joinConference({
                conferenceId: conferenceId,
                participantId: participantId,
                conferenceName: conferenceName || conferenceId,
                participantName: participantName,
                socketId: socket.id,
            });
            console.log("mediasoup con response ", conference);
            socket.join(conferenceId);
            const participantJoinedData = {
                participantId,
                participantName,
                conferenceId,
            };
            socket.to(conferenceId).emit("participantJoined", participantJoinedData);
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
            else {
                callback({ status: "error", error: "Failed to join conference" });
            }
        }
        catch (error) {
            console.error("Error joining conference:", error);
            callback({ status: "error", error: error.message });
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
            callback({ status: "error", error: error.message });
        }
    }
    async connectTransport(socketEventData, callback) {
        console.log("connect data ", socketEventData);
        const { conferenceId, participantId } = socketEventData;
        const { direction, dtlsParameters } = socketEventData;
        if (!direction || !dtlsParameters) {
            callback({ status: "error", error: "Missing required parameters" });
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
            callback({ status: "ok" });
        }
        catch (error) {
            console.error("Error connecting transport:", error);
            callback({ status: "error", error: error.message });
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
                    error: "Missing required parameters for producing",
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
            const newProducerData = {
                producerId: producerId,
                participantId,
                participantName,
                kind,
            };
            socket.to(conferenceId).emit("newProducer", newProducerData);
            callback({ status: "ok", data: { producerId: producerId } });
            this.emit("producerCreated", { producerId, participantId });
        }
        catch (error) {
            console.error("Error producing:", error);
            callback({ status: "error", error: error.message });
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
                    error: "Missing required parameters for consuming",
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
            callback({ status: "error", error: error.message });
        }
    }
    async onUserDisconnected(socket) {
        console.log("Client disconnected:", socket.id);
        try {
            const cleanup = await this.mediasoupController?.userRemoveWithSocketId(socket.id);
            if (cleanup?.conferenceId && cleanup?.participantId) {
                const conferenceId = cleanup.conferenceId;
                // Notify other participants about the disconnection
                const participantLeftData = {
                    participantId: cleanup.participantId,
                    closedProducerIds: cleanup.closedProducerIds,
                    closedConsumerIds: cleanup.closedConsumerIds,
                };
                socket.to(conferenceId).emit("participantLeft", participantLeftData);
                // Emit cleanup events for each closed producer and consumer
                cleanup.closedProducerIds.forEach((producerId) => {
                    const producerClosedData = {
                        participantId: cleanup.participantId,
                        producerId,
                        kind: "video", // Default for cleanup
                    };
                    socket.to(conferenceId).emit("producerClosed", producerClosedData);
                });
                cleanup.closedConsumerIds.forEach((consumerId) => {
                    const consumerClosedData = {
                        participantId: cleanup.participantId,
                        consumerId,
                    };
                    socket.to(conferenceId).emit("consumerClosed", consumerClosedData);
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
                const participantLeftData = {
                    participantId,
                    closedProducerIds: cleanup.closedProducerIds,
                    closedConsumerIds: cleanup.closedConsumerIds,
                };
                socket.to(conferenceId).emit("participantLeft", participantLeftData);
                // Emit cleanup events for each closed producer and consumer
                cleanup.closedProducerIds.forEach((producerId) => {
                    const producerClosedData = {
                        participantId,
                        producerId,
                        kind: "video", // Default for cleanup
                    };
                    socket.to(conferenceId).emit("producerClosed", producerClosedData);
                });
                cleanup.closedConsumerIds.forEach((consumerId) => {
                    const consumerClosedData = {
                        participantId,
                        consumerId,
                    };
                    socket.to(conferenceId).emit("consumerClosed", consumerClosedData);
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
            callback({ status: "error", error: error.message });
        }
    }
}
exports.default = SocketEventController;
