"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const WorkerService_1 = __importDefault(require("../workers/WorkerService"));
const extras_1 = require("mediasoup/extras");
const MediasoupController_1 = __importDefault(require("../controllers/MediasoupController"));
const SocketController_1 = __importDefault(require("../controllers/SocketController"));
class MediaSoupServer extends extras_1.EnhancedEventEmitter {
    constructor(socketIo, config) {
        super();
        this.mediasoupSocket = socketIo;
        this.config = config;
        this.workerService = new WorkerService_1.default(this.config);
        this.socketEventController = new SocketController_1.default(this.mediasoupController, this.mediasoupSocket);
    }
    async createWorkers() {
        await this.workerService.createWorkers();
        this.workerService.on("workerDied", (worker) => {
            console.error("mediasoup worker died, exiting in 2 seconds... [pid:%d]", worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });
    }
    async startMediasoup() {
        await this.createWorkers();
        this.mediasoupController = new MediasoupController_1.default(this.workerService);
        this.setupMediasoupStateEvent();
    }
    setupMediasoupStateEvent() {
        this.mediasoupController?.on("conferenceCreated", (conference) => {
            this.emit("conferenceCreated", conference);
        });
    }
}
exports.default = MediaSoupServer;
