import { useRef, useEffect } from "react";
import type { LocalStreamInfo } from "quickrtc-react-client";

interface VideoStreamProps {
  streams: LocalStreamInfo[];
  participantName: string;
  isLocal?: boolean;
}

function VideoStream({
  streams,
  participantName,
  isLocal = false,
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || streams.length === 0) return;

    // Prioritize screenshare, then video
    const screenShare = streams.find((s) => s.type === "screenshare");
    const video = streams.find((s) => s.type === "video");

    const streamToDisplay = screenShare || video;

    if (streamToDisplay && videoRef.current) {
      videoRef.current.srcObject = streamToDisplay.stream;
    }
  }, [streams]);

  const hasVideo = streams.some(
    (s) => s.type === "video" || s.type === "screenshare"
  );

  return (
    <div
      className={`video-container ${isLocal ? "local-video" : "remote-video"}`}
    >
      <div className="video-label">{participantName}</div>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#333",
            color: "white",
            fontSize: "3rem",
          }}
        >
          {participantName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default VideoStream;
