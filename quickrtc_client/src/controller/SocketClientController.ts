import {
  ClientSocket,
  ConsumeParams,
  SocketResponse,
  JoinConferenceRequest,
  JoinConferenceResponse,
  CreateTransportParams,
  CreateTransportResponse,
  ConnectTransportParams,
  ProduceParams,
  ProduceResponse,
  ConsumerParams,
  ConsumeParticipantMediaRequest,
  UnpauseConsumerRequest,
  GetParticipantsRequest,
  ParticipantInfo,
  ProducerControlRequest,
  CloseConsumerRequest,
  LeaveConferenceRequest,
} from "quickrtc-types";
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
  public async joinConference(): Promise<RtpCapabilities | undefined> {
    console.log("in socket client controller");

    const requestData: JoinConferenceRequest = {
      data: this.joinParams,
    };

    const response = await this.socket.emitWithAck(
      "joinConference",
      requestData
    );
    console.log("join conference response received ", response);

    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      return undefined;
    }
    return response.data!.routerCapabilities;
  }

  public async createTransports(): Promise<
    | {
        sendTransport: CreateTransportResponse;
        recvTransport: CreateTransportResponse;
      }
    | undefined
  > {
    const createSendTransportData: CreateTransportParams = {
      conferenceId: this.joinParams.conferenceId,
      direction: "producer",
      participantId: this.joinParams.participantId,
      options: this.joinParams.webRtcTransportOptions,
    };

    const createSendTransportResponse = await this.socket.emitWithAck(
      "createTransport",
      createSendTransportData
    );

    if (createSendTransportResponse.status === "error") {
      this.dispatchEvent(
        new CustomEvent("error", { detail: createSendTransportResponse.error })
      );
      return;
    }

    const createRecvTransportData: CreateTransportParams = {
      conferenceId: this.joinParams.conferenceId,
      direction: "consumer",
      participantId: this.joinParams.participantId,
      options: this.joinParams.webRtcTransportOptions,
    };

    const createRecvTransportResponse = await this.socket.emitWithAck(
      "createTransport",
      createRecvTransportData
    );

    if (createRecvTransportResponse.status === "error") {
      this.dispatchEvent(
        new CustomEvent("error", { detail: createRecvTransportResponse.error })
      );
      return;
    }

    return {
      sendTransport: createSendTransportResponse.data!,
      recvTransport: createRecvTransportResponse.data!,
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
          const connectData: ConnectTransportParams = {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            direction: "producer",
            dtlsParameters,
          };

          const response = await this.socket.emitWithAck(
            "connectTransport",
            connectData
          );
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
        const produceData: ProduceParams = {
          conferenceId: this.joinParams.conferenceId,
          participantId: this.joinParams.participantId,
          transportId: sendTransport.id,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
          producerOptions: {
            kind: params.kind,
            rtpParameters: params.rtpParameters,
          },
        };

        const response = await this.socket.emitWithAck("produce", produceData);
        if (response.status === "ok") {
          callback({ id: response.data!.producerId });
          onProduce({
            kind: params.kind,
            rtpParameters: params.rtpParameters,
            appData: params.appData,
            producerId: response.data!.producerId,
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
    recvTransport: Transport<AppData>;
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
          const connectData: ConnectTransportParams = {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            direction: "consumer",
            dtlsParameters,
          };

          const response = await this.socket.emitWithAck(
            "connectTransport",
            connectData
          );
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

    // Note: The 'consume' event is no longer used.
    // Consuming is now done manually via consumeParticipantMedia()
  }

  async consumeMedia(
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<ConsumerParams | undefined> {
    const consumeData: ConsumeParams = {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      consumeOptions: { producerId, rtpCapabilities },
    };

    const response = await this.socket.emitWithAck("consume", consumeData);
    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      return undefined;
    }
    return response.data;
  }

  /**
   * SIMPLIFIED: Consume media by participant ID
   * Send participant ID + RTP capabilities → Get consumer parameters
   * Client can then create tracks directly with the consumer parameters
   */
  async consumeParticipantMedia(
    targetParticipantId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<ConsumerParams[] | undefined> {
    const requestData: ConsumeParticipantMediaRequest = {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      targetParticipantId,
      rtpCapabilities,
    };

    const response = await this.socket.emitWithAck(
      "consumeParticipantMedia",
      requestData
    );
    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      return undefined;
    }
    return response.data;
  }

  /**
   * Unpause consumer
   */
  async unpauseConsumer(consumerId: string): Promise<void> {
    const requestData: UnpauseConsumerRequest = {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      consumerId,
    };

    const response = await this.socket.emitWithAck(
      "unpauseConsumer",
      requestData
    );
    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      throw new Error(response.error);
    }
  }

  async closeProducer(producerId: string): Promise<void> {
    const requestData: ProducerControlRequest = {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      extraData: { producerId },
    };

    const response = await this.socket.emitWithAck(
      "closeProducer",
      requestData
    );
    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      throw new Error(response.error);
    }
  }

  async closeConsumer(consumerId: string): Promise<void> {
    const requestData: CloseConsumerRequest = {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
      extraData: { consumerId },
    };

    const response = await this.socket.emitWithAck(
      "closeConsumer",
      requestData
    );
    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      throw new Error(response.error);
    }
  }

  async leaveConference(): Promise<void> {
    const requestData: LeaveConferenceRequest = {
      conferenceId: this.joinParams.conferenceId,
      participantId: this.joinParams.participantId,
    };

    const response = await this.socket.emitWithAck(
      "leaveConference",
      requestData
    );
    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      throw new Error(response.error);
    }
  }

  async getParticipants(): Promise<ParticipantInfo[] | undefined> {
    const requestData: GetParticipantsRequest = {
      conferenceId: this.joinParams.conferenceId,
    };

    const response = await this.socket.emitWithAck(
      "getParticipants",
      requestData
    );
    if (response.status === "error") {
      this.dispatchEvent(new CustomEvent("error", { detail: response.error }));
      return undefined;
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
