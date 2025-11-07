interface ControlsProps {
  hasAudio: boolean;
  hasVideo: boolean;
  hasScreenShare: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onShareScreen: () => void;
  onLeave: () => void;
}

function Controls({
  hasAudio,
  hasVideo,
  hasScreenShare,
  onToggleAudio,
  onToggleVideo,
  onShareScreen,
  onLeave,
}: ControlsProps) {
  return (
    <div className="controls">
      <button
        className={`btn ${hasAudio ? "btn-danger" : "btn-success"}`}
        onClick={onToggleAudio}
      >
        {hasAudio ? "🔇 Mute Audio" : "🔊 Unmute Audio"}
      </button>

      <button
        className={`btn ${hasVideo ? "btn-danger" : "btn-success"}`}
        onClick={onToggleVideo}
      >
        {hasVideo ? "📹 Turn Off Video" : "📷 Turn On Video"}
      </button>

      <button
        className={`btn ${hasScreenShare ? "btn-danger" : "btn-primary"}`}
        onClick={onShareScreen}
      >
        {hasScreenShare ? "⏹️ Stop Sharing" : "🖥️ Share Screen"}
      </button>

      <button className="btn btn-danger" onClick={onLeave}>
        ❌ Leave Conference
      </button>
    </div>
  );
}

export default Controls;
