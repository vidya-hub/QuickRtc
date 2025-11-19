import { useEffect, useState } from "react";
import { useConference } from "quickrtc-react-client/src";
import { io, Socket } from "socket.io-client";
import VideoStream from "./components/VideoStream";
import Controls from "./components/Controls";
import ParticipantList from "./components/ParticipantList";

function App() {
  const [participantName, setParticipantName] = useState("");
  const [conferenceId, setConferenceId] = useState("demo-room");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showCertWarning, setShowCertWarning] = useState(true);
  const [serverUrl] = useState("https://localhost:3443");

  const {
    isJoined,
    isConnecting,
    localStreams,
    remoteParticipants,
    error,
    joinConference,
    leaveConference,
    produceMedia,
    consumeExistingStreams,
    stopLocalStream,
    stopWatchingParticipant,
    addEventListener,
  } = useConference();

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
  };

  const handleJoin = async () => {
    if (!participantName.trim()) {
      alert("Please enter your name");
      return;
    }

    try {
      // Create socket connection
      const newSocket = io(serverUrl, {
        transports: ["websocket", "polling"],
        secure: true,
      });

      // Handle connection errors specifically for certificate issues
      newSocket.on("connect_error", (err) => {
        console.error("[App] ❌ Socket connection error:", err);
        if (
          err.message.includes("certificate") ||
          err.message.includes("ERR_CERT")
        ) {
          alert(
            `Certificate Error: Please visit ${serverUrl} in your browser and accept the security warning first, then try again.`
          );
        }
      });

      setSocket(newSocket);

      // Join conference
      await joinConference({
        conferenceId,
        participantId: generateId(),
        participantName: participantName.trim(),
        socket: newSocket,
      });

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Produce media
      await produceMedia({
        audioTrack: stream.getAudioTracks()[0],
        videoTrack: stream.getVideoTracks()[0],
      });

      // Consume existing streams
      await consumeExistingStreams();
    } catch (error: any) {
      console.error("Error joining conference:", error);
      alert(`Failed to join: ${error.message}`);
    }
  };
  const onNewParticipant = (data: {
    participantId: string;
    participantName: string;
    conferenceId: string;
  }) => {
    console.log(`[App] 🎉 New participant joined conference:`, {
      name: data.participantName,
      id: data.participantId,
      conference: data.conferenceId,
    });
  };

  const onParticipantLeft = (data: {
    participantId: string;
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }) => {
    console.log(`[App] 👋 Participant left:`, {
      id: data.participantId,
      closedProducers: data.closedProducerIds.length,
      closedConsumers: data.closedConsumerIds.length,
    });
  };

  const onNewProducer = (data: {
    producerId: string;
    participantId: string;
    participantName: string;
    kind: "audio" | "video";
  }) => {
    console.log(`[App] 📡 New ${data.kind} producer:`, {
      from: data.participantName,
      participantId: data.participantId,
      producerId: data.producerId,
    });
  };

  const onProducerClosed = (data: {
    participantId: string;
    producerId: string;
    kind: "audio" | "video";
  }) => {
    console.log(`[App] ❌ Producer closed:`, {
      kind: data.kind,
      from: data.participantId,
      producerId: data.producerId,
    });
  };

  const onConnect = () => {
    console.log("[App] ✅ Socket connected successfully");
  };

  const onDisconnect = (reason: string) => {
    console.log(`[App] 🔌 Socket disconnected: ${reason}`);
  };

  const onAudioMuted = (data: {
    participantId: string;
    mutedProducerIds?: string[];
  }) => {
    console.log(`[App] 🔇 Audio muted by ${data.participantId}`, {
      producers: data.mutedProducerIds,
    });
  };

  const onAudioUnmuted = (data: { participantId: string }) => {
    console.log(`[App] 🔊 Audio unmuted by ${data.participantId}`);
  };

  const onVideoMuted = (data: {
    participantId: string;
    mutedProducerIds?: string[];
  }) => {
    console.log(`[App] 📵 Video muted by ${data.participantId}`, {
      producers: data.mutedProducerIds,
    });
  };

  const onVideoUnmuted = (data: { participantId: string }) => {
    console.log(`[App] 📹 Video unmuted by ${data.participantId}`);
  };

  const handleLeave = async () => {
    try {
      await leaveConference();
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    } catch (error: any) {
      console.error("Error leaving conference:", error);
    }
  };

  const handleToggleAudio = async () => {
    const audioStream = localStreams.find((s) => s.type === "audio");
    if (audioStream) {
      // Mute
      await stopLocalStream(audioStream.id);
    } else {
      // Unmute - create new audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await produceMedia({ audioTrack: stream.getAudioTracks()[0] });
    }
  };

  const handleToggleVideo = async () => {
    const videoStream = localStreams.find((s) => s.type === "video");
    if (videoStream) {
      // Turn off
      await stopLocalStream(videoStream.id);
    } else {
      // Turn on - create new video stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      await produceMedia({ videoTrack: stream.getVideoTracks()[0] });
    }
  };

  const handleShareScreen = async () => {
    const screenStream = localStreams.find((s) => s.type === "screenshare");
    if (screenStream) {
      // Stop sharing
      await stopLocalStream(screenStream.id);
    } else {
      // Start sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        await produceMedia({
          videoTrack: stream.getVideoTracks()[0],
          type: "screenshare",
        });
      } catch (error: any) {
        console.log("Screen share cancelled or failed:", error.message);
      }
    }
  };

  const hasAudio = localStreams.some((s) => s.type === "audio");
  const hasVideo = localStreams.some((s) => s.type === "video");
  const hasScreenShare = localStreams.some((s) => s.type === "screenshare");

  useEffect(() => {
    // Setup all event listeners with enhanced logging
    addEventListener({
      participantJoined: onNewParticipant,
      participantLeft: onParticipantLeft,
      newProducer: onNewProducer,
      producerClosed: onProducerClosed,
      connect: onConnect,
      disconnect: onDisconnect,
      audioMuted: onAudioMuted,
      audioUnmuted: onAudioUnmuted,
      videoMuted: onVideoMuted,
      videoUnmuted: onVideoUnmuted,
    });
  }, [addEventListener]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎥 QuickRTC React Client</h1>
        <p>Production-ready WebRTC conference with Redux state management</p>
      </header>

      <main className="main-content">
        {/* Certificate Warning Banner */}
        {showCertWarning && !isJoined && (
          <div
            className="warning-message"
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowCertWarning(false)}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#856404",
              }}
            >
              ×
            </button>
            <strong style={{ color: "#856404" }}>
              ⚠️ SSL Certificate Setup Required
            </strong>
            <p
              style={{
                marginTop: "8px",
                marginBottom: "8px",
                color: "#856404",
              }}
            >
              This app uses HTTPS with a self-signed certificate. Before joining
              a conference:
            </p>
            <ol style={{ marginLeft: "20px", color: "#856404" }}>
              <li>
                Open{" "}
                <a
                  href={serverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0066cc", textDecoration: "underline" }}
                >
                  {serverUrl}
                </a>{" "}
                in a new tab
              </li>
              <li>
                Accept the security warning (click "Advanced" → "Proceed to
                localhost")
              </li>
              <li>Return here and join the conference</li>
            </ol>
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!isJoined && !isConnecting && (
          <div className="join-section">
            <h2>Join Conference</h2>
            <form
              className="join-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleJoin();
              }}
            >
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  id="name"
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="room">Conference ID</label>
                <input
                  id="room"
                  type="text"
                  value={conferenceId}
                  onChange={(e) => setConferenceId(e.target.value)}
                  placeholder="Enter conference ID"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Join Conference
              </button>
            </form>
          </div>
        )}

        {isConnecting && (
          <div className="loading">
            <h2>Connecting to conference</h2>
          </div>
        )}

        {isJoined && (
          <div className="conference-section">
            <div className="participant-info">
              <p>
                <strong>Conference:</strong> {conferenceId}
              </p>
              <p>
                <strong>You:</strong> {participantName}
              </p>
              <p>
                <strong>Participants:</strong> {remoteParticipants.length + 1}
              </p>
            </div>

            <Controls
              hasAudio={hasAudio}
              hasVideo={hasVideo}
              hasScreenShare={hasScreenShare}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onShareScreen={handleShareScreen}
              onLeave={handleLeave}
            />

            <div className="video-grid">
              {/* Local video */}
              {localStreams.length > 0 && (
                <VideoStream
                  streams={localStreams}
                  participantName="You (Local)"
                  isLocal={true}
                />
              )}

              {/* Remote participants */}
              {remoteParticipants.map((participant) => (
                <div
                  key={participant.participantId}
                  className="participant-card"
                >
                  <div className="participant-header">
                    <span className="participant-name">
                      {participant.participantName}
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() =>
                        stopWatchingParticipant(participant.participantId)
                      }
                    >
                      Stop Watching
                    </button>
                  </div>
                  <ParticipantList participant={participant} />
                </div>
              ))}
            </div>

            {remoteParticipants.length === 0 && (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                <p>
                  No other participants yet. Share the conference ID to invite
                  others!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
