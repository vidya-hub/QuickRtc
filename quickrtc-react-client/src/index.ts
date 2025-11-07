/**
 * QuickRTC React Client
 * Production-ready React client library with Redux state management
 */

// Redux store
export { conferenceReducer } from "./store/conferenceSlice";
export { eventMiddleware } from "./store/eventMiddleware";

// Selectors
export {
  selectIsJoined,
  selectIsConnecting,
  selectConfig,
  selectError,
  selectLocalStreams,
  selectLocalStreamById,
  selectLocalStreamsByType,
  selectHasLocalAudio,
  selectHasLocalVideo,
  selectHasLocalScreenShare,
  selectRemoteParticipants,
  selectRemoteParticipantById,
  selectRemoteParticipantCount,
  selectDevice,
  selectSendTransport,
  selectRecvTransport,
  selectIsMediaEnabled,
  selectCanProduce,
  selectCanConsume,
} from "./store/selectors";

// Thunks
export {
  joinConference,
  leaveConference,
  produceMedia,
  consumeExistingStreams,
  consumeParticipant,
  stopLocalStream,
  stopWatchingParticipant,
  toggleAudio,
  toggleVideo,
} from "./store/thunks";

// Hooks
export { useConference } from "./hooks/useConference";

// Types
export type {
  ConferenceConfig,
  ConferenceState,
  LocalStreamType,
  LocalStreamInfo,
  RemoteParticipant,
  ProduceMediaOptions,
  ProduceMediaResult,
  TransportOptions,
  TransportPair,
  ConsumeParams,
  ParticipantInfo,
  SocketEvents,
} from "./types";

// Services (for advanced usage)
export { deviceService } from "./api/deviceService";
export { socketService } from "./api/socketService";
export { streamService } from "./api/streamService";
