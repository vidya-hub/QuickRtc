import type { Middleware } from "@reduxjs/toolkit";
import { socketService } from "../api/socketService";
import {
  addRemoteParticipant,
  removeRemoteParticipant,
  updateRemoteParticipant,
  setJoined,
} from "./conferenceSlice";
import { consumeParticipant } from "./thunks";
import type { RootState } from "./selectors";

/**
 * Event middleware for handling socket events
 * Listens to socket events and dispatches appropriate actions
 */
export const eventMiddleware: Middleware<{}, RootState> =
  (storeAPI) => (next) => (action) => {
    const result = next(action);

    // Setup socket listeners when conference is joined
    if (setJoined.match(action) && action.payload === true) {
      setupSocketListeners(storeAPI.dispatch);
    }

    return result;
  };

/**
 * Setup socket event listeners
 */
function setupSocketListeners(dispatch: any): void {
  const socket = socketService.getSocket();
  if (!socket) {
    return;
  }

  // Participant joined
  socketService.on(
    "participant-joined",
    (data: { participantId: string; participantName: string }) => {
      console.log("🎉 Participant joined:", data.participantName);

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
      dispatch(
        consumeParticipant({
          participantId: data.participantId,
          participantName: data.participantName,
        })
      );
    }
  );

  // Participant left
  socketService.on("participant-left", (data: { participantId: string }) => {
    console.log("👋 Participant left:", data.participantId);
    dispatch(removeRemoteParticipant(data.participantId));
  });

  // New producer available
  socketService.on(
    "new-producer",
    (data: {
      producerId: string;
      participantId: string;
      participantName: string;
      kind: "audio" | "video";
    }) => {
      console.log("📡 New producer:", data.kind, "from", data.participantName);

      // Consume the new media
      dispatch(
        consumeParticipant({
          participantId: data.participantId,
          participantName: data.participantName,
        })
      );
    }
  );

  // Producer closed
  socketService.on(
    "producer-closed",
    (data: {
      producerId: string;
      participantId: string;
      kind: "audio" | "video";
    }) => {
      console.log("❌ Producer closed:", data.kind, "from", data.participantId);

      // Update participant to remove the stream
      const updates: any = {};
      if (data.kind === "audio") {
        updates.audioStream = undefined;
        updates.audioConsumer = undefined;
        updates.isAudioEnabled = false;
      } else if (data.kind === "video") {
        updates.videoStream = undefined;
        updates.videoConsumer = undefined;
        updates.isVideoEnabled = false;
      }

      dispatch(
        updateRemoteParticipant({
          participantId: data.participantId,
          updates,
        })
      );
    }
  );

  // Consumer closed
  socketService.on("consumer-closed", (data: { consumerId: string }) => {
    console.log("❌ Consumer closed:", data.consumerId);
  });

  // Socket error
  socketService.on("error", (error: any) => {
    console.error("Socket error:", error);
  });
}
