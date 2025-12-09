/**
 * QuickRTC React Client
 * Simplified WebRTC integration for React applications
 *
 * Quick Start:
 * ```tsx
 * import { QuickRTCProvider, useQuickRTC } from 'quickrtc-react-client';
 * import { io } from 'socket.io-client';
 *
 * function App() {
 *   return (
 *     <QuickRTCProvider>
 *       <VideoRoom />
 *     </QuickRTCProvider>
 *   );
 * }
 *
 * function VideoRoom() {
 *   const { join, enableAudio, enableVideo, localStreams, remoteParticipants } = useQuickRTC();
 *   // Your implementation here
 * }
 * ```
 */

// ============================================================================
// SIMPLE API - Recommended for most use cases
// ============================================================================

// Provider and Hook - All you need!
export { QuickRTCProvider } from "./QuickRTCProvider";
export { useQuickRTC } from "./hooks/useQuickRTC";
export type { UseQuickRTCOptions } from "./hooks/useQuickRTC";

// ============================================================================
// ADVANCED API - For custom integrations
// ============================================================================

// Redux store (if you want to integrate with existing Redux store)
export { conferenceReducer } from "./store/conferenceSlice";
export { eventMiddleware } from "./store/eventMiddleware";

// Advanced hook (for direct Redux integration)
export { useConference } from "./hooks/useConference";

// Selectors (for custom Redux selectors)
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

// Thunks (for custom Redux actions)
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

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// LOW-LEVEL SERVICES - For advanced/custom usage
// ============================================================================

export { deviceService } from "./api/deviceService";
export { socketService } from "./api/socketService";
export { streamService } from "./api/streamService";
