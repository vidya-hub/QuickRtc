import { EnhancedEventEmitter } from "mediasoup/extras";
import { Server, Socket } from "socket.io";
import MediasoupController from "./MediasoupController";
import {
  ConnectTransportParams,
  ConsumeParams,
  CreateTransportParams,
  ProduceParams,
  SocketResponse,
  JoinConferenceRequest,
  JoinConferenceResponse,
  LeaveConferenceRequest,
  GetParticipantsRequest,
  ParticipantInfo,
  ProducerControlRequest,
  CloseConsumerRequest,
  ConsumeParticipantMediaRequest,
  UnpauseConsumerRequest,
  ConsumerParams as ConsumerParamsResponse,
  CreateTransportResponse,
  ProduceResponse,
  ParticipantJoinedData,
  ParticipantLeftData,
  NewProducerData,
  ProducerClosedData,
  ConsumerClosedData,
  MediaMutedData,
} from "quickrtc-types";

class SocketEventController extends EnhancedEventEmitter {
  private mediasoupController?: MediasoupController;
  private mediasoupSocket: Server;

  constructor(
    mediasoupController: MediasoupController,
    mediasoupSocket: Server
  ) {
    super();
    this.mediasoupController = mediasoupController;
    this.mediasoupSocket = mediasoupSocket;
    this.setupSocketEvents();
  }

  private setupSocketEvents() {
    this.mediasoupSocket.on("connection", (socket: Socket) => {
      this.emit("newConnection", socket);
      this.onNewConnection(socket);

      socket.on("disconnect", () => {
        this.emit("clientDisconnected", socket);
        this.onUserDisconnected(socket);
      });

      socket.on(
        "joinConference",
        async (
          socketEventData: JoinConferenceRequest,
          callback: (response: SocketResponse<JoinConferenceResponse>) => void
        ) => {
          await this.handleJoinConference(
            socketEventData.data,
            socket,
            callback
          );
        }
      );

      socket.on(
        "createTransport",
        async (
          socketEventData: CreateTransportParams,
          callback: (response: SocketResponse<CreateTransportResponse>) => void
        ) => {
          await this.createTransport(socketEventData, callback);
        }
      );

      socket.on(
        "connectTransport",
        async (
          socketEventData: ConnectTransportParams,
          callback: (response: SocketResponse) => void
        ) => {
          await this.connectTransport(socketEventData, callback);
        }
      );

      socket.on(
        "produce",
        async (
          socketEventData: ProduceParams,
          callback: (response: SocketResponse<ProduceResponse>) => void
        ) => {
          await this.produce(socketEventData, socket, callback);
        }
      );

      socket.on(
        "consume",
        async (
          socketEventData: ConsumeParams,
          callback: (response: SocketResponse<ConsumerParamsResponse>) => void
        ) => {
          await this.consume(socketEventData, callback);
        }
      );

      socket.on(
        "closeProducer",
        async (
          socketEventData: ProducerControlRequest,
          callback: (response: SocketResponse) => void
        ) => {
          await this.closeProducer(socketEventData, callback);
        }
      );

      socket.on(
        "closeConsumer",
        async (
          socketEventData: CloseConsumerRequest,
          callback: (response: SocketResponse) => void
        ) => {
          await this.closeConsumer(socketEventData, callback);
        }
      );

      socket.on(
        "consumeParticipantMedia",
        async (
          socketEventData: ConsumeParticipantMediaRequest,
          callback: (response: SocketResponse<ConsumerParamsResponse[]>) => void
        ) => {
          await this.consumeParticipantMedia(socketEventData, callback);
        }
      );

      socket.on(
        "unpauseConsumer",
        async (
          socketEventData: UnpauseConsumerRequest,
          callback: (response: SocketResponse) => void
        ) => {
          await this.unpauseConsumer(socketEventData, callback);
        }
      );

      socket.on(
        "getParticipants",
        async (
          socketEventData: GetParticipantsRequest,
          callback: (response: SocketResponse<ParticipantInfo[]>) => void
        ) => {
          await this.getParticipants(socketEventData, callback);
        }
      );

      socket.on(
        "leaveConference",
        async (
          socketEventData: LeaveConferenceRequest,
          callback: (response: SocketResponse) => void
        ) => {
          await this.handleLeaveConference(socket, socketEventData, callback);
        }
      );

      socket.onAny((eventName, ...args) => {
        console.log(
          `[Socket Event] ${eventName}`,
          JSON.stringify(args, null, 2)
        );
      });
    });
  }
  private async getParticipants(
    socketEventData: GetParticipantsRequest,
    callback: (response: SocketResponse<ParticipantInfo[]>) => void
  ) {
    const { conferenceId } = socketEventData;

    try {
      const participants =
        this.mediasoupController?.getParticipants(conferenceId);

      callback({ status: "ok", data: participants });
    } catch (error) {
      console.error("Error getting participants:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  /**
   * Simplified method to consume media by participant ID
   * Client sends participant ID and gets consumer parameters for all their producers
   */
  private async consumeParticipantMedia(
    socketEventData: ConsumeParticipantMediaRequest,
    callback: (response: SocketResponse<ConsumerParamsResponse[]>) => void
  ) {
    const {
      conferenceId,
      participantId,
      targetParticipantId,
      rtpCapabilities,
    } = socketEventData;

    try {
      if (
        !conferenceId ||
        !participantId ||
        !targetParticipantId ||
        !rtpCapabilities
      ) {
        callback({
          status: "error",
          error:
            "Missing required parameters: conferenceId, participantId, targetParticipantId, rtpCapabilities",
        });
        return;
      }

      // Get producer IDs for the target participant
      const producerData = this.mediasoupController?.getExistingProducerIds(
        participantId, // requesting participant (to exclude from results)
        conferenceId
      );

      if (!producerData || producerData.length === 0) {
        callback({ status: "ok", data: [] });
        return;
      }

      // Find the target participant's producers
      const targetParticipantData = producerData.find(
        (item) => item.participantId === targetParticipantId
      );

      if (
        !targetParticipantData ||
        targetParticipantData.producerIds.length === 0
      ) {
        callback({ status: "ok", data: [] });
        return;
      }

      // Get conference for producer info
      const conference = this.mediasoupController?.getConference(conferenceId);

      // Create consumers for each producer
      const consumerParams: Array<ConsumerParamsResponse & { targetParticipantId: string }> = [];

      for (const producerId of targetParticipantData.producerIds) {
        try {
          const consumerResponse = await this.mediasoupController?.consume({
            conferenceId,
            participantId,
            consumeOptions: {
              producerId,
              rtpCapabilities,
            },
          });

          if (consumerResponse) {
            // Get producer info to include streamType
            const producerInfo = conference?.getProducerInfo(producerId);
            const streamType = producerInfo?.streamType as "audio" | "video" | "screenshare" | undefined;
            
            console.log(`[CONSUME] producerId: ${producerId}, kind: ${consumerResponse.kind}, producerInfo.streamType: ${producerInfo?.streamType}, final streamType: ${streamType || consumerResponse.kind}`);
            
            consumerParams.push({
              ...consumerResponse,
              targetParticipantId,
              streamType: streamType || (consumerResponse.kind as "audio" | "video"),
            });
          }
        } catch (error) {
          console.error(
            `Error creating consumer for producer ${producerId}:`,
            error
          );
          // Continue with other producers
        }
      }

      callback({ status: "ok", data: consumerParams as any });
    } catch (error) {
      console.error("Error consuming participant media:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  /**
   * Unpause consumer - simplified version
   */
  private async unpauseConsumer(
    socketEventData: UnpauseConsumerRequest,
    callback: (response: SocketResponse) => void
  ) {
    const { conferenceId, participantId, consumerId } = socketEventData;

    try {
      if (!consumerId) {
        callback({ status: "error", error: "Missing consumerId" });
        return;
      }

      await this.mediasoupController?.resumeConsumer({
        conferenceId,
        participantId,
        consumerId,
      });

      callback({ status: "ok" });
    } catch (error) {
      console.error("Error unpausing consumer:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async closeProducer(
    socketEventData: ProducerControlRequest,
    callback: (response: SocketResponse) => void
  ) {
    const { extraData, conferenceId, participantId } = socketEventData;
    const { producerId } = extraData || {};

    if (!producerId) {
      callback({ status: "error", error: "Missing producerId" });
      return;
    }

    try {
      const kind = await this.mediasoupController?.closeProducer({
        conferenceId,
        participantId,
        producerId,
      });
      callback({ status: "ok" });

      const producerClosedData: ProducerClosedData = {
        participantId,
        producerId,
        kind: kind || "video", // Default to video if kind is null
      };
      this.mediasoupSocket
        .to(conferenceId)
        .emit("producerClosed", producerClosedData);
      this.emit("producerClosed", producerClosedData);
    } catch (error) {
      console.error("Error closing producer:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async closeConsumer(
    socketEventData: CloseConsumerRequest,
    callback: (response: SocketResponse) => void
  ) {
    const { extraData, conferenceId, participantId } = socketEventData;
    const { consumerId } = extraData || {};

    if (!consumerId) {
      callback({ status: "error", error: "Missing consumerId" });
      return;
    }

    try {
      await this.mediasoupController?.closeConsumer({
        conferenceId,
        participantId,
        consumerId,
      });
      callback({ status: "ok" });

      const consumerClosedData: ConsumerClosedData = {
        participantId,
        consumerId,
      };
      this.mediasoupSocket
        .to(conferenceId)
        .emit("consumerClosed", consumerClosedData);
      this.emit("consumerClosed", consumerClosedData);
    } catch (error) {
      console.error("Error closing consumer:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async handleJoinConference(
    socketEventData: JoinConferenceRequest["data"],
    socket: Socket,
    callback: (response: SocketResponse<JoinConferenceResponse>) => void
  ) {
    console.log("received data socket ", socketEventData);

    try {
      const { conferenceId, participantId, conferenceName, participantName, participantInfo } =
        socketEventData;
      const conference = await this.mediasoupController?.joinConference({
        conferenceId: conferenceId,
        participantId: participantId,
        conferenceName: conferenceName || conferenceId,
        participantName: participantName,
        socketId: socket.id,
        participantInfo: participantInfo,
      });
      console.log("mediasoup con response ", conference);

      socket.join(conferenceId);

      const participantJoinedData: ParticipantJoinedData = {
        participantId,
        participantName,
        conferenceId,
        participantInfo,
      };
      socket.to(conferenceId).emit("participantJoined", participantJoinedData);

      this.emit("conferenceJoined", {
        ...socketEventData,
        socketId: socket.id,
      });

      if (conference) {
        callback({
          status: "ok",
          data: { routerCapabilities: conference.getRouterRtpsCapabilities() },
        });
      } else {
        callback({ status: "error", error: "Failed to join conference" });
      }
    } catch (error) {
      console.error("Error joining conference:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async createTransport(
    socketEventData: CreateTransportParams,
    callback: (response: SocketResponse<CreateTransportResponse>) => void
  ) {
    console.log("create transport data ", socketEventData);

    const { direction, conferenceId, participantId } = socketEventData;
    try {
      const transport = await this.mediasoupController?.createTransport({
        conferenceId,
        participantId,
        direction,
        options:
          this.mediasoupController.workerService.mediasoupConfig
            .transportConfig,
      });
      
      // Log ICE candidates being sent to client
      console.log(`[ICE] Transport created for ${participantId} (${direction})`);
      console.log(`[ICE] ID: ${transport?.id}`);
      console.log(`[ICE] ICE Parameters:`, JSON.stringify(transport?.iceParameters, null, 2));
      console.log(`[ICE] ICE Candidates:`, JSON.stringify(transport?.iceCandidates, null, 2));
      console.log(`[ICE] DTLS Parameters:`, JSON.stringify(transport?.dtlsParameters, null, 2));
      
      this.emit("transportCreated", transport);
      callback({
        status: "ok",
        data: {
          id: transport?.id!,
          iceParameters: transport?.iceParameters!,
          iceCandidates: transport?.iceCandidates!,
          dtlsParameters: transport?.dtlsParameters!,
          sctpParameters: transport?.sctpParameters,
        },
      });
    } catch (error) {
      console.error("Error creating transport:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async connectTransport(
    socketEventData: ConnectTransportParams,
    callback: (response: SocketResponse) => void
  ) {
    console.log("connect data ", socketEventData);

    const { conferenceId, participantId } = socketEventData;
    const { direction, dtlsParameters } = socketEventData;
    if (!direction || !dtlsParameters) {
      callback({ status: "error", error: "Missing required parameters" });
      return;
    }
    
    console.log(`[DTLS] Connect transport for ${participantId} (${direction})`);
    console.log(`[DTLS] DTLS Parameters from client:`, JSON.stringify(dtlsParameters, null, 2));
    
    try {
      await this.mediasoupController?.connectTransport({
        conferenceId,
        participantId,
        dtlsParameters: dtlsParameters,
        direction: direction,
      });
      
      console.log(`[DTLS] Transport connected successfully for ${participantId} (${direction})`);
      
      this.emit("transportConnected", {
        conferenceId,
        participantId,
        direction,
      });
      callback({ status: "ok" });
    } catch (error) {
      console.error(`[DTLS] Error connecting transport for ${participantId} (${direction}):`, error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async produce(
    socketEventData: ProduceParams,
    socket: Socket,
    callback: (response: SocketResponse<ProduceResponse>) => void
  ) {
    const { conferenceId, participantId, streamType } = socketEventData;
    const { transportId, kind, rtpParameters } = socketEventData;
    const producerOptions = { 
      kind, 
      rtpParameters, 
      appData: { participantId, streamType: streamType || kind } 
    };
    
    console.log(`[PRODUCE] Received produce request - kind: ${kind}, streamType: ${streamType}, appData.streamType: ${producerOptions.appData.streamType}`);
    
    try {
      if (!transportId || !kind || !rtpParameters) {
        callback({
          status: "error",
          error: "Missing required parameters for producing",
        });
        return;
      }

      // Validate producer limits
      const limits = this.mediasoupController?.workerService.mediasoupConfig.participantLimits;
      if (limits) {
        const participants = this.mediasoupController?.getParticipants(conferenceId);
        const participant = participants?.find(p => p.participantId === participantId);
        
        if (participant) {
          // Get existing producer info through the conference
          const conference = this.mediasoupController?.getConference(conferenceId);
          if (conference) {
            const existingProducers = conference.getParticipantProducers(participantId);
            const videoProducerCount = existingProducers.filter(p => p.kind === 'video').length;
            const audioProducerCount = existingProducers.filter(p => p.kind === 'audio').length;

            if (kind === 'video' && videoProducerCount >= limits.maxVideoProducers) {
              callback({
                status: "error",
                error: `Maximum video producers (${limits.maxVideoProducers}) reached. Close an existing video producer first.`,
              });
              return;
            }

            if (kind === 'audio' && audioProducerCount >= limits.maxAudioProducers) {
              callback({
                status: "error",
                error: `Maximum audio producers (${limits.maxAudioProducers}) reached. Close an existing audio producer first.`,
              });
              return;
            }
          }
        }
      }

      const producerId = await this.mediasoupController?.produce({
        conferenceId,
        participantId,
        transportId,
        producerOptions,
        kind,
        rtpParameters,
      });

      // Get participant name for the event
      const participants =
        this.mediasoupController?.getParticipants(conferenceId);
      const participant = participants?.find(
        (p) => p.participantId === participantId
      );
      const participantName =
        participant?.participantName || "Unknown Participant";

      // Determine the actual stream type
      const actualStreamType = streamType || (kind === 'audio' ? 'audio' : 'video');

      const newProducerData: NewProducerData = {
        producerId: producerId!,
        participantId,
        participantName,
        kind,
        streamType: actualStreamType,
      };
      socket.to(conferenceId).emit("newProducer", newProducerData);

      callback({ status: "ok", data: { producerId: producerId! } });
      this.emit("producerCreated", { producerId, participantId, streamType: actualStreamType });
    } catch (error) {
      console.error("Error producing:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async consume(
    socketEventData: ConsumeParams,
    callback: (response: SocketResponse<ConsumerParamsResponse>) => void
  ) {
    console.log("consume params came ", socketEventData);

    const { conferenceId, participantId, consumeOptions } = socketEventData;
    const { producerId, rtpCapabilities } = consumeOptions;
    const consumerParams = {
      conferenceId,
      participantId,
      consumeOptions,
    };
    try {
      if (!producerId || !rtpCapabilities) {
        callback({
          status: "error",
          error: "Missing required parameters for consuming",
        });
        return;
      }
      // Implement consume logic here
      const consumerResponse = await this.mediasoupController?.consume(
        consumerParams
      );
      console.log("consumer response ", consumerResponse);

      callback({ status: "ok", data: consumerResponse! });
      this.emit("consumerCreated", { ...consumerResponse, participantId });
    } catch (error) {
      console.error("Error consuming:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }

  private async onUserDisconnected(socket: Socket) {
    console.log("Client disconnected:", socket.id);
    try {
      const cleanup = await this.mediasoupController?.userRemoveWithSocketId(
        socket.id
      );
      if (cleanup?.conferenceId && cleanup?.participantId) {
        const conferenceId = cleanup.conferenceId;

        // Notify other participants about the disconnection
        const participantLeftData: ParticipantLeftData = {
          participantId: cleanup.participantId,
          closedProducerIds: cleanup.closedProducerIds,
          closedConsumerIds: cleanup.closedConsumerIds,
        };
        socket.to(conferenceId).emit("participantLeft", participantLeftData);

        // Emit cleanup events for each closed producer and consumer
        cleanup.closedProducerIds.forEach((producerId) => {
          const producerClosedData: ProducerClosedData = {
            participantId: cleanup.participantId!,
            producerId,
            kind: "video", // Default for cleanup
          };
          socket.to(conferenceId).emit("producerClosed", producerClosedData);
        });

        cleanup.closedConsumerIds.forEach((consumerId) => {
          const consumerClosedData: ConsumerClosedData = {
            participantId: cleanup.participantId!,
            consumerId,
          };
          socket.to(conferenceId).emit("consumerClosed", consumerClosedData);
        });
      }

      this.emit("userQuit", {
        socketId: socket.id,
        ...cleanup,
      });
    } catch (error) {
      console.error("Error handling user disconnect:", error);
      this.emit("userQuit", socket.id);
    }
  }
  private onNewConnection(socket: Socket) {
    console.log("New client connected with socket id:", socket.id);
    this.emit("connected", socket);
  }

  private async handleLeaveConference(
    socket: Socket,
    socketEventData: LeaveConferenceRequest,
    callback: (response: SocketResponse) => void
  ) {
    const { participantId, conferenceId } = socketEventData;

    try {
      const cleanup = await this.mediasoupController?.removeFromConference(
        conferenceId,
        participantId
      );

      if (cleanup) {
        // Notify other participants about the participant leaving
        const participantLeftData: ParticipantLeftData = {
          participantId,
          closedProducerIds: cleanup.closedProducerIds,
          closedConsumerIds: cleanup.closedConsumerIds,
        };
        socket.to(conferenceId).emit("participantLeft", participantLeftData);

        // Emit cleanup events for each closed producer and consumer
        cleanup.closedProducerIds.forEach((producerId) => {
          const producerClosedData: ProducerClosedData = {
            participantId,
            producerId,
            kind: "video", // Default for cleanup
          };
          socket.to(conferenceId).emit("producerClosed", producerClosedData);
        });

        cleanup.closedConsumerIds.forEach((consumerId) => {
          const consumerClosedData: ConsumerClosedData = {
            participantId,
            consumerId,
          };
          socket.to(conferenceId).emit("consumerClosed", consumerClosedData);
        });
      }

      socket.leave(conferenceId);

      callback({ status: "ok" });

      this.emit("participantLeft", {
        participantId,
        conferenceId,
        ...cleanup,
      });
    } catch (error) {
      console.error("Error handling leave conference:", error);
      callback({ status: "error", error: (error as Error).message });
    }
  }
}

export default SocketEventController;
