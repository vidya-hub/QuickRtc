import { ClientSocket } from "@simple-mediasoup/types";
import { AppData, Transport } from "mediasoup-client/types";
import { WebRtcTransportOptions } from "mediasoup/types";

export type JoinParams = {
  conferenceId: string;
  participantName: string;
  participantId: string;
  conferenceName?: string;
  socketId: string;
  webRtcTransportOptions?: WebRtcTransportOptions;
};

export type JoinResponse = {
  participantId: string;
};

export class SocketClientController extends EventTarget {
  private socket: ClientSocket;
  private joinParams: JoinParams;
  constructor(socket: ClientSocket, joinParams: JoinParams) {
    super();
    this.socket = socket;
    this.joinParams = joinParams;
  }
  public async joinConference() {
    const response = await this.socket.emitWithAck("joinConference", {
      ...this.joinParams,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return undefined;
    }
    return response.routerCapabilities;
  }
  public async createTransports(): Promise<
    { sendTransport: any; recvTransport: any } | undefined
  > {
    const createSendTransportResponse = await this.socket.emitWithAck(
      "createTransport",
      {
        conferenceId: this.joinParams.conferenceId,
        direction: "producer",
        participantId: this.joinParams.participantId,
        options: this.joinParams.webRtcTransportOptions,
      }
    );
    if (createSendTransportResponse.status == "error") {
      this.dispatchEvent(
        new CustomEvent("error", { detail: createSendTransportResponse.data })
      );
      return;
    }
    const createRecvTransportResponse = await this.socket.emitWithAck(
      "createTransport",
      {
        conferenceId: this.joinParams.conferenceId,
        direction: "consumer",
        participantId: this.joinParams.participantId,
        options: this.joinParams.webRtcTransportOptions,
      }
    );
    if (createRecvTransportResponse.status == "error") {
      this.dispatchEvent(
        new CustomEvent("error", { detail: createRecvTransportResponse.data })
      );
      return;
    }
    return {
      sendTransport: createSendTransportResponse.data,
      recvTransport: createRecvTransportResponse.data,
    };
  }
  public addSendTransportListener(sendTransport: Transport<AppData>) {
    sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await this.socket.emitWithAck("connectTransport", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            transportId: sendTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          errback(error);
        }
      }
    );

    sendTransport.on("produce", async (params, callback, errback) => {
      try {
        const response = await this.socket.emitWithAck("produce", {
          conferenceId: this.joinParams.conferenceId,
          participantId: this.joinParams.participantId,
          transportId: sendTransport.id,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
          appData: params.appData,
        });
        callback({ id: response.producerId });
      } catch (error) {
        errback(error);
      }
    });
  }
}
