import { createSelector } from "@reduxjs/toolkit";
import type { ConferenceState } from "../types";

/**
 * Root state type (to be used by consumers)
 */
export interface RootState {
  conference: ConferenceState;
}

/**
 * Base selector for conference state
 */
const selectConferenceState = (state: RootState): ConferenceState =>
  state.conference;

/**
 * Select connection status
 */
export const selectIsJoined = createSelector(
  selectConferenceState,
  (conference) => conference.isJoined
);

export const selectIsConnecting = createSelector(
  selectConferenceState,
  (conference) => conference.isConnecting
);

/**
 * Select configuration
 */
export const selectConfig = createSelector(
  selectConferenceState,
  (conference) => conference.config
);

/**
 * Select error
 */
export const selectError = createSelector(
  selectConferenceState,
  (conference) => conference.error
);

/**
 * Select local streams
 */
export const selectLocalStreams = createSelector(
  selectConferenceState,
  (conference) => conference.localStreams
);

export const selectLocalStreamById = (streamId: string) =>
  createSelector(selectLocalStreams, (streams) =>
    streams.find((stream) => stream.id === streamId)
  );

export const selectLocalStreamsByType = (
  type: "audio" | "video" | "screenshare"
) =>
  createSelector(selectLocalStreams, (streams) =>
    streams.filter((stream) => stream.type === type)
  );

export const selectHasLocalAudio = createSelector(
  selectLocalStreams,
  (streams) =>
    streams.some((stream) => stream.type === "audio" && stream.enabled)
);

export const selectHasLocalVideo = createSelector(
  selectLocalStreams,
  (streams) =>
    streams.some((stream) => stream.type === "video" && stream.enabled)
);

export const selectHasLocalScreenShare = createSelector(
  selectLocalStreams,
  (streams) =>
    streams.some((stream) => stream.type === "screenshare" && stream.enabled)
);

/**
 * Select remote participants
 */
export const selectRemoteParticipants = createSelector(
  selectConferenceState,
  (conference) => conference.remoteParticipants
);

export const selectRemoteParticipantById = (participantId: string) =>
  createSelector(selectRemoteParticipants, (participants) =>
    participants.find((p) => p.participantId === participantId)
  );

export const selectRemoteParticipantCount = createSelector(
  selectRemoteParticipants,
  (participants) => participants.length
);

/**
 * Select device and transports
 */
export const selectDevice = createSelector(
  selectConferenceState,
  (conference) => conference.device
);

export const selectSendTransport = createSelector(
  selectConferenceState,
  (conference) => conference.sendTransport
);

export const selectRecvTransport = createSelector(
  selectConferenceState,
  (conference) => conference.recvTransport
);

/**
 * Composite selectors
 */
export const selectIsMediaEnabled = createSelector(
  selectLocalStreams,
  (streams) => streams.length > 0
);

export const selectCanProduce = createSelector(
  [selectIsJoined, selectSendTransport],
  (isJoined, sendTransport) => isJoined && sendTransport !== null
);

export const selectCanConsume = createSelector(
  [selectIsJoined, selectRecvTransport, selectDevice],
  (isJoined, recvTransport, device) =>
    isJoined && recvTransport !== null && device !== null
);
