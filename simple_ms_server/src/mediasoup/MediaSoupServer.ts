import { Server } from "socket.io";
import { MediasoupConfig } from "../types";
import WorkerService from "../workers/WorkerService";
import { EnhancedEventEmitter } from "mediasoup/extras";
import MediasoupController from "../controllers/MediasoupController";
import Conference from "../models/conference";
import SocketEventController from "../controllers/SocketController";

class MediaSoupServer extends EnhancedEventEmitter {
  private config: MediasoupConfig;
  private mediasoupSocket: Server;
  private workerService: WorkerService;
  private mediasoupController?: MediasoupController;
  private socketEventController?: SocketEventController;

  constructor(socketIo: Server, config: MediasoupConfig) {
    super();
    this.mediasoupSocket = socketIo;
    this.config = config;
    this.workerService = new WorkerService(this.config);
    this.socketEventController = new SocketEventController(
      this.mediasoupController!,
      this.mediasoupSocket!
    );
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
  private setupMediasoupStateEvent() {
    this.mediasoupController?.on(
      "conferenceCreated",
      (conference: Conference) => {
        this.emit("conferenceCreated", conference);
      }
    );
  }
}

export default MediaSoupServer;
