import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Socket } from "socket.io-client";
import {
  QuickRTC,
  type JoinConfig,
  type LocalStream,
  type ProduceInput,
  type StreamType,
} from "quickrtc-client";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for useQuickRTC hook
 */
export interface UseQuickRTCOptions {
  /** Socket.IO client instance (can be null initially) */
  socket: Socket | null;
  /** Maximum participants allowed (0 = unlimited) */
  maxParticipants?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Options for producing a custom MediaStream
 */
export interface ProduceStreamOptions {
  /** The MediaStream to produce (from canvas, video element, or any source) */
  stream: MediaStream;
  /** Stream type hint (default: inferred from track kind) */
  type?: StreamType;
  /** Only produce audio tracks */
  audioOnly?: boolean;
  /** Only produce video tracks */
  videoOnly?: boolean;
}

/**
 * Return type for useQuickRTC hook
 * 
 * - `rtc`: Event emitter for subscribing to events (null until socket is provided)
 * - Streams are auto-consumed - no need to call consume()
 */
export interface UseQuickRTCReturn {
  /** 
   * QuickRTC instance - use ONLY for event subscriptions.
   * Will be null until a valid socket is provided.
   * 
   * Events:
   * - rtc.on("newParticipant", ...) - Participant with streams ready
   * - rtc.on("participantLeft", ...)
   * - rtc.on("streamAdded", ...) - When new stream added (e.g. screenshare)
   * - rtc.on("streamRemoved", ...)
   * - rtc.on("localStreamEnded", ...) - When local track ends externally (e.g. browser "Stop sharing" button)
   * - rtc.on("error", ...)
   */
  rtc: QuickRTC | null;

  // Connection state
  isConnected: boolean;
  conferenceId: string | null;
  participantId: string | null;

  // Actions
  join: (config: Omit<JoinConfig, "socket">) => Promise<{ conferenceId: string; participantId: string }>;
  leave: () => Promise<void>;
  
  /** 
   * Produce tracks. Returns array of LocalStream with pause/resume/stop methods.
   * 
   * @example
   * ```tsx
   * // From getUserMedia
   * const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
   * const localStreams = await produce(stream.getTracks());
   * 
   * // Screen share with type hint
   * const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
   * const [screenStream] = await produce({ track: screen.getVideoTracks()[0], type: "screenshare" });
   * ```
   */
  produce: (input: ProduceInput) => Promise<LocalStream[]>;

  /**
   * Produce a custom MediaStream (from canvas, video element, or any source).
   * This is a convenience method that extracts tracks from the stream and produces them.
   * 
   * @example
   * ```tsx
   * // From canvas (for animations, games, etc.)
   * const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
   * const canvasStream = canvas.captureStream(30); // 30 FPS
   * const [videoStream] = await produceStream({ stream: canvasStream, type: 'video' });
   * 
   * // From video element (for pre-recorded video)
   * const video = document.getElementById('myVideo') as HTMLVideoElement;
   * const videoStream = (video as any).captureStream();
   * const streams = await produceStream({ stream: videoStream });
   * 
   * // From WebAudio (for custom audio processing)
   * const audioCtx = new AudioContext();
   * const dest = audioCtx.createMediaStreamDestination();
   * oscillator.connect(dest);
   * const [audioStream] = await produceStream({ stream: dest.stream, type: 'audio' });
   * 
   * // Video only from a stream that has both audio and video
   * const streams = await produceStream({ stream: myStream, videoOnly: true });
   * ```
   */
  produceStream: (options: ProduceStreamOptions) => Promise<LocalStream[]>;
  
  /** Pause a local stream by ID */
  pause: (streamId: string) => Promise<void>;
  
  /** Resume a local stream by ID */
  resume: (streamId: string) => Promise<void>;
  
  /** Stop a local stream by ID */
  stop: (streamId: string) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * React hook for QuickRTC - Event-driven pattern with auto-consume
 * 
 * The `rtc` instance is used ONLY for event subscriptions.
 * Remote streams are auto-consumed - no need to call consume().
 * 
 * @example
 * ```tsx
 * function VideoRoom() {
 *   const [socket, setSocket] = useState<Socket | null>(null);
 *   const { rtc, isConnected, join, produce } = useQuickRTC({ socket });
 *   
 *   // Local state managed by YOU
 *   const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
 *   const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
 *   
 *   // Subscribe to events (only when rtc is available)
 *   useEffect(() => {
 *     if (!rtc) return;
 *     
 *     // Single event for new participants WITH their streams ready
 *     const handleNewParticipant = ({ participantName, streams }) => {
 *       console.log(`${participantName} joined with ${streams.length} streams`);
 *       setRemoteStreams(prev => [...prev, ...streams]);
 *     };
 *     
 *     const handleStreamRemoved = ({ streamId }) => {
 *       setRemoteStreams(prev => prev.filter(s => s.id !== streamId));
 *     };
 *     
 *     rtc.on("newParticipant", handleNewParticipant);
 *     rtc.on("streamRemoved", handleStreamRemoved);
 *     
 *     return () => {
 *       rtc.off("newParticipant", handleNewParticipant);
 *       rtc.off("streamRemoved", handleStreamRemoved);
 *     };
 *   }, [rtc]);
 *   
 *   // Connect and join
 *   const handleJoin = async () => {
 *     const newSocket = io("http://localhost:3000");
 *     await new Promise(resolve => newSocket.on("connect", resolve));
 *     setSocket(newSocket);
 *     
 *     await join({ conferenceId: "room-1", participantName: "Alice" });
 *     
 *     // Produce from getUserMedia
 *     const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
 *     const streams = await produce(stream.getTracks());
 *     setLocalStreams(streams);
 *   };
 * }
 * ```
 */
export function useQuickRTC(options: UseQuickRTCOptions): UseQuickRTCReturn {
  const { socket, maxParticipants, debug } = options;

  // QuickRTC instance - created when socket is available
  const [rtc, setRtc] = useState<QuickRTC | null>(null);
  const rtcRef = useRef<QuickRTC | null>(null);

  // Minimal reactive state - only connection info
  const [isConnected, setIsConnected] = useState(false);
  const [conferenceId, setConferenceId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Create/destroy QuickRTC instance when socket changes
  useEffect(() => {
    if (!socket) {
      // No socket - clean up existing rtc
      if (rtcRef.current) {
        rtcRef.current = null;
        setRtc(null);
        setIsConnected(false);
        setConferenceId(null);
        setParticipantId(null);
      }
      return;
    }

    // Create new QuickRTC instance
    const newRtc = new QuickRTC({
      socket,
      maxParticipants,
      debug,
    });
    
    rtcRef.current = newRtc;
    setRtc(newRtc);

    // Setup connection state listeners
    const handleConnected = () => {
      setIsConnected(true);
      setConferenceId(newRtc.conferenceId);
      setParticipantId(newRtc.participantId);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConferenceId(null);
      setParticipantId(null);
    };

    newRtc.on("connected", handleConnected);
    newRtc.on("disconnected", handleDisconnected);

    // Cleanup on socket change or unmount
    return () => {
      newRtc.off("connected", handleConnected);
      newRtc.off("disconnected", handleDisconnected);
    };
  }, [socket, maxParticipants, debug]);

  // ============================================================================
  // ACTIONS - All return their results directly
  // ============================================================================

  const join = useCallback(async (config: Omit<JoinConfig, "socket">) => {
    if (!rtcRef.current) {
      throw new Error("QuickRTC not initialized. Provide a valid socket first.");
    }
    await rtcRef.current.join(config);
    const result = {
      conferenceId: rtcRef.current.conferenceId!,
      participantId: rtcRef.current.participantId!,
    };
    setIsConnected(true);
    setConferenceId(result.conferenceId);
    setParticipantId(result.participantId);
    return result;
  }, []);

  const leave = useCallback(async () => {
    if (!rtcRef.current) return;
    await rtcRef.current.leave();
  }, []);

  const produce = useCallback(async (input: ProduceInput): Promise<LocalStream[]> => {
    if (!rtcRef.current) {
      throw new Error("QuickRTC not initialized. Call join() first.");
    }
    return await rtcRef.current.produce(input);
  }, []);

  const produceStream = useCallback(async (options: ProduceStreamOptions): Promise<LocalStream[]> => {
    if (!rtcRef.current) {
      throw new Error("QuickRTC not initialized. Call join() first.");
    }

    const { stream, type, audioOnly, videoOnly } = options;
    
    // Get tracks based on options
    let tracks: MediaStreamTrack[] = [];
    
    if (audioOnly) {
      tracks = stream.getAudioTracks();
    } else if (videoOnly) {
      tracks = stream.getVideoTracks();
    } else {
      tracks = stream.getTracks();
    }

    if (tracks.length === 0) {
      throw new Error("No tracks found in the provided MediaStream");
    }

    // If type is specified, produce with type hint
    if (type) {
      const tracksWithType = tracks.map(track => ({ track, type }));
      return await rtcRef.current.produce(tracksWithType);
    }

    // Otherwise, produce tracks directly (type will be inferred)
    return await rtcRef.current.produce(tracks);
  }, []);

  const pause = useCallback(async (streamId: string): Promise<void> => {
    if (!rtcRef.current) return;
    await rtcRef.current.pause(streamId);
  }, []);

  const resume = useCallback(async (streamId: string): Promise<void> => {
    if (!rtcRef.current) return;
    await rtcRef.current.resume(streamId);
  }, []);

  const stop = useCallback(async (streamId: string): Promise<void> => {
    if (!rtcRef.current) return;
    await rtcRef.current.stop(streamId);
  }, []);

  // Return memoized object
  return useMemo(() => ({
    rtc,
    isConnected,
    conferenceId,
    participantId,
    join,
    leave,
    produce,
    produceStream,
    pause,
    resume,
    stop,
  }), [
    rtc,
    isConnected,
    conferenceId,
    participantId,
    join,
    leave,
    produce,
    produceStream,
    pause,
    resume,
    stop,
  ]);
}
