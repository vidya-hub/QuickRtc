import { ClientSocket } from "@simple-mediasoup/types";
import { SocketClientController } from "../controller/SocketClientController";
import { WebRtcTransportOptions } from "mediasoup/types";
import { Device } from "mediasoup-client";
import { AppData, Transport } from "mediasoup-client/types";
class ClientParticipant {
  public participantId: string;
  public displayName: string;
  public producers: Map<string, string> = new Map();

  constructor(participantId: string, displayName: string) {
    this.participantId = participantId;
    this.displayName = displayName;
  }
  onTrackProduced(producerId: string) {
    console.log(
      `Participant ${this.displayName} produced track with producerId: ${producerId}`
    );
    this.producers.set(producerId, producerId);
  }
}

class ConferenceClient {
  public conferenceId: string;
  public currentParticipant: ClientParticipant;
  public mediaOptions!: MediaStreamConstraints;
  public participants: Map<string, ClientParticipant> = new Map();
  public conferenceName?: string;
  public webRtcTransportOptions?: WebRtcTransportOptions;
  public device!: Device;
  public sendTransport!: Transport;
  public recvTransport!: Transport;
  private socketClientController!: SocketClientController;

  constructor(
    conferenceId: string,
    conferenceName: string,
    currentParticipant: ClientParticipant,
    socket: ClientSocket,
    webRtcTransportOptions?: WebRtcTransportOptions
  ) {
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
  async joinConference(participant: ClientParticipant) {
    this.participants.set(participant.participantId, participant);
    const rtpCaps: any = await this.socketClientController.joinConference();
    if (!rtpCaps) {
      return;
    }
    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: rtpCaps });
    const transportRespone =
      await this.socketClientController.createTransports();
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
      onProduce: async (params: {
        kind: "audio" | "video";
        rtpParameters: any;
        appData: AppData;
        producerId: string;
      }) => {
        console.log("Produced: ", params);
        this.participants
          .get(this.currentParticipant.participantId)
          ?.onTrackProduced(params.producerId);
        return params.producerId;
      },
    });
  }

  public async consumeExistingPeers() {
    const existingProducerIds: string[] | undefined =
      await this.socketClientController.getProducers();
    console.log("Existing producers: ", existingProducerIds);
    for (const producerId of existingProducerIds || []) {
      const consumeMediaResponse =
        await this.socketClientController.consumeMedia(
          producerId,
          this.device.rtpCapabilities
        );
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
      dispatchEvent(
        new CustomEvent("trackReceived", { detail: { track, kind, appData } })
      );
    }
  }
  async startLocalMedia(localTrack?: MediaStreamTrack) {
    if (localTrack) {
      this.sendTransport.produce({ track: localTrack });
    }
  }
  async unpauseConsumer(consumerId: string) {
    await this.socketClientController.resumeConsumer(consumerId);
  }
}

export default ConferenceClient;
