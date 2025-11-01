import { EnhancedEventEmitter } from "mediasoup/extras";
import { Server } from "socket.io";
import MediasoupController from "./MediasoupController";
declare class SocketEventController extends EnhancedEventEmitter {
    private mediasoupController?;
    private mediasoupSocket;
    constructor(mediasoupController: MediasoupController, mediasoupSocket: Server);
    private setupSocketEvents;
    private getParticipants;
    /**
     * Simplified method to consume media by participant ID
     * Client sends participant ID and gets consumer parameters for all their producers
     */
    private consumeParticipantMedia;
    /**
     * Unpause consumer - simplified version
     */
    private unpauseConsumer;
    private closeProducer;
    private closeConsumer;
    private handleJoinConference;
    private createTransport;
    private connectTransport;
    private produce;
    private consume;
    private onUserDisconnected;
    private onNewConnection;
    private handleLeaveConference;
}
export default SocketEventController;
//# sourceMappingURL=SocketController.d.ts.map