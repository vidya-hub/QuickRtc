"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleServer = void 0;
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const MediasoupController_1 = __importDefault(require("./controllers/MediasoupController"));
const SocketController_1 = __importDefault(require("./controllers/SocketController"));
const WorkerService_1 = require("./workers/WorkerService");
/**
 * SimpleServer - A high-level, easy-to-use MediaSoup server abstraction
 *
 * Features:
 * - Simple setup with minimal configuration
 * - Event-driven architecture
 * - Automatic conference management
 * - Built-in error handling
 * - Real-time participant tracking
 */
class SimpleServer extends EventTarget {
    constructor(config = {}) {
        super();
        this.conferences = new Map();
        this.participants = new Map();
        this.isStarted = false;
        this.config = {
            port: 3000,
            host: "0.0.0.0",
            cors: {
                origin: "*",
                credentials: true,
            },
            ...config,
        };
    }
    /**
     * Start the server
     */
    async start() {
        try {
            if (this.isStarted) {
                throw new Error("Server is already started");
            }
            // Create HTTP server
            this.httpServer = (0, http_1.createServer)();
            // Setup Socket.IO
            this.io = new socket_io_1.Server(this.httpServer, {
                cors: this.config.cors,
                transports: ["websocket", "polling"],
            });
            // Initialize MediaSoup components
            await this.initializeMediaSoup();
            // Setup event handling
            this.setupEventHandlers();
            // Start HTTP server
            await new Promise((resolve, reject) => {
                this.httpServer.listen(this.config.port, this.config.host, () => {
                    console.log(`🚀 Simple MediaSoup Server started on ${this.config.host}:${this.config.port}`);
                    this.isStarted = true;
                    this.emit("serverStarted", {
                        port: this.config.port,
                        host: this.config.host,
                    });
                    resolve();
                });
                this.httpServer.on("error", (error) => {
                    reject(error);
                });
            });
        }
        catch (error) {
            console.error("Failed to start server:", error);
            this.emit("serverError", {
                error: error instanceof Error ? error : new Error("Unknown server error"),
            });
            throw error;
        }
    }
    /**
     * Stop the server
     */
    async stop() {
        try {
            if (!this.isStarted) {
                return;
            }
            // Close all socket connections
            if (this.io) {
                this.io.close();
            }
            // Close HTTP server
            if (this.httpServer) {
                await new Promise((resolve) => {
                    this.httpServer.close(() => {
                        resolve();
                    });
                });
            }
            // Clean up MediaSoup resources
            if (this.workerService) {
                // Close all workers manually
                const workers = this.workerService.getWorkers();
                await Promise.all(workers.map((worker) => worker.close()));
            }
            // Clear data
            this.conferences.clear();
            this.participants.clear();
            this.isStarted = false;
            console.log("🛑 Simple MediaSoup Server stopped");
        }
        catch (error) {
            console.error("Error stopping server:", error);
            this.emit("serverError", {
                error: error instanceof Error ? error : new Error("Unknown stop error"),
            });
        }
    }
    /**
     * Get all active conferences
     */
    getConferences() {
        return Array.from(this.conferences.values());
    }
    /**
     * Get conference by ID
     */
    getConference(conferenceId) {
        return this.conferences.get(conferenceId);
    }
    /**
     * Get all participants
     */
    getParticipants() {
        return Array.from(this.participants.values());
    }
    /**
     * Get participants in a specific conference
     */
    getConferenceParticipants(conferenceId) {
        return Array.from(this.participants.values()).filter((p) => p.conferenceId === conferenceId);
    }
    /**
     * Get participant by ID
     */
    getParticipant(participantId) {
        return this.participants.get(participantId);
    }
    /**
     * Kick a participant from conference
     */
    async kickParticipant(participantId, reason) {
        const participant = this.participants.get(participantId);
        if (!participant) {
            throw new Error("Participant not found");
        }
        try {
            // Find the socket and disconnect it
            const socket = this.io?.sockets.sockets.get(participant.socketId);
            if (socket) {
                socket.emit("kicked", { reason: reason || "Kicked by administrator" });
                socket.disconnect(true);
            }
            console.log(`👢 Kicked participant ${participantId} from conference ${participant.conferenceId}`);
        }
        catch (error) {
            console.error("Failed to kick participant:", error);
            throw error;
        }
    }
    /**
     * Close a conference (kick all participants)
     */
    async closeConference(conferenceId, reason) {
        const participants = this.getConferenceParticipants(conferenceId);
        try {
            // Kick all participants
            await Promise.all(participants.map((p) => this.kickParticipant(p.id, reason)));
            // Remove conference
            this.conferences.delete(conferenceId);
            console.log(`🏠 Closed conference ${conferenceId}`);
            this.emit("conferenceDestroyed", { conferenceId });
        }
        catch (error) {
            console.error("Failed to close conference:", error);
            throw error;
        }
    }
    /**
     * Broadcast message to all participants in a conference
     */
    broadcastToConference(conferenceId, event, data) {
        if (this.io) {
            this.io.to(conferenceId).emit(event, data);
        }
    }
    /**
     * Send message to specific participant
     */
    sendToParticipant(participantId, event, data) {
        const participant = this.participants.get(participantId);
        if (participant && this.io) {
            const socket = this.io.sockets.sockets.get(participant.socketId);
            if (socket) {
                socket.emit(event, data);
            }
        }
    }
    /**
     * Get server statistics
     */
    getStats() {
        return {
            uptime: process.uptime(),
            conferenceCount: this.conferences.size,
            participantCount: this.participants.size,
            totalConnections: this.io?.sockets.sockets.size || 0,
        };
    }
    /**
     * Type-safe event emitter
     */
    emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }
    /**
     * Type-safe event listener
     */
    on(type, listener) {
        this.addEventListener(type, listener);
    }
    /**
     * Remove event listener
     */
    off(type, listener) {
        this.removeEventListener(type, listener);
    }
    async initializeMediaSoup() {
        try {
            // Initialize Worker Service with default config
            const defaultMediasoupConfig = {
                workerConfig: this.config.mediasoup?.workerSettings || {},
                routerConfig: this.config.mediasoup?.routerOptions || {},
                transportConfig: this.config.mediasoup?.transportOptions || {},
            };
            this.workerService = new WorkerService_1.WorkerService(defaultMediasoupConfig);
            await this.workerService.createWorkers();
            // Initialize MediaSoup Controller
            this.mediasoupController = new MediasoupController_1.default(this.workerService);
            // Initialize Socket Controller
            this.socketController = new SocketController_1.default(this.mediasoupController, this.io);
            console.log("✅ MediaSoup components initialized");
        }
        catch (error) {
            console.error("Failed to initialize MediaSoup:", error);
            throw error;
        }
    }
    setupEventHandlers() {
        if (!this.socketController)
            return;
        // Connection events
        this.socketController.on("newConnection", (socket) => {
            console.log(`🔌 New connection: ${socket.id}`);
            this.emit("clientConnected", { socketId: socket.id });
        });
        this.socketController.on("clientDisconnected", (socket) => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            this.emit("clientDisconnected", { socketId: socket.id });
        });
        // Conference events
        this.socketController.on("conferenceJoined", (data) => {
            const { conferenceId, participantId, extraData } = data.data;
            const participantName = extraData?.participantName || "Unknown";
            const socketId = data.socketId || "unknown";
            // Create or update conference
            if (!this.conferences.has(conferenceId)) {
                const conference = {
                    id: conferenceId,
                    name: extraData?.conferenceName,
                    participantCount: 0,
                    createdAt: new Date(),
                };
                this.conferences.set(conferenceId, conference);
                this.emit("conferenceCreated", { conference });
            }
            // Add participant
            const participant = {
                id: participantId,
                name: participantName,
                conferenceId,
                socketId,
                joinedAt: new Date(),
                mediaState: {
                    audioEnabled: true,
                    videoEnabled: true,
                    audioProducerIds: [],
                    videoProducerIds: [],
                },
            };
            this.participants.set(participantId, participant);
            // Update conference participant count
            const conference = this.conferences.get(conferenceId);
            if (conference) {
                conference.participantCount =
                    this.getConferenceParticipants(conferenceId).length;
            }
            console.log(`👋 ${participantName} joined conference ${conferenceId}`);
            this.emit("participantJoined", { participant });
        });
        this.socketController.on("participantLeft", (data) => {
            const { participantId, conferenceId } = data;
            const participant = this.participants.get(participantId);
            if (participant) {
                this.participants.delete(participantId);
                // Update conference participant count
                const conference = this.conferences.get(conferenceId);
                if (conference) {
                    const remainingParticipants = this.getConferenceParticipants(conferenceId);
                    conference.participantCount = remainingParticipants.length;
                    // Remove conference if empty
                    if (remainingParticipants.length === 0) {
                        this.conferences.delete(conferenceId);
                        this.emit("conferenceDestroyed", { conferenceId });
                    }
                }
                console.log(`👋 ${participant.name} left conference ${conferenceId}`);
                this.emit("participantLeft", { participant });
            }
        });
        // Media events
        this.socketController.on("producerCreated", (data) => {
            const { producerId, participantId } = data;
            const participant = this.participants.get(participantId);
            if (participant) {
                // In a real implementation, you would determine the media type from the producer data
                // For now, we'll track all producers in the video array and let the client handle the logic
                participant.mediaState.videoProducerIds.push(producerId);
                console.log(`📹 Producer created: ${producerId} for ${participant.name}`);
                this.emit("producerCreated", {
                    participantId,
                    producerId,
                    kind: "video",
                });
            }
        });
        this.socketController.on("producerClosed", (data) => {
            const { producerId, participantId } = data;
            console.log(`📹 Producer closed: ${producerId} for participant ${participantId}`);
            this.emit("producerClosed", { participantId, producerId });
        });
        this.socketController.on("consumerCreated", (data) => {
            const { consumerId, participantId, producerId } = data;
            console.log(`📺 Consumer created: ${consumerId} for participant ${participantId}`);
            this.emit("consumerCreated", { participantId, consumerId, producerId });
        });
        this.socketController.on("consumerClosed", (data) => {
            const { consumerId, participantId } = data;
            console.log(`📺 Consumer closed: ${consumerId} for participant ${participantId}`);
            this.emit("consumerClosed", { participantId, consumerId });
        });
        // Media state events
        this.socketController.on("audioMuted", (data) => {
            const { participantId } = data;
            const participant = this.participants.get(participantId);
            if (participant) {
                participant.mediaState.audioEnabled = false;
                console.log(`🔇 Audio muted for ${participant.name}`);
                this.emit("audioMuted", {
                    participantId,
                    conferenceId: participant.conferenceId,
                });
            }
        });
        this.socketController.on("audioUnmuted", (data) => {
            const { participantId } = data;
            const participant = this.participants.get(participantId);
            if (participant) {
                participant.mediaState.audioEnabled = true;
                console.log(`🔊 Audio unmuted for ${participant.name}`);
                this.emit("audioUnmuted", {
                    participantId,
                    conferenceId: participant.conferenceId,
                });
            }
        });
        this.socketController.on("videoMuted", (data) => {
            const { participantId } = data;
            const participant = this.participants.get(participantId);
            if (participant) {
                participant.mediaState.videoEnabled = false;
                console.log(`📵 Video muted for ${participant.name}`);
                this.emit("videoMuted", {
                    participantId,
                    conferenceId: participant.conferenceId,
                });
            }
        });
        this.socketController.on("videoUnmuted", (data) => {
            const { participantId } = data;
            const participant = this.participants.get(participantId);
            if (participant) {
                participant.mediaState.videoEnabled = true;
                console.log(`📹 Video unmuted for ${participant.name}`);
                this.emit("videoUnmuted", {
                    participantId,
                    conferenceId: participant.conferenceId,
                });
            }
        });
    }
}
exports.SimpleServer = SimpleServer;
