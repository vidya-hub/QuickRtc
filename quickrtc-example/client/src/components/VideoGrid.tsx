import { VideoTile, StreamInfo } from "./VideoTile";

interface LocalStream {
  type: string;
  stream: MediaStream;
}

interface RemoteParticipant {
  participantId: string;
  participantName: string;
  streams?: StreamInfo[];
  videoStream?: MediaStream;
  audioStream?: MediaStream;
}

interface VideoGridProps {
  localStreams: LocalStream[];
  remoteParticipants: RemoteParticipant[];
}

/**
 * VideoGrid component displays all participant videos in a responsive grid.
 * Shows local user first, followed by remote participants.
 */
export function VideoGrid({ localStreams, remoteParticipants }: VideoGridProps) {
  /**
   * Convert remote participant data to StreamInfo array.
   * Handles both new streams array format and legacy videoStream/audioStream fields.
   */
  const getParticipantStreams = (participant: RemoteParticipant): StreamInfo[] => {
    // Use new streams array if available
    if (participant.streams && participant.streams.length > 0) {
      return participant.streams;
    }

    // Fallback to legacy fields
    const streams: StreamInfo[] = [];
    if (participant.videoStream) {
      streams.push({ type: "video", stream: participant.videoStream });
    }
    if (participant.audioStream) {
      streams.push({ type: "audio", stream: participant.audioStream });
    }
    return streams;
  };

  const hasParticipants = localStreams.length > 0 || remoteParticipants.length > 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Local user tile */}
        {localStreams.length > 0 && (
          <VideoTile streams={localStreams} name="You" muted />
        )}

        {/* Remote participant tiles */}
        {remoteParticipants.map((participant) => (
          <VideoTile
            key={participant.participantId}
            streams={getParticipantStreams(participant)}
            name={participant.participantName}
          />
        ))}
      </div>

      {/* Empty state */}
      {!hasParticipants && (
        <p className="text-center text-gray-400 mt-10">
          No participants yet. Start your camera or wait for others to join.
        </p>
      )}

      {localStreams.length > 0 && remoteParticipants.length === 0 && (
        <p className="text-center text-gray-400 mt-10">
          Waiting for other participants to join...
        </p>
      )}
    </>
  );
}
