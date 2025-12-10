interface ControlBarProps {
  hasAudio: boolean;
  hasVideo: boolean;
  hasScreenShare: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

/**
 * ControlBar component displays media control buttons.
 * Provides toggle controls for audio, video, screen share, and leave.
 */
export function ControlBar({
  hasAudio,
  hasVideo,
  hasScreenShare,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: ControlBarProps) {
  return (
    <div className="flex justify-center gap-2 mb-5 flex-wrap">
      <button
        className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
          hasAudio
            ? "bg-red-500 hover:bg-red-600"
            : "bg-green-500 hover:bg-green-600"
        }`}
        onClick={onToggleAudio}
        title={hasAudio ? "Mute microphone" : "Unmute microphone"}
      >
        {hasAudio ? "Mute" : "Unmute"}
      </button>

      <button
        className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
          hasVideo
            ? "bg-red-500 hover:bg-red-600"
            : "bg-green-500 hover:bg-green-600"
        }`}
        onClick={onToggleVideo}
        title={hasVideo ? "Stop camera" : "Start camera"}
      >
        {hasVideo ? "Stop Video" : "Start Video"}
      </button>

      <button
        className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
          hasScreenShare
            ? "bg-yellow-500 hover:bg-yellow-600"
            : "bg-gray-500 hover:bg-gray-600"
        }`}
        onClick={onToggleScreenShare}
        title={hasScreenShare ? "Stop screen share" : "Share screen"}
      >
        {hasScreenShare ? "Stop Share" : "Share Screen"}
      </button>

      <button
        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
        onClick={onLeave}
        title="Leave conference"
      >
        Leave
      </button>
    </div>
  );
}
