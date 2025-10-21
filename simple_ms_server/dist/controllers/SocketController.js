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
            socket.on("event", async (socketEventData) => {
                switch (socketEventData.eventType) {
                    case "joinConference":
                        await this.handleJoinConference(socketEventData, socket);
                        break;
                    case "createTransport":
                        await this.createTransport(socketEventData);
                        break;
                    case "connectTransport":
                        await this.connectTransport(socketEventData);
                        break;
                    case "produce":
                        await this.produce(socketEventData, socket);
                        break;
                    case "consume":
                        await this.consume(socketEventData);
                        break;
                    case "resumeConsumer":
                        await this.resumeConsumer(socketEventData);
                        break;
                    case "leaveConference":
                        await this.handleLeaveConference(socket, socketEventData);
                        break;
                    case "resumeProducer":
                        await this.resumeProducer(socketEventData, socket);
                        break;
                    case "getProducers":
                        await this.getProducers(socketEventData);
                        break;
                    case "pauseProducer":
                        await this.pauseProducerHandler(socketEventData, socket);
                        break;
                    case "pauseConsumer":
                        await this.pauseConsumer(socketEventData, socket);
                        break;
                    case "closeProducer":
                        await this.closeProducer(socketEventData, socket);
                        break;
                    case "closeConsumer":
                        await this.closeConsumer(socketEventData, socket);
                        break;
                    case "muteAudio":
                        await this.muteAudio(socketEventData, socket);
                        break;
                    case "unmuteAudio":
                        await this.unmuteAudio(socketEventData, socket);
                        break;
                    case "muteVideo":
                        await this.muteVideo(socketEventData, socket);
                        break;
                    case "unmuteVideo":
                        await this.unmuteVideo(socketEventData, socket);
                        break;
                    case "getMediaStates":
                        await this.getMediaStates(socketEventData);
                        break;
                    default:
                        console.warn("Unhandled event type:", socketEventData.eventType);
                }
            });
        });
    }
    async pauseProducerHandler(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { producerId } = extraData || {};
        if (!producerId) {
            errorback({ status: "error", data: "Missing producerId" });
            return;
        }
        try {
            await this.mediasoupController?.pauseProducer({
                conferenceId,
                participantId,
                producerId,
            });
            callback({ status: "ok" });
            socket.to(conferenceId).emit("producerPaused", {
                participantId,
                producerId
            });
            this.emit("producerPaused", { participantId, producerId });
        }
        catch (error) {
            console.error("Error pausing producer:", error);
            errorback({ status: "error", data: error });
        }
    }
    async pauseConsumer(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { consumerId } = extraData || {};
        if (!consumerId) {
            errorback({ status: "error", data: "Missing consumerId" });
            return;
        }
        try {
            await this.mediasoupController?.pauseConsumer({
                conferenceId,
                participantId,
                consumerId,
            });
            callback({ status: "ok" });
            socket.to(conferenceId).emit("consumerPaused", {
                participantId,
                consumerId
            });
            this.emit("consumerPaused", { participantId, consumerId });
        }
        catch (error) {
            console.error("Error pausing consumer:", error);
            errorback({ status: "error", data: error });
        }
    }
    async closeProducer(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { producerId } = extraData || {};
        if (!producerId) {
            errorback({ status: "error", data: "Missing producerId" });
            return;
        }
        try {
            await this.mediasoupController?.closeProducer({
                conferenceId,
                participantId,
                producerId,
            });
            callback({ status: "ok" });
            socket.to(conferenceId).emit("producerClosed", {
                participantId,
                producerId
            });
            this.emit("producerClosed", { participantId, producerId });
        }
        catch (error) {
            console.error("Error closing producer:", error);
            errorback({ status: "error", data: error });
        }
    }
    async closeConsumer(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { consumerId } = extraData || {};
        if (!consumerId) {
            errorback({ status: "error", data: "Missing consumerId" });
            return;
        }
        try {
            await this.mediasoupController?.closeConsumer({
                conferenceId,
                participantId,
                consumerId,
            });
            callback({ status: "ok" });
            socket.to(conferenceId).emit("consumerClosed", {
                participantId,
                consumerId
            });
            this.emit("consumerClosed", { participantId, consumerId });
        }
        catch (error) {
            console.error("Error closing consumer:", error);
            errorback({ status: "error", data: error });
        }
    }
    async handleJoinConference(socketEventData, socket) {
        const { callback, errorback } = socketEventData;
        try {
            const { conferenceId, participantId, extraData } = socketEventData.data;
            const conferenceName = extraData?.conferenceName;
            const participantName = extraData?.participantName || "Guest";
            const socketId = socket.id;
            const conference = await this.mediasoupController?.joinConference({
                conferenceId: conferenceId,
                participantId: participantId,
                conferenceName: conferenceName,
                participantName: participantName,
                socketId: socketId,
            });
            socket.join(conferenceId);
            this.emit("conferenceJoined", socketEventData);
            if (conference) {
                callback({
                    status: "ok",
                    data: { routerCapabilities: conference.getRouterRtpsCapabilities() },
                });
            }
        }
        catch (error) {
            console.error("Error joining conference:", error);
            errorback({ status: "error", data: error });
        }
    }
    async createTransport(socketEventData) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        try {
            const transport = await this.mediasoupController?.createTransport({
                conferenceId,
                participantId,
                direction: extraData?.direction,
                options: this.mediasoupController.workerService.mediasoupConfig
                    .transportConfig,
            });
            this.emit("transportCreated", transport);
            callback({ status: "ok", data: transport });
        }
        catch (error) {
            console.error("Error creating transport:", error);
            errorback({ status: "error", data: error });
        }
    }
    async connectTransport(socketEventData) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { direction, dtlsParameters } = extraData || {};
        if (!direction || !dtlsParameters) {
            errorback({ status: "error", data: "Missing required parameters" });
            return;
        }
        try {
            await this.mediasoupController?.connectTransport({
                conferenceId,
                participantId,
                dtlsParameters: extraData?.dtlsParameters,
                direction: extraData?.direction,
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
            errorback({ status: "error", data: error });
        }
    }
    async produce(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { transportId, kind, rtpParameters } = extraData || {};
        const producerOptions = { kind, rtpParameters, appData: { participantId } };
        try {
            if (!transportId || !kind || !rtpParameters) {
                errorback({
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
            });
            socket.to(conferenceId).emit("newProducer", {
                producerId,
                participantId,
            });
            callback({ status: "ok", data: { producerId } });
            this.emit("producerCreated", { producerId, participantId });
        }
        catch (error) {
            console.error("Error producing:", error);
            errorback({ status: "error", data: error });
        }
    }
    async consume(socketEventData) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { producerId, rtpCapabilities } = extraData || {};
        const consumeOptions = { producerId, rtpCapabilities };
        const consumerParams = {
            conferenceId,
            participantId,
            consumeOptions,
        };
        try {
            if (!producerId || !rtpCapabilities) {
                errorback({
                    status: "error",
                    data: "Missing required parameters for consuming",
                });
                return;
            }
            // Implement consume logic here
            const consumerResponse = await this.mediasoupController?.consume(consumerParams);
            callback({ status: "ok", data: consumerResponse });
            this.emit("consumerCreated", { ...consumerResponse, participantId });
        }
        catch (error) {
            console.error("Error consuming:", error);
            errorback({ status: "error", data: error });
        }
    }
    async resumeConsumer(socketEventData) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { consumerId } = extraData || {};
        const resumeConsumerParams = {
            conferenceId,
            participantId,
            consumerId,
        };
        if (!consumerId) {
            errorback({ status: "error", data: "Missing consumerId" });
            return;
        }
        try {
            await this.mediasoupController?.resumeConsumer(resumeConsumerParams);
            callback({ status: "ok" });
            this.emit("consumerResumed", { consumerId, participantId });
        }
        catch (error) {
            console.error("Error resuming consumer:", error);
            errorback({ status: "error", data: error });
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
                    closedConsumerIds: cleanup.closedConsumerIds
                });
                // Emit cleanup events for each closed producer and consumer
                cleanup.closedProducerIds.forEach(producerId => {
                    socket.to(cleanup.conferenceId).emit("producerClosed", {
                        participantId: cleanup.participantId,
                        producerId
                    });
                });
                cleanup.closedConsumerIds.forEach(consumerId => {
                    socket.to(cleanup.conferenceId).emit("consumerClosed", {
                        participantId: cleanup.participantId,
                        consumerId
                    });
                });
            }
            this.emit("userQuit", {
                socketId: socket.id,
                ...cleanup
            });
        }
        catch (error) {
            console.error("Error handling user disconnect:", error);
            this.emit("userQuit", socket.id);
        }
    }
    onNewConnection(socket) {
        console.log("New client connected:", socket.id);
        this.emit("userSocketConnected", socket);
    }
    async handleLeaveConference(socket, socketEventData) {
        const { callback, errorback, data } = socketEventData;
        const { participantId, conferenceId } = data;
        try {
            const cleanup = await this.mediasoupController?.removeFromConference(conferenceId, participantId);
            if (cleanup) {
                // Notify other participants about the participant leaving
                socket.to(conferenceId).emit("participantLeft", {
                    participantId,
                    closedProducerIds: cleanup.closedProducerIds,
                    closedConsumerIds: cleanup.closedConsumerIds
                });
                // Emit cleanup events for each closed producer and consumer
                cleanup.closedProducerIds.forEach(producerId => {
                    socket.to(conferenceId).emit("producerClosed", {
                        participantId,
                        producerId
                    });
                });
                cleanup.closedConsumerIds.forEach(consumerId => {
                    socket.to(conferenceId).emit("consumerClosed", {
                        participantId,
                        consumerId
                    });
                });
            }
            socket.leave(conferenceId);
            if (callback) {
                callback({ status: "ok" });
            }
            this.emit("participantLeft", {
                participantId,
                conferenceId,
                ...cleanup
            });
        }
        catch (error) {
            console.error("Error handling leave conference:", error);
            if (errorback) {
                errorback({ status: "error", data: error });
            }
        }
    }
    async getProducers(socketEventData) {
        const { callback, errorback, data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const producerIds = await this.mediasoupController?.getExistingProducerIds(conferenceId, participantId);
            callback({ status: "ok", data: producerIds });
        }
        catch (error) {
            console.error("Error getting producers:", error);
            errorback({ status: "error", data: error });
        }
    }
    async resumeProducer(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { extraData, conferenceId, participantId } = data;
        const { producerId } = extraData || {};
        if (!producerId) {
            errorback({ status: "error", data: "Missing producerId" });
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
            errorback({ status: "error", data: error });
        }
    }
    async muteAudio(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const mutedProducerIds = await this.mediasoupController?.muteAudio({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { mutedProducerIds } });
            socket.to(conferenceId).emit("audioMuted", {
                participantId,
                mutedProducerIds
            });
            this.emit("audioMuted", { participantId, mutedProducerIds });
        }
        catch (error) {
            console.error("Error muting audio:", error);
            errorback({ status: "error", data: error });
        }
    }
    async unmuteAudio(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const unmutedProducerIds = await this.mediasoupController?.unmuteAudio({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { unmutedProducerIds } });
            socket.to(conferenceId).emit("audioUnmuted", {
                participantId,
                unmutedProducerIds
            });
            this.emit("audioUnmuted", { participantId, unmutedProducerIds });
        }
        catch (error) {
            console.error("Error unmuting audio:", error);
            errorback({ status: "error", data: error });
        }
    }
    async muteVideo(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const mutedProducerIds = await this.mediasoupController?.muteVideo({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { mutedProducerIds } });
            socket.to(conferenceId).emit("videoMuted", {
                participantId,
                mutedProducerIds
            });
            this.emit("videoMuted", { participantId, mutedProducerIds });
        }
        catch (error) {
            console.error("Error muting video:", error);
            errorback({ status: "error", data: error });
        }
    }
    async unmuteVideo(socketEventData, socket) {
        const { callback, errorback, data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const unmutedProducerIds = await this.mediasoupController?.unmuteVideo({
                conferenceId,
                participantId,
            });
            callback({ status: "ok", data: { unmutedProducerIds } });
            socket.to(conferenceId).emit("videoUnmuted", {
                participantId,
                unmutedProducerIds
            });
            this.emit("videoUnmuted", { participantId, unmutedProducerIds });
        }
        catch (error) {
            console.error("Error unmuting video:", error);
            errorback({ status: "error", data: error });
        }
    }
    async getMediaStates(socketEventData) {
        const { callback, errorback, data } = socketEventData;
        const { conferenceId, participantId } = data;
        try {
            const mediaStates = this.mediasoupController?.getParticipantMediaStates(conferenceId, participantId);
            callback({ status: "ok", data: mediaStates });
        }
        catch (error) {
            console.error("Error getting media states:", error);
            errorback({ status: "error", data: error });
        }
    }
}
exports.default = SocketEventController;
