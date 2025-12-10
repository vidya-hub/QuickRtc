import { useState, useCallback } from "react";
import { useQuickRTC } from "quickrtc-react-client";
import { io, Socket } from "socket.io-client";
import { JoinForm, ConferenceRoom, LoadingScreen } from "./components";

const SERVER_URL = "https://localhost:3000";

/**
 * Main App component for QuickRTC Demo.
 * Handles conference lifecycle: join form -> connecting -> in-call.
 */
export default function App() {
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

  /**
   * Handle joining the conference.
   * Creates socket connection, joins room, enables media, and watches participants.
   */
  const handleJoin = useCallback(async () => {
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    const newSocket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);

    try {
      await join({
        conferenceId: roomId,
        participantName: name,
        socket: newSocket,
      });

      // Enable audio and video by default
      await toggleAudio();
      await toggleVideo();

      // Start watching other participants
      await watchAllParticipants();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to join: ${message}`);
    }
  }, [name, roomId, join, toggleAudio, toggleVideo, watchAllParticipants]);

  /**
   * Handle leaving the conference.
   * Cleans up media streams and disconnects socket.
   */
  const handleLeave = useCallback(async () => {
    await leave();
    socket?.disconnect();
    setSocket(null);
  }, [leave, socket]);

  // Show join form before connecting
  if (!isJoined && !isConnecting) {
    return (
      <JoinForm
        name={name}
        roomId={roomId}
        error={error}
        onNameChange={setName}
        onRoomIdChange={setRoomId}
        onJoin={handleJoin}
      />
    );
  }

  // Show loading screen while connecting
  if (isConnecting) {
    return <LoadingScreen />;
  }

  // Show conference room when connected
  return (
    <ConferenceRoom
      localStreams={localStreams}
      remoteParticipants={remoteParticipants}
      hasAudio={hasAudio}
      hasVideo={hasVideo}
      hasScreenShare={hasScreenShare}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onToggleScreenShare={toggleScreenShare}
      onLeave={handleLeave}
    />
  );
}
