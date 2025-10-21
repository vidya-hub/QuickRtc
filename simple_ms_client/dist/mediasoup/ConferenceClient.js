import { SocketClientController } from "../controller/SocketClientController";
import { Device } from "mediasoup-client";
class ClientParticipant {
    constructor(participantId, displayName) {
        this.producers = new Map();
        this.participantId = participantId;
        this.displayName = displayName;
    }
    onTrackProduced(producerId) {
        console.log(`Participant ${this.displayName} produced track with producerId: ${producerId}`);
        this.producers.set(producerId, producerId);
    }
}
class ConferenceClient {
    constructor(conferenceId, conferenceName, currentParticipant, socket, webRtcTransportOptions) {
        this.participants = new Map();
        this.conferenceId = conferenceId;
        this.conferenceName = conferenceName;
        this.currentParticipant = currentParticipant;
        this.socketClientController = new SocketClientController(socket, {
            conferenceId: this.conferenceId,
            participantId: this.currentParticipant.participantId,
            participantName: this.currentParticipant.displayName,
            conferenceName: this.conferenceName,
            socketId: socket.id || "",
            webRtcTransportOptions: webRtcTransportOptions,
        });
        this.joinConference(currentParticipant);
    }
    async joinConference(participant) {
        this.participants.set(participant.participantId, participant);
        const rtpCaps = await this.socketClientController.joinConference();
        if (!rtpCaps) {
            return;
        }
        this.device = new Device();
        await this.device.load({ routerRtpCapabilities: rtpCaps });
        const transportRespone = await this.socketClientController.createTransports();
        if (!transportRespone) {
            return;
        }
        const { sendTransport, recvTransport } = transportRespone;
        this.sendTransport = this.device.createSendTransport({
            id: sendTransport.id,
            iceParameters: sendTransport.iceParameters,
            iceCandidates: sendTransport.iceCandidates,
            dtlsParameters: sendTransport.dtlsParameters,
        });
        this.recvTransport = this.device.createRecvTransport({
            id: recvTransport.id,
            iceParameters: recvTransport.iceParameters,
            iceCandidates: recvTransport.iceCandidates,
            dtlsParameters: recvTransport.dtlsParameters,
        });
        this.socketClientController.addSendTransportListener({
            sendTransport: this.sendTransport,
            onProduce: async (params) => {
                console.log("Produced: ", params);
                this.participants
                    .get(this.currentParticipant.participantId)
                    ?.onTrackProduced(params.producerId);
                return params.producerId;
            },
        });
    }
    async consumeExistingPeers() {
        const existingProducerIds = await this.socketClientController.getProducers();
        console.log("Existing producers: ", existingProducerIds);
        for (const producerId of existingProducerIds || []) {
            const consumeMediaResponse = await this.socketClientController.consumeMedia(producerId, this.device.rtpCapabilities);
            if (!consumeMediaResponse) {
                continue;
            }
            const { id, kind, rtpParameters, appData } = consumeMediaResponse;
            const consumer = await this.recvTransport.consume({
                id,
                producerId,
                kind,
                rtpParameters,
                appData,
            });
            const track = consumer.track;
            dispatchEvent(new CustomEvent("trackReceived", { detail: { track, kind, appData } }));
        }
    }
    async startLocalMedia(localTrack) {
        if (localTrack) {
            this.sendTransport.produce({ track: localTrack });
        }
    }
    async unpauseConsumer(consumerId) {
        await this.socketClientController.resumeConsumer(consumerId);
    }
}
export default ConferenceClient;
