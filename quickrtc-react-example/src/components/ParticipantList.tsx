import { useRef, useEffect, useState } from "react";
import type { RemoteParticipant } from "quickrtc-react-client/src";

interface ParticipantListProps {
  participant: RemoteParticipant;
}

function ParticipantList({ participant }: ParticipantListProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.videoStream) {
      videoRef.current.srcObject = participant.videoStream;
    }
  }, [participant.videoStream]);

  useEffect(() => {
    if (audioRef.current && participant.audioStream) {
      audioRef.current.srcObject = participant.audioStream;
      audioRef.current.muted = isAudioMuted;
    }
  }, [participant.audioStream, isAudioMuted]);

  const toggleAudioMute = () => {
    setIsAudioMuted((prev) => !prev);
  };

  return (
    <div style={{ position: "relative" }}>
      {participant.videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "auto",
            minHeight: "250px",
            background: "#000",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            minHeight: "250px",
            background: "#333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "4rem",
          }}
        >
          {participant.participantName.charAt(0).toUpperCase()}
        </div>
      )}

      {participant.audioStream && (
        <>
          <audio
            ref={audioRef}
            autoPlay
            playsInline
            style={{ display: "none" }}
          />
          <div
            className="audio-indicator"
            onClick={toggleAudioMute}
            title={isAudioMuted ? "Unmute" : "Mute"}
          >
            {isAudioMuted ? "🔇" : "🔊"}
          </div>
        </>
      )}
    </div>
  );
}

export default ParticipantList;
