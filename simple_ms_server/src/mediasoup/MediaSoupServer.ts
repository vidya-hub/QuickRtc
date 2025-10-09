import { Server, Socket } from "socket.io";
import {
  joinConferenceParams,
  MediasoupConfig,
  SocketEventData,
} from "../types";
import WorkerService from "../workers/WorkerService";
import { EnhancedEventEmitter } from "mediasoup/extras";
import MediasoupController from "../controllers/MediasoupController";
import Conference from "../models/conference";
import { ConsumerOptions } from "mediasoup/types";

class MediaSoupServer extends EnhancedEventEmitter {
  private config: MediasoupConfig;
  private mediasoupSocket: Server;
  public workerService: WorkerService;
  private mediasoupController?: MediasoupController;

  constructor(socketIo: Server, config: MediasoupConfig) {
    super();
    this.mediasoupSocket = socketIo;
    this.config = config;
    this.workerService = new WorkerService(this.config);
  }
  private async createWorkers() {
    await this.workerService.createWorkers();
    this.workerService.on("workerDied", (worker) => {
      console.error(
        "mediasoup worker died, exiting in 2 seconds... [pid:%d]",
        worker.pid
      );
      setTimeout(() => process.exit(1), 2000);
    });
  }
  public async startMediasoup() {
    await this.createWorkers();
    this.mediasoupController = new MediasoupController(this.workerService);
    this.setupMediasoupStateEvent();
  }
  public setupSocketEvents() {
    this.mediasoupSocket.on("connection", (socket: Socket) => {
      this.emit("newConnection", socket);
      this.onNewConnection(socket);

      socket.on("disconnect", () => {
        this.emit("clientDisconnected", socket);
        this.onUserDisconnected(socket);
      });
      socket.on("event", async (socketEventData: SocketEventData) => {
        switch (socketEventData.eventType) {
          case "joinConference":
            await this.handleJoinConference(socketEventData);
            break;
          case "createTransport":
            await this.createTransport(socketEventData);
            break;
          case "connectTransport":
            await this.connectTransport(socketEventData);
            break;
          case "produce":
            await this.produce(socketEventData);
            break;
          case "consume":
            await this.consume(socketEventData);
            break;
          case "resumeConsumer":
            // Handle resumeConsumer event
            break;
          case "leaveConference":
            await this.handleLeaveConference(socket, socketEventData);
            break;

          default:
            console.warn("Unhandled event type:", socketEventData.eventType);
        }
      });
    });
  }
  private setupMediasoupStateEvent() {
    this.mediasoupController?.on(
      "conferenceCreated",
      (conference: Conference) => {
        this.emit("conferenceCreated", conference);
      }
    );
  }

  private async handleJoinConference(socketEventData: SocketEventData) {
    const { callback, errorback } = socketEventData;
    try {
      const { conferenceId, participantId, extraData, socket } =
        socketEventData.data;
      const conferenceName = extraData?.conferenceName;
      const participantName = extraData?.participantName || "Guest";
      const socketId = socket.id;
      const conference: Conference | undefined =
        await this.mediasoupController?.joinConference({
          conferenceId: conferenceId,
          participantId: participantId,
          conferenceName: conferenceName,
          participantName: participantName,
          socketId: socketId,
        });
      socketEventData.data.socket.join(conferenceId);
      this.emit("conferenceJoined", socketEventData);
      if (conference) {
        callback({
          status: "ok",
          data: { routerCapabilities: conference.getRouterRtpsCapabilities() },
        });
      }
    } catch (error) {
      console.error("Error joining conference:", error);
      errorback({ status: "error", data: error });
    }
  }

  private async createTransport(socketEventData: SocketEventData) {
    const { callback, errorback, data } = socketEventData;
    const { extraData, conferenceId, participantId } = data;
    try {
      const transport = await this.mediasoupController?.createTransport({
        conferenceId,
        participantId,
        direction: extraData?.direction,
        options:
          this.mediasoupController.workerService.mediasoupConfig
            .transportConfig,
      });
      callback({ status: "ok", data: transport });
    } catch (error) {
      console.error("Error creating transport:", error);
      errorback({ status: "error", data: error });
    }
  }

  private async connectTransport(socketEventData: SocketEventData) {
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
      callback({ status: "ok", data: {} });
    } catch (error) {
      console.error("Error connecting transport:", error);
      errorback({ status: "error", data: error });
    }
  }
  private async produce(socketEventData: SocketEventData) {
    const { callback, errorback, data } = socketEventData;
    const { extraData, conferenceId, participantId, socket } = data;
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
    } catch (error) {
      console.error("Error producing:", error);
      errorback({ status: "error", data: error });
    }
  }
  private async consume(socketEventData: SocketEventData) {
    const { callback, errorback, data } = socketEventData;
    const { extraData, conferenceId, participantId } = data;
    const { transportId, producerId, rtpCapabilities } = extraData || {};
    const consumeOptions: ConsumerOptions = { producerId, rtpCapabilities };
    const consumerParams = {
      conferenceId,
      participantId,
      consumeOptions,
    };
    try {
      if (!transportId || !producerId || !rtpCapabilities) {
        errorback({
          status: "error",
          data: "Missing required parameters for consuming",
        });
        return;
      }
      // Implement consume logic here
      const consumerResponse = await this.mediasoupController?.consume(
        consumerParams
      );
      callback({ status: "ok", data: consumerResponse });
    } catch (error) {
      console.error("Error consuming:", error);
      errorback({ status: "error", data: error });
    }
  }

  private onUserDisconnected(socket: any) {
    console.log("Client disconnected:", socket.id);
    this.mediasoupController?.userRemoveWithSocketId(socket.id);
    this.emit("userQuit", socket.id);
  }
  private onNewConnection(socket: any) {
    console.log("New client connected:", socket.id);
    this.emit("userSocketConnected", socket);
  }
  private async handleLeaveConference(socket: any, data: any) {
    const { participantId, conferenceId } = data;
    this.mediasoupController?.removeFromConference(conferenceId, participantId);
    this.emit("userQuit", data);
  }
}
