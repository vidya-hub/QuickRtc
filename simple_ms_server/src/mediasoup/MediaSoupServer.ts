import { Server } from "socket.io";
import { joinConferenceParams, MediasoupConfig } from "../types";
import WorkerService from "../workers/WorkerService";
import { EnhancedEventEmitter } from "mediasoup/extras";
import MediasoupState from "../state/MediasoupState";
import Conference from "../models/conference";

class MediaSoupServer extends EnhancedEventEmitter {
  private config: MediasoupConfig;
  private mediasoupSocket: Server;
  public workerService: WorkerService;
  private mediasoupState?: MediasoupState;

  constructor(socketIo: Server, config: MediasoupConfig) {
    super();
    this.mediasoupSocket = socketIo;
    this.config = config;
    this.workerService = new WorkerService(this.config.workerConfig);
  }
  public async startMediasoup() {
    await this.createWorkers();
    this.mediasoupState = new MediasoupState(this.workerService);
  }
  public setupSocketEvents() {
    this.mediasoupSocket.on("connection", (socket) => {
      this.emit("newConnection", socket);
      this.onNewConnection(socket);

      socket.on("disconnect", () => {
        this.emit("clientDisconnected", socket);
        this.onUserDisconnected(socket);
      });
      socket.on("event", (data) => {
        switch (data.eventType) {
          case "joinConference":
            this.handleJoinConference(socket, data);
            break;
          case "leaveConference":
            this.handleLeaveConference(data);
            break;

          default:
            console.warn("Unhandled event type:", data.eventType);
        }
      });
    });
  }

  private async handleJoinConference(socket: any, data: any) {
    const {
      participantId,
      participantName,
      conferenceId,
      conferenceName,
      callback,
      errorback,
    } = data;
    try {
      const conference: Conference | undefined =
        await this.mediasoupState?.joinConference({
          conferenceId,
          conferenceName,
          participantId,
          participantName,
          socketId: socket.id,
        });
      socket.join(conferenceId);
      this.emit("conferenceJoined", data);
      if (conference) {
        callback({
          status: "ok",
          //   data: { routerCapabilities: conference.getRouterCapabilities() },
        });
      }
    } catch (error) {}
  }
  private onUserDisconnected(socket: any) {
    console.log("Client disconnected:", socket.id);
    this.mediasoupState?.userRemoveWithSocketId(socket.id);
    this.emit("userQuit", socket.id);
  }
  private onNewConnection(socket: any) {
    console.log("New client connected:", socket.id);
    this.emit("userSocketConnected", socket);
  }
  private handleLeaveConference(data: any) {
    const { participantId, conferenceId } = data;
    this.mediasoupState?.removeFromConference(conferenceId, participantId);
    this.emit("userQuit", data);
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
}
