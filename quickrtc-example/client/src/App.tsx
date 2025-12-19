import React, { useState, useCallback, useEffect } from "react";
import { useQuickRTC, QuickRTCVideo } from "quickrtc-react-client";
import type {
  LocalStream,
  RemoteStream,
  NewParticipantEvent,
} from "quickrtc-react-client";
import { io, Socket } from "socket.io-client";

// Use same protocol as the page (works for both HTTP and HTTPS)
const SERVER_URL = `${window.location.protocol}//${window.location.host}`;

// ============================================================================
// TYPES
// ============================================================================

/** Remote participant with their streams */
interface RemoteParticipant {
  id: string;
  name: string;
  streams: RemoteStream[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function App() {
  // ============================================================================
  // FORM STATE - Before joining
  // ============================================================================
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("demo-room");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // PARTICIPANT & STREAM STATE - Managed by YOU, not the library
  // ============================================================================

  /** Remote participants with their streams */
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([]);

  /** Local streams (audio, video, screenshare) - from produce() return value */
  const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);

  // ============================================================================
  // QUICKRTC HOOK
  // ============================================================================

  const { rtc, isConnected, join, leave, produce } = useQuickRTC({
    socket,
    debug: true,
  });

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!rtc) return;

    /**
     * EVENT: newParticipant
     *
     * Called when:
     * - You join and there are existing participants (with or without streams)
     * - A new participant joins the room
     *
     * Streams may be empty if participant hasn't started sharing media yet.
     */
    const handleNewParticipant = (data: NewParticipantEvent) => {
      console.log(
        `[Event] New participant: ${data.participantName} with ${data.streams.length} streams`
      );

      setRemoteParticipants((prev) => {
        const existing = prev.find((p) => p.id === data.participantId);
        if (existing) {
          // Participant exists, merge new streams
          const newStreams = data.streams.filter(
            (s) => !existing.streams.some((es) => es.id === s.id)
          );
          if (newStreams.length === 0) return prev;
          return prev.map((p) =>
            p.id === data.participantId
              ? { ...p, streams: [...p.streams, ...newStreams] }
              : p
          );
        }
        // New participant
        return [
          ...prev,
          { id: data.participantId, name: data.participantName, streams: data.streams },
        ];
      });
    };

    /**
     * EVENT: streamAdded
     *
     * Called when an existing participant starts sharing new media
     * (e.g., they turn on video or start screen sharing)
     */
    const handleStreamAdded = (stream: RemoteStream) => {
      console.log(
        `[Event] Stream added: ${stream.type} from ${stream.participantName}`
      );
      setRemoteParticipants((prev) =>
        prev.map((p) =>
          p.id === stream.participantId
            ? {
                ...p,
                streams: p.streams.some((s) => s.id === stream.id)
                  ? p.streams
                  : [...p.streams, stream],
              }
            : p
        )
      );
    };

    /**
     * EVENT: participantLeft
     */
    const handleParticipantLeft = (data: { participantId: string }) => {
      console.log(`[Event] Participant left: ${data.participantId}`);
      setRemoteParticipants((prev) =>
        prev.filter((p) => p.id !== data.participantId)
      );
    };

    /**
     * EVENT: streamRemoved
     */
    const handleStreamRemoved = (data: {
      participantId: string;
      streamId: string;
      type: string;
    }) => {
      console.log(`[Event] Stream removed: ${data.type} (${data.streamId})`);
      setRemoteParticipants((prev) =>
        prev.map((p) =>
          p.id === data.participantId
            ? { ...p, streams: p.streams.filter((s) => s.id !== data.streamId) }
            : p
        )
      );
    };

    /**
     * EVENT: localStreamEnded
     *
     * Called when a local track ends externally (e.g., user clicks native browser "Stop sharing" button).
     * The library auto-cleans up the producer, we just need to update our local state.
     */
    const handleLocalStreamEnded = (data: {
      streamId: string;
      type: string;
    }) => {
      console.log(
        `[Event] Local stream ended: ${data.type} (${data.streamId})`
      );
      setLocalStreams((prev) => prev.filter((s) => s.id !== data.streamId));
    };

    /**
     * EVENT: error
     */
    const handleError = (data: { message: string; error?: Error }) => {
      console.error(`[Event] Error: ${data.message}`, data.error);
      setError(data.message);
    };

    // Subscribe to events
    rtc.on("newParticipant", handleNewParticipant);
    rtc.on("streamAdded", handleStreamAdded);
    rtc.on("participantLeft", handleParticipantLeft);
    rtc.on("streamRemoved", handleStreamRemoved);
    rtc.on("localStreamEnded", handleLocalStreamEnded);
    rtc.on("error", handleError);

    return () => {
      rtc.off("newParticipant", handleNewParticipant);
      rtc.off("streamAdded", handleStreamAdded);
      rtc.off("participantLeft", handleParticipantLeft);
      rtc.off("streamRemoved", handleStreamRemoved);
      rtc.off("localStreamEnded", handleLocalStreamEnded);
      rtc.off("error", handleError);
    };
  }, [rtc]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const hasAudio = localStreams.some((s) => s.type === "audio");
  const hasVideo = localStreams.some((s) => s.type === "video");
  const hasScreenShare = localStreams.some((s) => s.type === "screenshare");

  const localVideo = localStreams.find((s) => s.type === "video");
  const localScreen = localStreams.find((s) => s.type === "screenshare");
  const localAudio = localStreams.find((s) => s.type === "audio");

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Join the conference (without auto-producing media)
   */
  const handleJoin = useCallback(async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      // Connect socket
      console.log("[Action] Connecting to server...");
      const newSocket = io(SERVER_URL, {
        transports: ["websocket", "polling"],
      });

      await new Promise<void>((resolve, reject) => {
        newSocket.on("connect", () => resolve());
        newSocket.on("connect_error", (err) => reject(err));
        setTimeout(() => reject(new Error("Connection timeout")), 10000);
      });
      console.log("[Action] Socket connected");

      setSocket(newSocket);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Join conference (no auto-produce)
      console.log("[Action] Joining conference...");
      const joinResult = await join({
        conferenceId: roomId,
        participantName: name,
        participantInfo: { role: "participant", joinedAt: Date.now() },
      });
      console.log("[Action] Joined conference:", joinResult);
    } catch (err) {
      console.error("[Error] Join failed:", err);
      setError(err instanceof Error ? err.message : "Failed to join");
      socket?.disconnect();
      setSocket(null);
    } finally {
      setIsJoining(false);
    }
  }, [name, roomId, join, socket]);

  /**
   * Leave the conference
   */
  const handleLeave = useCallback(async () => {
    console.log("[Action] Leaving conference...");
    await leave();
    socket?.disconnect();
    setSocket(null);
    setLocalStreams([]);
    setRemoteParticipants([]);
  }, [leave, socket]);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(async () => {
    if (hasAudio) {
      const stream = localStreams.find((s) => s.type === "audio");
      if (stream) {
        console.log("[Action] Stopping audio...");
        await stream.stop();
        setLocalStreams((prev) => prev.filter((s) => s.id !== stream.id));
      }
    } else {
      console.log("[Action] Starting audio...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const [audioStream] = await produce(mediaStream.getAudioTracks());
      if (audioStream) {
        setLocalStreams((prev) => [...prev, audioStream]);
      }
    }
  }, [hasAudio, localStreams, produce]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(async () => {
    if (hasVideo) {
      const stream = localStreams.find((s) => s.type === "video");
      if (stream) {
        console.log("[Action] Stopping video...");
        await stream.stop();
        setLocalStreams((prev) => prev.filter((s) => s.id !== stream.id));
      }
    } else {
      console.log("[Action] Starting video...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      const [videoStream] = await produce(mediaStream.getVideoTracks());
      if (videoStream) {
        setLocalStreams((prev) => [...prev, videoStream]);
      }
    }
  }, [hasVideo, localStreams, produce]);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async () => {
    if (hasScreenShare) {
      const stream = localStreams.find((s) => s.type === "screenshare");
      if (stream) {
        console.log("[Action] Stopping screen share...");
        await stream.stop();
        setLocalStreams((prev) => prev.filter((s) => s.id !== stream.id));
      }
    } else {
      console.log("[Action] Starting screen share...");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const [screen] = await produce({
        track: screenStream.getVideoTracks()[0],
        type: "screenshare",
      });
      if (screen) {
        setLocalStreams((prev) => [...prev, screen]);
      }
    }
  }, [hasScreenShare, localStreams, produce]);

  // ============================================================================
  // RENDER - Join Form
  // ============================================================================

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-5">
        <h1 className="text-3xl font-bold text-white mb-8">QuickRTC Demo</h1>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg mb-4 max-w-sm w-full">
            {error}
          </div>
        )}

        <div className="bg-gray-800 p-8 rounded-xl shadow-xl w-full max-w-sm">
          <input
            className="w-full p-3 mb-4 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            disabled={isJoining}
          />
          <input
            className="w-full p-3 mb-4 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            disabled={isJoining}
          />
          <button
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? "Connecting..." : "Join Room"}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - Conference Room
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Controls */}
      <div className="flex justify-center gap-2 mb-4 flex-wrap">
        <button
          className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
            hasAudio
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
          onClick={toggleAudio}
        >
          {hasAudio ? "Mute" : "Unmute"}
        </button>

        <button
          className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
            hasVideo
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
          onClick={toggleVideo}
        >
          {hasVideo ? "Stop Video" : "Start Video"}
        </button>

        <button
          className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
            hasScreenShare
              ? "bg-yellow-500 hover:bg-yellow-600"
              : "bg-gray-600 hover:bg-gray-500"
          }`}
          onClick={toggleScreenShare}
        >
          {hasScreenShare ? "Stop Share" : "Share Screen"}
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          onClick={handleLeave}
        >
          Leave
        </button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ================================================================== */}
        {/* LOCAL PARTICIPANT - Always show card when connected                 */}
        {/* ================================================================== */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
          <span className="absolute top-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded z-10">
            You {!hasVideo && !hasScreenShare && "(No video)"}
          </span>

          {localVideo ? (
            <QuickRTCVideo
              stream={localVideo.stream}
              muted
              mirror
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl text-gray-500">
                {name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Local screen share (separate tile) */}
        {localScreen && (
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <span className="absolute top-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded z-10">
              You (Screen)
            </span>
            <QuickRTCVideo
              stream={localScreen.stream}
              muted
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Local audio (hidden - just for the stream) */}
        {localAudio && (
          <QuickRTCVideo stream={localAudio.stream} muted audioOnly />
        )}

        {/* ================================================================== */}
        {/* REMOTE PARTICIPANTS - Show card even without streams               */}
        {/* ================================================================== */}
        {remoteParticipants.map((participant) => {
          const video = participant.streams.find((s) => s.type === "video");
          const screen = participant.streams.find((s) => s.type === "screenshare");
          const audio = participant.streams.find((s) => s.type === "audio");
          const hasNoVideo = !video && !screen;

          return (
            <React.Fragment key={participant.id}>
              {/* Main participant tile (video or avatar) */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <span className="absolute top-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded z-10">
                  {participant.name} {hasNoVideo && "(No video)"}
                </span>

                {video ? (
                  <QuickRTCVideo
                    stream={video.stream}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-6xl text-gray-500">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Audio element (hidden) */}
                {audio && <QuickRTCVideo stream={audio.stream} audioOnly />}
              </div>

              {/* Screen share stream (separate tile) */}
              {screen && (
                <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded z-10">
                    {participant.name} (Screen)
                  </span>
                  <QuickRTCVideo
                    stream={screen.stream}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Empty state - only show if no remote participants */}
      {remoteParticipants.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          Waiting for others to join...
        </p>
      )}
    </div>
  );
}
