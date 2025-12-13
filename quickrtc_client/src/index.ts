/**
 * QuickRTC Client
 * 
 * Simple, event-driven WebRTC conferencing library built on mediasoup.
 * 
 * @example
 * ```typescript
 * import { QuickRTC } from "quickrtc-client";
 * import { io } from "socket.io-client";
 * 
 * const socket = io("wss://your-server.com");
 * const rtc = new QuickRTC({ socket });
 * 
 * // Listen for participants with streams ready
 * rtc.on("newParticipant", ({ participantName, streams }) => {
 *   console.log(`${participantName} joined with ${streams.length} streams`);
 *   for (const stream of streams) {
 *     const video = document.createElement("video");
 *     video.srcObject = stream.stream;
 *     video.autoplay = true;
 *     document.body.appendChild(video);
 *   }
 * });
 * 
 * rtc.on("streamRemoved", ({ streamId }) => {
 *   // Remove from UI
 * });
 * 
 * // Join
 * await rtc.join({
 *   conferenceId: "room-123",
 *   participantName: "Alice"
 * });
 * 
 * // Produce
 * const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
 * const localStreams = await rtc.produce(stream.getTracks());
 * 
 * // Control
 * await localStreams[0].pause();
 * await localStreams[0].resume();
 * await localStreams[0].stop();
 * 
 * // Leave
 * await rtc.leave();
 * ```
 */

// Main export
export { QuickRTC } from "./QuickRTC";

// Types
export type {
  // Configuration
  QuickRTCConfig,
  JoinConfig,
  
  // Streams
  StreamType,
  LocalStream,
  RemoteStream,
  ProduceInput,
  TrackWithType,
  
  // Participants
  Participant,
  
  // Events
  QuickRTCEvents,
  NewParticipantEvent,
  EventHandler,
} from "./types";

// Services (for advanced usage)
export { SocketService, MediaService, ConsumerService } from "./services";
