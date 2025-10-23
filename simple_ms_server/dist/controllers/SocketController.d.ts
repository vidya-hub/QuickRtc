import { EnhancedEventEmitter } from "mediasoup/extras";
import { Server } from "socket.io";
import MediasoupController from "./MediasoupController";
import { SocketEventData } from "@simple-mediasoup/types";
declare class SocketEventController extends EnhancedEventEmitter {
    private mediasoupController?;
    private mediasoupSocket;
    constructor(mediasoupController: MediasoupController, mediasoupSocket: Server);
    private setupSocketEvents;
    private getParticipants;
    private getProducersWithParticipants;
    /**
     * Simplified method to consume media by participant ID
     * Client sends participant ID and gets consumer parameters for all their producers
     */
    private consumeParticipantMedia;
    /**
     * Unpause consumer - simplified version
     */
    private unpauseConsumer;
    private getProducersWithParticipantId;
    private pauseProducerHandler;
    private pauseConsumer;
    private closeProducer;
    private closeConsumer;
    private handleJoinConference;
    private createTransport;
    private connectTransport;
    private produce;
    private consume;
    private resumeConsumer;
    private onUserDisconnected;
    private onNewConnection;
    private handleLeaveConference;
    private getProducers;
    resumeProducer(socketEventData: SocketEventData, callback: Function): Promise<void>;
    private muteAudio;
    private unmuteAudio;
    private muteVideo;
    private unmuteVideo;
    private getMediaStates;
}
export default SocketEventController;
//# sourceMappingURL=SocketController.d.ts.map