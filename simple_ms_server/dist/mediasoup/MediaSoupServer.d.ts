import { Server } from "socket.io";
import { EnhancedEventEmitter } from "mediasoup/extras";
import { MediasoupConfig } from "@simple-mediasoup/types";
declare class MediaSoupServer extends EnhancedEventEmitter {
    private config;
    private mediasoupSocket;
    private workerService;
    private mediasoupController?;
    private socketEventController?;
    constructor(socketIo: Server, config: MediasoupConfig);
    private createWorkers;
    startMediasoup(): Promise<void>;
    private setupMediasoupStateEvent;
}
export default MediaSoupServer;
//# sourceMappingURL=MediaSoupServer.d.ts.map