import { useConference } from "./useConference";
import type { Socket } from "socket.io-client";

export interface UseQuickRTCOptions {
  conferenceId: string;
  participantName: string;
  socket: Socket;
}

/**
 * Simplified hook for QuickRTC - All you need to integrate WebRTC in your app
 *
 * @example
 * ```tsx
 * import { useQuickRTC, QuickRTCProvider } from 'quickrtc-react-client';
 * import { io } from 'socket.io-client';
 *
 * function VideoRoom() {
 *   const {
 *     isJoined,
 *     localStreams,
 *     remoteParticipants,
 *     join,
 *     leave,
 *     enableAudio,
 *     enableVideo,
 *     shareScreen
 *   } = useQuickRTC();
 *
 *   const handleJoin = async () => {
 *     const socket = io('https://localhost:3443');
 *     await join({
 *       conferenceId: 'room-123',
 *       participantName: 'John',
 *       socket
 *     });
 *     await enableAudio();
 *     await enableVideo();
 *   };
 *
 *   return (
 *     // Your UI here
 *   );
 * }
 * ```
 */
export function useQuickRTC() {
  const conference = useConference();

  /**
   * Join a conference with audio/video
   */
  const join = async (options: UseQuickRTCOptions) => {
    const participantId = Math.random().toString(36).substring(2, 9);

    await conference.joinConference({
      conferenceId: options.conferenceId,
      participantId,
      participantName: options.participantName,
      socket: options.socket,
    });
  };

  /**
   * Leave the conference
   */
  const leave = async () => {
    await conference.leaveConference();
  };

  /**
   * Enable/Start audio
   */
  const enableAudio = async () => {
    const hasAudio = conference.hasLocalAudio;
    if (!hasAudio) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await conference.produceMedia({ audioTrack: stream.getAudioTracks()[0] });
    }
  };

  /**
   * Disable/Stop audio
   */
  const disableAudio = async () => {
    const audioStream = conference.localStreams.find((s) => s.type === "audio");
    if (audioStream) {
      await conference.stopLocalStream(audioStream.id);
    }
  };

  /**
   * Toggle audio on/off
   */
  const toggleAudio = async () => {
    if (conference.hasLocalAudio) {
      await disableAudio();
    } else {
      await enableAudio();
    }
  };

  /**
   * Enable/Start video
   */
  const enableVideo = async () => {
    const hasVideo = conference.hasLocalVideo;
    if (!hasVideo) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      await conference.produceMedia({ videoTrack: stream.getVideoTracks()[0] });
    }
  };

  /**
   * Disable/Stop video
   */
  const disableVideo = async () => {
    const videoStream = conference.localStreams.find((s) => s.type === "video");
    if (videoStream) {
      await conference.stopLocalStream(videoStream.id);
    }
  };

  /**
   * Toggle video on/off
   */
  const toggleVideo = async () => {
    if (conference.hasLocalVideo) {
      await disableVideo();
    } else {
      await enableVideo();
    }
  };

  /**
   * Start screen sharing
   */
  const shareScreen = async () => {
    const hasScreenShare = conference.hasLocalScreenShare;
    if (!hasScreenShare) {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Handle browser's native "Stop Sharing" button
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          // Find and stop the screenshare stream when user clicks browser's stop button
          const screenStream = conference.localStreams.find(
            (s) => s.type === "screenshare"
          );
          if (screenStream) {
            conference.stopLocalStream(screenStream.id).catch((err) => {
              console.error("Failed to stop screen share:", err);
            });
          }
        };
      });

      await conference.produceMedia({
        videoTrack: stream.getVideoTracks()[0],
        type: "screenshare",
      });
    }
  };

  /**
   * Stop screen sharing
   */
  const stopScreenShare = async () => {
    const screenStream = conference.localStreams.find(
      (s) => s.type === "screenshare"
    );
    if (screenStream) {
      await conference.stopLocalStream(screenStream.id);
    }
  };

  /**
   * Toggle screen sharing on/off
   */
  const toggleScreenShare = async () => {
    if (conference.hasLocalScreenShare) {
      await stopScreenShare();
    } else {
      await shareScreen();
    }
  };

  /**
   * Consume streams from all remote participants
   */
  const watchAllParticipants = async () => {
    await conference.consumeExistingStreams();
  };

  /**
   * Stop watching a specific participant
   */
  const stopWatchingParticipant = async (participantId: string) => {
    await conference.stopWatchingParticipant(participantId);
  };

  return {
    // State
    isJoined: conference.isJoined,
    isConnecting: conference.isConnecting,
    localStreams: conference.localStreams,
    remoteParticipants: conference.remoteParticipants,
    error: conference.error,
    hasAudio: conference.hasLocalAudio,
    hasVideo: conference.hasLocalVideo,
    hasScreenShare: conference.hasLocalScreenShare,

    // Actions
    join,
    leave,
    enableAudio,
    disableAudio,
    toggleAudio,
    enableVideo,
    disableVideo,
    toggleVideo,
    shareScreen,
    stopScreenShare,
    toggleScreenShare,
    watchAllParticipants,
    stopWatchingParticipant,

    // Event listener setup
    addEventListener: conference.addEventListener,
  };
}
