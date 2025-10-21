import { ClientSocket } from "@simple-mediasoup/types";
import { WebRtcTransportOptions } from "mediasoup/types";
import { Device } from "mediasoup-client";
import { Transport } from "mediasoup-client/types";
declare class ClientParticipant {
    participantId: string;
    displayName: string;
    producers: Map<string, string>;
    constructor(participantId: string, displayName: string);
    onTrackProduced(producerId: string): void;
}
declare class ConferenceClient {
    conferenceId: string;
    currentParticipant: ClientParticipant;
    mediaOptions: MediaStreamConstraints;
    participants: Map<string, ClientParticipant>;
    conferenceName?: string;
    webRtcTransportOptions?: WebRtcTransportOptions;
    device: Device;
    sendTransport: Transport;
    recvTransport: Transport;
    private socketClientController;
    constructor(conferenceId: string, conferenceName: string, currentParticipant: ClientParticipant, socket: ClientSocket, webRtcTransportOptions?: WebRtcTransportOptions);
    joinConference(participant: ClientParticipant): Promise<void>;
    consumeExistingPeers(): Promise<void>;
    startLocalMedia(localTrack?: MediaStreamTrack): Promise<void>;
    unpauseConsumer(consumerId: string): Promise<void>;
}
export default ConferenceClient;
