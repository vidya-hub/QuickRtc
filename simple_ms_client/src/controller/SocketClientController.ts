import { ClientSocket, ConsumeParams } from "@simple-mediasoup/types";
import {
  AppData,
  Transport,
  DtlsParameters,
  RtpCapabilities,
} from "mediasoup-client/types";
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
    console.log("in socket client controller");

    const response = await this.socket.emitWithAck("joinConference", {
      data: this.joinParams,
    });
    console.log("join conference response received ", response);

    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return undefined;
    }
    return response.data.routerCapabilities;
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
  async consumeMedia(producerId: string, rtpCapabilities: RtpCapabilities) {
    const response = await this.socket.emitWithAck("consume", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      consumeOptions: { producerId, rtpCapabilities },
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return undefined;
    }
    return response.data;
  }
  async getProducers(): Promise<string[] | undefined> {
    const response = await this.socket.emitWithAck("getProducers", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return undefined;
    }
    return response.data.producerIds as string[];
  }
  async resumeProducer(producerId: string) {
    const response = await this.socket.emitWithAck("resumeProducer", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      producerId: producerId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return;
  }

  async pauseProducer(producerId: string) {
    const response = await this.socket.emitWithAck("pauseProducer", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      extraData: { producerId },
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return;
  }

  async pauseConsumer(consumerId: string) {
    const response = await this.socket.emitWithAck("pauseConsumer", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      extraData: { consumerId },
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return;
  }

  async resumeConsumer(consumerId: string) {
    const response = await this.socket.emitWithAck("resumeConsumer", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      extraData: { consumerId },
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return;
  }

  async closeProducer(producerId: string) {
    const response = await this.socket.emitWithAck("closeProducer", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      extraData: { producerId },
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return;
  }

  async closeConsumer(consumerId: string) {
    const response = await this.socket.emitWithAck("closeConsumer", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      extraData: { consumerId },
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return;
  }

  async muteAudio() {
    const response = await this.socket.emitWithAck("muteAudio", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return response.data;
  }

  async unmuteAudio() {
    const response = await this.socket.emitWithAck("unmuteAudio", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return response.data;
  }

  async muteVideo() {
    const response = await this.socket.emitWithAck("muteVideo", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return response.data;
  }

  async unmuteVideo() {
    const response = await this.socket.emitWithAck("unmuteVideo", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return response.data;
  }

  async getMediaStates() {
    const response = await this.socket.emitWithAck("getMediaStates", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return response.data;
  }

  async leaveConference() {
    const response = await this.socket.emitWithAck("leaveConference", {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    return;
  }
  async getParticipants() {
    const response = await this.socket.emitWithAck("getParticipants", {
      conferenceId: this.joinParams.conferenceId,
    });
    if (response.status == "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
      return;
    }
    console.log("participants ", response.data);

    return response.data;
  }

  // Setup socket event listeners for real-time events
  setupEventListeners() {
    const logger = (
      message: string,
      level: "info" | "warn" | "error" = "info"
    ) => {
      const timestamp = new Date().toISOString();
      const prefix = `[SocketClientController:${this.joinParams.participantId}]`;
      console[level](`${timestamp} ${prefix} ${message}`);
    };

    logger("Setting up socket event listeners");

    // Participant events
    this.socket.on("participantJoined", (data) => {
      logger(`Participant joined event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(
        new CustomEvent("participantJoined", { detail: data })
      );
    });

    this.socket.on("participantLeft", (data) => {
      logger(`Participant left event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("participantLeft", { detail: data }));
    });

    // Producer/Consumer events
    this.socket.on("newProducer", (data) => {
      logger(`New producer event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("newProducer", { detail: data }));
    });

    this.socket.on("producerClosed", (data) => {
      logger(`Producer closed event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("producerClosed", { detail: data }));
    });

    this.socket.on("consumerClosed", (data) => {
      logger(`Consumer closed event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("consumerClosed", { detail: data }));
    });

    // Media state events
    this.socket.on("audioMuted", (data) => {
      logger(`Audio muted event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("audioMuted", { detail: data }));
    });

    this.socket.on("audioUnmuted", (data) => {
      logger(`Audio unmuted event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("audioUnmuted", { detail: data }));
    });

    this.socket.on("videoMuted", (data) => {
      logger(`Video muted event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("videoMuted", { detail: data }));
    });

    this.socket.on("videoUnmuted", (data) => {
      logger(`Video unmuted event received: ${JSON.stringify(data)}`);
      this.dispatchEvent(new CustomEvent("videoUnmuted", { detail: data }));
    });

    // Connection events
    this.socket.on("disconnect", (reason) => {
      logger(`Socket disconnected: ${reason}`, "warn");
      this.dispatchEvent(
        new CustomEvent("disconnected", { detail: { reason } })
      );
    });

    // Connection events (using any socket for connection events since they're not in typed interface)
    const anySocket = this.socket as any;

    anySocket.on("connect", () => {
      logger("Socket connected");
      this.dispatchEvent(new CustomEvent("connected", { detail: {} }));
    });

    anySocket.on("connect_error", (error: any) => {
      logger(`Socket connection error: ${error.message}`, "error");
      this.dispatchEvent(
        new CustomEvent("connectionError", { detail: { error } })
      );
    });

    anySocket.on("reconnect", (attemptNumber: number) => {
      logger(`Socket reconnected after ${attemptNumber} attempts`);
      this.dispatchEvent(
        new CustomEvent("reconnected", { detail: { attemptNumber } })
      );
    });

    anySocket.on("reconnecting", (attemptNumber: number) => {
      logger(`Socket reconnecting... attempt ${attemptNumber}`);
      this.dispatchEvent(
        new CustomEvent("reconnecting", { detail: { attemptNumber } })
      );
    });

    anySocket.on("error", (error: any) => {
      logger(`Socket error: ${error}`, "error");
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { error, message: error.toString() },
        })
      );
    });

    logger("Socket event listeners setup complete");
  }
}
