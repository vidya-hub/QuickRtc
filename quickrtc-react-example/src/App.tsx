import { useEffect, useRef, useState } from "react";
import { useQuickRTC } from "quickrtc-react-client/src/hooks/useQuickRTC";
import { io, Socket } from "socket.io-client";
import type { RemoteParticipant } from "quickrtc-react-client/src/types";

/**
 * Minimal QuickRTC Example - Single File, Under 300 Lines
 * Demonstrates: Join/Leave, Audio/Video Toggle, Screen Share, Remote Participants
 */
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

  const handleJoin = async () => {
    if (!name.trim()) return alert("Enter your name");

    const newSocket = io("https://localhost:3443", {
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    try {
      // 1. Join the conference
      await join({
        conferenceId: roomId,
        participantName: name,
        socket: newSocket,
      });

      // 2. Start local audio/video
      await toggleAudio();
      await toggleVideo();

      // 3. Consume existing participants' streams (if any already in room)
      // Note: New participants joining later are auto-consumed by event middleware
      await watchAllParticipants();
    } catch (err: any) {
      alert(`Failed to join: ${err.message}`);
    }
  };

  const handleLeave = async () => {
    await leave();
    socket?.disconnect();
    setSocket(null);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎥 QuickRTC React Client</h1>

      {error && <div style={styles.error}>Error: {error}</div>}

      {!isJoined && !isConnecting && (
        <div style={styles.joinBox}>
          <input
            style={styles.input}
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button style={styles.btnPrimary} onClick={handleJoin}>
            Join Room
          </button>
          <p style={styles.hint}>
            ℹ️ Visit{" "}
            <a href="https://localhost:3443" target="_blank">
              https://localhost:3443
            </a>{" "}
            first to accept the certificate
          </p>
        </div>
      )}

      {isConnecting && <div style={styles.loading}>Connecting...</div>}

      {isJoined && (
        <>
          <div style={styles.controls}>
            <button
              style={hasAudio ? styles.btnDanger : styles.btnSuccess}
              onClick={toggleAudio}
            >
              {hasAudio ? "🔇 Mute" : "🔊 Unmute"}
            </button>
            <button
              style={hasVideo ? styles.btnDanger : styles.btnSuccess}
              onClick={toggleVideo}
            >
              {hasVideo ? "📹 Stop Video" : "📷 Start Video"}
            </button>
            <button
              style={hasScreenShare ? styles.btnWarning : styles.btn}
              onClick={toggleScreenShare}
            >
              {hasScreenShare ? "⏹️ Stop Share" : "🖥️ Share Screen"}
            </button>
            <button style={styles.btnDanger} onClick={handleLeave}>
              ❌ Leave
            </button>
          </div>

          <div style={styles.grid}>
            {localStreams.length > 0 && (
              <LocalVideo streams={localStreams} name="You (Local)" />
            )}

            {remoteParticipants.map((p) => (
              <RemoteVideo key={p.participantId} participant={p} />
            ))}
          </div>

          {remoteParticipants.length === 0 && (
            <p style={styles.empty}>No other participants yet</p>
          )}
        </>
      )}
    </div>
  );
}

// Local video component
function LocalVideo({ streams, name }: { streams: any[]; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const screen = streams.find((s) => s.type === "screenshare");
    const video = streams.find((s) => s.type === "video");
    const streamToShow = screen || video;
    if (streamToShow) videoRef.current.srcObject = streamToShow.stream;
  }, [streams]);

  const hasVideo = streams.some(
    (s) => s.type === "video" || s.type === "screenshare"
  );

  return (
    <div style={styles.videoCard}>
      <div style={styles.videoLabel}>{name}</div>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
      ) : (
        <div style={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
      )}
    </div>
  );
}

// Remote video component
function RemoteVideo({ participant }: { participant: RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.videoStream) {
      videoRef.current.srcObject = participant.videoStream;
    }
  }, [participant.videoStream]);

  useEffect(() => {
    if (audioRef.current && participant.audioStream) {
      audioRef.current.srcObject = participant.audioStream;
    }
  }, [participant.audioStream]);

  return (
    <div style={styles.videoCard}>
      <div style={styles.videoLabel}>
        {participant.participantName}
        {participant.isAudioEnabled && " 🔊"}
        {participant.isVideoEnabled && " 📹"}
      </div>
      {participant.videoStream ? (
        <video ref={videoRef} autoPlay playsInline style={styles.video} />
      ) : (
        <div style={styles.avatar}>
          {participant.participantName.charAt(0).toUpperCase()}
        </div>
      )}
      {participant.audioStream && <audio ref={audioRef} autoPlay />}
    </div>
  );
}

// Clean, simple inline styles
const styles = {
  container: {
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    backgroundColor: "#f5f5f5",
  },
  title: {
    textAlign: "center" as const,
    fontSize: "28px",
    marginBottom: "40px",
    color: "#333",
  },
  joinBox: {
    maxWidth: "400px",
    margin: "0 auto",
    padding: "40px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box" as const,
    outline: "none",
  },
  btn: {
    padding: "10px 20px",
    margin: "5px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    backgroundColor: "white",
    color: "#333",
    transition: "all 0.2s",
  },
  btnPrimary: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "500" as const,
  },
  btnSuccess: {
    padding: "10px 20px",
    margin: "5px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    backgroundColor: "#10b981",
    color: "white",
  },
  btnDanger: {
    padding: "10px 20px",
    margin: "5px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    backgroundColor: "#ef4444",
    color: "white",
  },
  btnWarning: {
    padding: "10px 20px",
    margin: "5px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    backgroundColor: "#f59e0b",
    color: "white",
  },
  controls: {
    textAlign: "center" as const,
    margin: "30px 0",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    padding: "20px 0",
  },
  videoCard: {
    position: "relative" as const,
    backgroundColor: "#1f2937",
    borderRadius: "8px",
    overflow: "hidden",
    aspectRatio: "16/9",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  videoLabel: {
    position: "absolute" as const,
    top: "12px",
    left: "12px",
    backgroundColor: "rgba(0,0,0,0.75)",
    color: "white",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500" as const,
    zIndex: 1,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    display: "block",
  },
  avatar: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "64px",
    fontWeight: "600" as const,
    color: "#e5e7eb",
    backgroundColor: "#374151",
  },
  error: {
    padding: "16px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    marginBottom: "20px",
    border: "1px solid #fecaca",
  },
  loading: {
    textAlign: "center" as const,
    fontSize: "18px",
    padding: "60px 20px",
    color: "#6b7280",
  },
  empty: {
    textAlign: "center" as const,
    color: "#9ca3af",
    padding: "60px 20px",
    fontSize: "15px",
  },
  hint: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "16px",
    textAlign: "center" as const,
    lineHeight: "1.5",
  },
};

export default App;
