import { useEffect, useRef, useState, memo, useCallback } from "react";
import { useQuickRTC } from "quickrtc-react-client";
import { io, Socket } from "socket.io-client";

function App() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("demo-room");
  const [socket, setSocket] = useState<Socket | null>(null);

  const {
    isJoined,
    isConnecting,
    localStreams,
    remoteParticipants,
    error,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    watchAllParticipants,
    hasAudio,
    hasVideo,
    hasScreenShare,
  } = useQuickRTC();

  const handleJoin = useCallback(async () => {
    if (!name.trim()) return alert("Enter your name");
    const newSocket = io("https://localhost:3000", {
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);
    try {
      await join({
        conferenceId: roomId,
        participantName: name,
        socket: newSocket,
      });
      await toggleAudio();
      await toggleVideo();
      await watchAllParticipants();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to join: ${message}`);
    }
  }, [name, roomId, join, toggleAudio, toggleVideo, watchAllParticipants]);

  const handleLeave = useCallback(async () => {
    await leave();
    socket?.disconnect();
    setSocket(null);
  }, [leave, socket]);

  // Join form
  if (!isJoined && !isConnecting) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-5">
        <h1 className="text-3xl font-bold mb-8">QuickRTC Demo</h1>
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
          <input
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            onClick={handleJoin}
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl">
        Connecting...
      </div>
    );
  }

  // In-call view
  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <div className="flex justify-center gap-2 mb-5 flex-wrap">
        <button
          className={`px-4 py-2 rounded-lg text-white ${
            hasAudio ? "bg-red-500" : "bg-green-500"
          }`}
          onClick={toggleAudio}
        >
          {hasAudio ? "Mute" : "Unmute"}
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-white ${
            hasVideo ? "bg-red-500" : "bg-green-500"
          }`}
          onClick={toggleVideo}
        >
          {hasVideo ? "Stop Video" : "Start Video"}
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-white ${
            hasScreenShare ? "bg-yellow-500" : "bg-gray-500"
          }`}
          onClick={toggleScreenShare}
        >
          {hasScreenShare ? "Stop Share" : "Share Screen"}
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-red-500 text-white"
          onClick={handleLeave}
        >
          Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {localStreams.length > 0 && (
          <VideoTile streams={localStreams} name="You" muted />
        )}
        {remoteParticipants.map((p) => {
          // Use the new streams array which properly handles multiple video streams
          const streamItems: StreamItem[] = (p.streams || []).map((s) => ({
            type: s.type,
            stream: s.stream,
          }));
          // Fallback to legacy fields if streams array is empty
          if (streamItems.length === 0) {
            if (p.videoStream) streamItems.push({ type: "video", stream: p.videoStream });
            if (p.audioStream) streamItems.push({ type: "audio", stream: p.audioStream });
          }
          return (
            <VideoTile
              key={p.participantId}
              streams={streamItems}
              name={p.participantName}
              hasScreenShare={p.isScreenShareEnabled}
            />
          );
        })}
      </div>

      {remoteParticipants.length === 0 && (
        <p className="text-center text-gray-400 mt-10">
          No other participants yet
        </p>
      )}
    </div>
  );
}

interface StreamItem {
  type: string;
  stream: MediaStream;
}

interface VideoTileProps {
  streams: StreamItem[];
  name: string;
  muted?: boolean;
  hasScreenShare?: boolean;
}

/**
 * Memoized VideoTile component to prevent unnecessary re-renders
 * Uses custom comparison to only re-render when streams actually change
 */
const VideoTile = memo(function VideoTile({ streams, name, muted = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Debug logging for streams (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`[VideoTile:${name}] Streams updated:`, streams.map(s => ({
        type: s.type,
        streamId: s.stream?.id,
        tracks: s.stream?.getTracks().map(t => ({ id: t.id, kind: t.kind, readyState: t.readyState }))
      })));
    }
  }, [streams, name]);

  useEffect(() => {
    if (!videoRef.current) return;
    const videoStream = streams.find((s) => s.type === "video");
    if (videoStream) {
      if (import.meta.env.DEV) {
        console.log(`[VideoTile:${name}] Setting video srcObject`, {
          streamId: videoStream.stream?.id,
        });
      }
      videoRef.current.srcObject = videoStream.stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [streams, name]);

  useEffect(() => {
    if (!screenShareRef.current) return;
    const screenShareStream = streams.find((s) => s.type === "screenshare");
    if (screenShareStream) {
      if (import.meta.env.DEV) {
        console.log(`[VideoTile:${name}] Setting screenshare srcObject`, {
          streamId: screenShareStream.stream?.id,
        });
      }
      screenShareRef.current.srcObject = screenShareStream.stream;
    } else {
      screenShareRef.current.srcObject = null;
    }
  }, [streams, name]);

  useEffect(() => {
    if (!audioRef.current) return;
    const audioStream = streams.find((s) => s.type === "audio");
    if (audioStream) {
      audioRef.current.srcObject = audioStream.stream;
    } else {
      audioRef.current.srcObject = null;
    }
  }, [streams]);

  const hasVideo = streams.some((s) => s.type === "video");
  const hasScreenShareStream = streams.some((s) => s.type === "screenshare");
  const hasAudioStream = streams.some((s) => s.type === "audio");

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <span className="absolute top-3 left-3 bg-black/70 text-white text-sm px-3 py-1 rounded z-10">
        {name}
        {hasScreenShareStream && (
          <span className="ml-2 text-yellow-400">📺 Sharing</span>
        )}
      </span>
      
      {/* Show screenshare as primary if available */}
      {hasScreenShareStream ? (
        <div className="aspect-video">
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            muted={muted}
            className="w-full h-full object-contain bg-black"
          />
          {/* Small camera overlay when screensharing */}
          {hasVideo && (
            <div className="absolute bottom-3 right-3 w-32 h-24 rounded overflow-hidden shadow-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      ) : hasVideo ? (
        <div className="aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center text-6xl text-gray-300 bg-gray-700">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {hasAudioStream && !muted && <audio ref={audioRef} autoPlay />}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if streams, name, or muted actually changed
  if (prevProps.name !== nextProps.name) return false;
  if (prevProps.muted !== nextProps.muted) return false;
  if (prevProps.streams.length !== nextProps.streams.length) return false;
  
  // Deep compare streams by type and stream ID
  for (let i = 0; i < prevProps.streams.length; i++) {
    const prevStream = prevProps.streams[i];
    const nextStream = nextProps.streams[i];
    if (prevStream.type !== nextStream.type) return false;
    if (prevStream.stream?.id !== nextStream.stream?.id) return false;
  }
  
  return true; // Props are equal, skip re-render
});

export default App;
