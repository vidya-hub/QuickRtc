/**
 * QuickRTC React Client
 * Event-driven WebRTC integration for React applications
 *
 * Pattern: 
 * - `rtc` is used ONLY for event subscriptions
 * - Streams are auto-consumed - listen for `newParticipant` event
 * - You manage your own stream state
 *
 * Quick Start:
 * ```tsx
 * import { useQuickRTC, QuickRTCVideo } from 'quickrtc-react-client';
 * import type { LocalStream, RemoteStream, NewParticipantEvent } from 'quickrtc-react-client';
 *
 * function VideoRoom() {
 *   const socket = useMemo(() => io('http://localhost:3000'), []);
 *   const { rtc, join, produce } = useQuickRTC({ socket });
 *   
 *   // YOU manage state
 *   const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
 *   const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
 *
 *   // Subscribe to events - streams are auto-consumed!
 *   useEffect(() => {
 *     if (!rtc) return;
 *     
 *     rtc.on("newParticipant", ({ participantName, streams }) => {
 *       console.log(`${participantName} joined with ${streams.length} streams`);
 *       setRemoteStreams(prev => [...prev, ...streams]);
 *     });
 *     
 *     rtc.on("streamRemoved", ({ streamId }) => {
 *       setRemoteStreams(prev => prev.filter(s => s.id !== streamId));
 *     });
 *   }, [rtc]);
 *
 *   const handleJoin = async () => {
 *     await join({ conferenceId: 'room-1', participantName: 'Alice' });
 *     
 *     // Produce from getUserMedia
 *     const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
 *     const streams = await produce(stream.getTracks());
 *     setLocalStreams(streams);
 *   };
 *
 *   return (
 *     <>
 *       {localStreams.map(s => (
 *         <QuickRTCVideo key={s.id} stream={s.stream} muted mirror />
 *       ))}
 *       {remoteStreams.map(s => (
 *         <QuickRTCVideo key={s.id} stream={s.stream} />
 *       ))}
 *     </>
 *   );
 * }
 * ```
 */

// ============================================================================
// HOOK - Main API
// ============================================================================

export { useQuickRTC } from "./useQuickRTC";
export type { UseQuickRTCOptions, UseQuickRTCReturn } from "./useQuickRTC";

// ============================================================================
// VIDEO COMPONENT - Optimized for WebRTC streams
// ============================================================================

export { QuickRTCVideo, QuickRTCVideoOptimized } from "./components";
export type { QuickRTCVideoProps, StreamSource, VideoLoadingState } from "./components";

// ============================================================================
// RE-EXPORT TYPES FROM quickrtc-client for convenience
// ============================================================================

export type {
  QuickRTCConfig,
  JoinConfig,
  LocalStream,
  RemoteStream,
  Participant,
  StreamType,
  ProduceInput,
  TrackWithType,
  QuickRTCEvents,
  NewParticipantEvent,
} from "quickrtc-client";

// Re-export the core class for advanced usage
export { QuickRTC } from "quickrtc-client";
