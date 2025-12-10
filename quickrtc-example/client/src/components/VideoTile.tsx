import { useEffect, useRef } from "react";

export interface StreamInfo {
  type: string;
  stream: MediaStream;
}

export interface VideoTileProps {
  streams: StreamInfo[];
  name: string;
  muted?: boolean;
}

/**
 * VideoTile component displays a participant's video/audio streams.
 * Supports camera video, screen share, and audio streams.
 * When screen sharing, camera appears as a small overlay.
 */
export function VideoTile({ streams, name, muted = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const videoStream = streams.find((s) => s.type === "video");
  const screenShareStream = streams.find((s) => s.type === "screenshare");
  const audioStream = streams.find((s) => s.type === "audio");

  // Attach video stream to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream?.stream || null;
    }
  }, [videoStream?.stream]);

  // Attach screen share stream to video element
  useEffect(() => {
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = screenShareStream?.stream || null;
    }
  }, [screenShareStream?.stream]);

  // Attach audio stream to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = audioStream?.stream || null;
    }
  }, [audioStream?.stream]);

  const hasVideo = !!videoStream;
  const hasScreenShare = !!screenShareStream;
  const hasAudio = !!audioStream;

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      {/* Participant name badge */}
      <span className="absolute top-3 left-3 bg-black/70 text-white text-sm px-3 py-1 rounded z-10">
        {name}
      </span>

      {/* Screen share as primary view with camera overlay */}
      {hasScreenShare ? (
        <div className="aspect-video">
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            muted={muted}
            className="w-full h-full object-contain bg-black"
          />
          {hasVideo && (
            <div className="absolute bottom-3 right-3 w-32 h-24 rounded overflow-hidden shadow-lg border-2 border-white/20">
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
        /* Camera video as primary view */
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
        /* Avatar placeholder when no video */
        <div className="aspect-video flex items-center justify-center text-6xl text-gray-300 bg-gray-700">
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Audio element (hidden) */}
      {hasAudio && !muted && <audio ref={audioRef} autoPlay />}
    </div>
  );
}
