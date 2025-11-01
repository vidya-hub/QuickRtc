import { EnhancedEventEmitter } from "mediasoup/extras";
import { Server } from "socket.io";
import MediasoupController from "./MediasoupController";
import { SocketResponse, ProducerControlRequest } from "@simple-mediasoup/types";
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
    private pauseProducerHandler;
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
    resumeProducer(socketEventData: ProducerControlRequest, callback: (response: SocketResponse) => void): Promise<void>;
}
export default SocketEventController;
//# sourceMappingURL=SocketController.d.ts.map