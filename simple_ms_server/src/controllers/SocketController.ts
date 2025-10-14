import { EnhancedEventEmitter } from "mediasoup/extras";
import { Server, Socket } from "socket.io";
import { SocketEventData } from "../types";
import MediasoupController from "./MediasoupController";
import MediasoupConference from "../models/conference";
import { ConsumerOptions } from "mediasoup/types";

class SocketEventController extends EnhancedEventEmitter {
  private mediasoupController?: MediasoupController;
  private mediasoupSocket: Server;

  constructor(
    mediasoupController: MediasoupController,
    mediasoupSocket: Server
  ) {
    super();
    this.mediasoupController = mediasoupController;
    this.mediasoupSocket = mediasoupSocket;
    this.setupSocketEvents();
  }

  private setupSocketEvents() {
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
            await this.resumeConsumer(socketEventData);
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

  private async handleJoinConference(socketEventData: SocketEventData) {
    const { callback, errorback } = socketEventData;
    try {
      const { conferenceId, participantId, extraData, socket } =
        socketEventData.data;
      const conferenceName = extraData?.conferenceName;
      const participantName = extraData?.participantName || "Guest";
      const socketId = socket.id;
      const conference: MediasoupConference | undefined =
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
      this.emit("transportCreated", transport);
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
      this.emit("transportConnected", {
        conferenceId,
        participantId,
        direction,
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
      this.emit("producerCreated", { producerId, participantId });
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
      this.emit("consumerCreated", { ...consumerResponse, participantId });
    } catch (error) {
      console.error("Error consuming:", error);
      errorback({ status: "error", data: error });
    }
  }

  private async resumeConsumer(socketEventData: SocketEventData) {
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
    } catch (error) {
      console.error("Error resuming consumer:", error);
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

export default SocketEventController;
