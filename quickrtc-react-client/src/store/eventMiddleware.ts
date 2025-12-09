import type { Middleware } from "@reduxjs/toolkit";
import { socketService } from "../api/socketService";
import {
  addRemoteParticipant,
  removeRemoteParticipant,
  updateRemoteParticipant,
  setJoined,
  setError,
} from "./conferenceSlice";
import { consumeParticipant } from "./thunks";
import type { RootState } from "./selectors";
import type {
  ParticipantJoinedData,
  ParticipantLeftData,
  NewProducerData,
  ProducerClosedData,
  ConsumerClosedData,
  MediaMutedData,
} from "quickrtc-types";

/**
 * Event middleware for handling socket events
 * Listens to socket events and dispatches appropriate actions
 */
export const eventMiddleware: Middleware<{}, RootState> =
  (storeAPI) => (next) => (action) => {
    const result = next(action);

    // Setup socket listeners when conference is joined
    if (setJoined.match(action) && action.payload === true) {
      setupSocketListeners(storeAPI.dispatch, storeAPI.getState);
    }

    return result;
  };

/**
 * Enhanced logger for event middleware
 */
const logger = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = "[EventMiddleware]";
    if (data) {
      console.info(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.info(`${timestamp} ${prefix} ${message}`);
    }
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = "[EventMiddleware]";
    if (data) {
      console.warn(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.warn(`${timestamp} ${prefix} ${message}`);
    }
  },
  error: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = "[EventMiddleware]";
    if (data) {
      console.error(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.error(`${timestamp} ${prefix} ${message}`);
    }
  },
};

/**
 * Setup socket event listeners with comprehensive logging
 */
function setupSocketListeners(dispatch: any, getState: () => RootState): void {
  const socket = socketService.getSocket();
  if (!socket) {
    logger.error("❌ Cannot setup socket listeners - socket not available");
    return;
  }

  logger.info("🔧 Setting up event middleware socket listeners");

  // Participant joined event
  socketService.on("participantJoined", (data: ParticipantJoinedData) => {
    try {
      logger.info(`🎉 Participant joined: ${data.participantName}`, {
        participantId: data.participantId,
        conferenceId: data.conferenceId,
      });

      // Add to participants list
      dispatch(
        addRemoteParticipant({
          participantId: data.participantId,
          participantName: data.participantName,
          isAudioEnabled: false,
          isVideoEnabled: false,
        })
      );

      // Auto-consume their media
      logger.info(`🔄 Auto-consuming media for: ${data.participantName}`);
      dispatch(
        consumeParticipant({
          participantId: data.participantId,
          participantName: data.participantName,
        })
      );
    } catch (error: any) {
      logger.error(
        `❌ Error handling participantJoined event: ${error.message}`,
        { error, data }
      );
    }
  });

  // Participant left event
  socketService.on("participantLeft", (data: ParticipantLeftData) => {
    try {
      logger.info(`👋 Participant left: ${data.participantId}`, {
        closedProducers: data.closedProducerIds.length,
        closedConsumers: data.closedConsumerIds.length,
      });

      dispatch(removeRemoteParticipant(data.participantId));

      logger.info(`✅ Cleaned up participant ${data.participantId} from state`);
    } catch (error: any) {
      logger.error(
        `❌ Error handling participantLeft event: ${error.message}`,
        { error, data }
      );
    }
  });

  // New producer available event
  socketService.on("newProducer", (data: NewProducerData) => {
    try {
      logger.info(`📡 New ${data.kind} producer from ${data.participantName}`, {
        producerId: data.producerId,
        participantId: data.participantId,
      });

      // Check if participant exists in state
      const state = getState();
      const participantExists = state.conference.remoteParticipants.some(
        (p) => p.participantId === data.participantId
      );

      if (!participantExists) {
        logger.warn(
          `⚠️ Participant ${data.participantId} not found in state, adding now`
        );
        dispatch(
          addRemoteParticipant({
            participantId: data.participantId,
            participantName: data.participantName,
            isAudioEnabled: false,
            isVideoEnabled: false,
          })
        );
      }

      // Consume the new media
      logger.info(`🔄 Consuming new ${data.kind} producer`);
      dispatch(
        consumeParticipant({
          participantId: data.participantId,
          participantName: data.participantName,
        })
      );
    } catch (error: any) {
      logger.error(`❌ Error handling newProducer event: ${error.message}`, {
        error,
        data,
      });
    }
  });

  // Producer closed event
  socketService.on("producerClosed", (data: ProducerClosedData) => {
    try {
      logger.info(
        `❌ Producer closed: ${data.kind} from ${data.participantId}`,
        { producerId: data.producerId }
      );

      // Update participant to remove the stream
      const updates: any = {};
      if (data.kind === "audio") {
        updates.audioStream = undefined;
        updates.audioConsumer = undefined;
        updates.isAudioEnabled = false;
        logger.info(`🔇 Removed audio stream for ${data.participantId}`);
      } else if (data.kind === "video") {
        updates.videoStream = undefined;
        updates.videoConsumer = undefined;
        updates.isVideoEnabled = false;
        logger.info(`📵 Removed video stream for ${data.participantId}`);
      }

      dispatch(
        updateRemoteParticipant({
          participantId: data.participantId,
          updates,
        })
      );
    } catch (error: any) {
      logger.error(`❌ Error handling producerClosed event: ${error.message}`, {
        error,
        data,
      });
    }
  });

  // Consumer closed event
  socketService.on("consumerClosed", (data: ConsumerClosedData) => {
    try {
      logger.info(`❌ Consumer closed: ${data.consumerId}`, {
        participantId: data.participantId,
      });
      // Additional cleanup logic can be added here if needed
    } catch (error: any) {
      logger.error(`❌ Error handling consumerClosed event: ${error.message}`, {
        error,
        data,
      });
    }
  });

  // Audio muted event
  socketService.on("audioMuted", (data: MediaMutedData) => {
    try {
      logger.info(`🔇 Audio muted by participant: ${data.participantId}`, {
        mutedProducers: data.mutedProducerIds,
      });

      dispatch(
        updateRemoteParticipant({
          participantId: data.participantId,
          updates: { isAudioEnabled: false },
        })
      );
    } catch (error: any) {
      logger.error(`❌ Error handling audioMuted event: ${error.message}`, {
        error,
        data,
      });
    }
  });

  // Audio unmuted event
  socketService.on("audioUnmuted", (data: MediaMutedData) => {
    try {
      logger.info(`🔊 Audio unmuted by participant: ${data.participantId}`);

      dispatch(
        updateRemoteParticipant({
          participantId: data.participantId,
          updates: { isAudioEnabled: true },
        })
      );
    } catch (error: any) {
      logger.error(`❌ Error handling audioUnmuted event: ${error.message}`, {
        error,
        data,
      });
    }
  });

  // Video muted event
  socketService.on("videoMuted", (data: MediaMutedData) => {
    try {
      logger.info(`📵 Video muted by participant: ${data.participantId}`, {
        mutedProducers: data.mutedProducerIds,
      });

      dispatch(
        updateRemoteParticipant({
          participantId: data.participantId,
          updates: { isVideoEnabled: false },
        })
      );
    } catch (error: any) {
      logger.error(`❌ Error handling videoMuted event: ${error.message}`, {
        error,
        data,
      });
    }
  });

  // Video unmuted event
  socketService.on("videoUnmuted", (data: MediaMutedData) => {
    try {
      logger.info(`📹 Video unmuted by participant: ${data.participantId}`);

      dispatch(
        updateRemoteParticipant({
          participantId: data.participantId,
          updates: { isVideoEnabled: true },
        })
      );
    } catch (error: any) {
      logger.error(`❌ Error handling videoUnmuted event: ${error.message}`, {
        error,
        data,
      });
    }
  });

  // Disconnect event
  socketService.on("disconnect", (reason: string) => {
    logger.warn(`🔌 Socket disconnected: ${reason}`);
    dispatch(setError(`Disconnected from server: ${reason}`));
  });

  logger.info("✅ Event middleware socket listeners setup complete");
}
