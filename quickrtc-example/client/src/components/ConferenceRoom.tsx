import { ControlBar } from "./ControlBar";
import { VideoGrid } from "./VideoGrid";

interface LocalStream {
  type: string;
  stream: MediaStream;
}

interface RemoteParticipant {
  participantId: string;
  participantName: string;
  streams?: { type: string; stream: MediaStream }[];
  videoStream?: MediaStream;
  audioStream?: MediaStream;
}

interface ConferenceRoomProps {
  localStreams: LocalStream[];
  remoteParticipants: RemoteParticipant[];
  hasAudio: boolean;
  hasVideo: boolean;
  hasScreenShare: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

/**
 * ConferenceRoom component displays the main conference view.
 * Includes control bar and video grid for all participants.
 */
export function ConferenceRoom({
  localStreams,
  remoteParticipants,
  hasAudio,
  hasVideo,
  hasScreenShare,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: ConferenceRoomProps) {
  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <ControlBar
        hasAudio={hasAudio}
        hasVideo={hasVideo}
        hasScreenShare={hasScreenShare}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onLeave={onLeave}
      />

      <VideoGrid
        localStreams={localStreams}
        remoteParticipants={remoteParticipants}
      />
    </div>
  );
}
