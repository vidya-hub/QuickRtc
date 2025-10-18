import { ClientSocket, ConsumeParams } from "@simple-mediasoup/types";
import { AppData, Transport, DtlsParameters } from "mediasoup-client/types";
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
  public addSendTransportListener({
    sendTransport,
    onProduce,
  }: {
    sendTransport: Transport<AppData>;
    onProduce: (params: {
      kind: "audio" | "video";
      rtpParameters: any;
      appData: AppData;
      producerId: string;
    }) => void;
  }) {
    sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          const response = await this.socket.emitWithAck("connectTransport", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            transportId: sendTransport.id,
            direction: "producer",
            dtlsParameters,
          });
          if (response.status === "ok") {
            callback();
          } else {
            errback(new Error("Failed to connect transport"));
          }
        } catch (error) {
          console.log("Failed to connect to transport");
          errback(new Error("Failed to connect transport"));
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
        if (response.status === "ok") {
          callback({ id: response.data.producerId });
          onProduce({
            kind: params.kind,
            rtpParameters: params.rtpParameters,
            appData: params.appData,
            producerId: response.data.producerId,
          });
        } else {
          errback(new Error("Failed to produce"));
        }
      } catch (error) {
        errback(new Error("Failed to produce"));
      }
    });
  }
  async addConsumeTransportListener({
    recvTransport,
    onConsume,
  }: {
    recvTransport: any;
    onConsume: (params: {
      producerId: string;
      id: string;
      kind: "audio" | "video";
      rtpParameters: any;
      appData: AppData;
    }) => void;
  }) {
    recvTransport.on(
      "connect",
      async (
        { dtlsParameters }: { dtlsParameters: DtlsParameters },
        callback: () => void,
        errback: (error: Error) => void
      ) => {
        try {
          const response = await this.socket.emitWithAck("connectTransport", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            transportId: recvTransport.id,
            direction: "consumer",
            dtlsParameters,
          });
          if (response.status === "ok") {
            callback();
          } else {
            errback(new Error("Failed to connect transport"));
          }
        } catch (error) {
          console.log("Failed to connect to transport");
          errback(new Error("Failed to connect transport"));
        }
      }
    );
    recvTransport.on(
      "consume",
      async (
        params: ConsumeParams,
        callback: (data: any) => void,
        errback: (error: Error) => void
      ) => {
        try {
          const response = await this.socket.emitWithAck("consume", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            transportId: recvTransport.id,
            producerId: params.consumeOptions.producerId,
            rtpCapabilities: params.consumeOptions.rtpCapabilities,
          });
          if (response.status === "ok") {
            const { id, kind, rtpParameters, appData } = response.data;
            callback({ id, kind, rtpParameters, appData });
            onConsume({
              producerId: params.consumeOptions.producerId,
              id,
              kind,
              rtpParameters,
              appData,
            });
          } else {
            errback(new Error("Failed to consume"));
          }
        } catch (error) {
          errback(new Error("Failed to consume"));
        }
      }
    );
  }

  // pauseLocalMedia() {
  //   this.socket.emit("pauseLocalMedia", {
  //     conferenceId: this.joinParams.conferenceId,
  //     participantId: this.joinParams.participantId,
  //   });
  // }
}
