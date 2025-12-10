import { useConference } from "./useConference";
import { useRef, useCallback, useMemo } from "react";
import type { Socket } from "socket.io-client";

/**
 * Logger for useQuickRTC hook
 */
const logger = {
  info: (method: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[useQuickRTC:${method}]`;
    if (data) {
      console.info(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.info(`${timestamp} ${prefix} ${message}`);
    }
  },
  error: (method: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[useQuickRTC:${method}]`;
    if (error) {
      console.error(`${timestamp} ${prefix} ${message}`, error);
    } else {
      console.error(`${timestamp} ${prefix} ${message}`);
    }
  },
};

export interface UseQuickRTCOptions {
  conferenceId: string;
  participantName: string;
  socket: Socket;
}

/**
 * Simplified hook for QuickRTC - All you need to integrate WebRTC in your app
 *
 * Performance optimizations:
 * - All action callbacks are memoized with useCallback
 * - Return object is memoized to provide stable reference
 * - Uses refs for mutable values that shouldn't trigger re-renders
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
  
  // Track screen share stream ID to avoid stale closure issues
  const screenShareStreamIdRef = useRef<string | null>(null);

  /**
   * Join a conference with audio/video
   */
  const join = useCallback(async (options: UseQuickRTCOptions) => {
    const participantId = Math.random().toString(36).substring(2, 9);

    await conference.joinConference({
      conferenceId: options.conferenceId,
      participantId,
      participantName: options.participantName,
      socket: options.socket,
    });
  }, [conference.joinConference]);

  /**
   * Leave the conference
   */
  const leave = useCallback(async () => {
    await conference.leaveConference();
  }, [conference.leaveConference]);

  /**
   * Enable/Start audio
   */
  const enableAudio = useCallback(async () => {
    if (!conference.hasLocalAudio) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await conference.produceMedia({ audioTrack: stream.getAudioTracks()[0] });
    }
  }, [conference.hasLocalAudio, conference.produceMedia]);

  /**
   * Disable/Stop audio
   */
  const disableAudio = useCallback(async () => {
    const audioStream = conference.localStreams.find((s) => s.type === "audio");
    if (audioStream) {
      await conference.stopLocalStream(audioStream.id);
    }
  }, [conference.localStreams, conference.stopLocalStream]);

  /**
   * Toggle audio on/off
   */
  const toggleAudio = useCallback(async () => {
    if (conference.hasLocalAudio) {
      const audioStream = conference.localStreams.find((s) => s.type === "audio");
      if (audioStream) {
        await conference.stopLocalStream(audioStream.id);
      }
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await conference.produceMedia({ audioTrack: stream.getAudioTracks()[0] });
    }
  }, [conference.hasLocalAudio, conference.localStreams, conference.stopLocalStream, conference.produceMedia]);

  /**
   * Enable/Start video
   */
  const enableVideo = useCallback(async () => {
    if (!conference.hasLocalVideo) {
      logger.info('enableVideo', `Starting video`);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      logger.info('enableVideo', `Got user media track`, {
        trackId: videoTrack.id,
        trackKind: videoTrack.kind,
      });
      await conference.produceMedia({ videoTrack: videoTrack });
    }
  }, [conference.hasLocalVideo, conference.produceMedia]);

  /**
   * Disable/Stop video
   */
  const disableVideo = useCallback(async () => {
    logger.info('disableVideo', `Current local streams:`, 
      conference.localStreams.map(s => ({ id: s.id, type: s.type }))
    );
    
    const videoStream = conference.localStreams.find((s) => s.type === "video");
    
    if (videoStream) {
      logger.info('disableVideo', `Found video stream to disable`, {
        streamId: videoStream.id,
        type: videoStream.type,
      });
      await conference.stopLocalStream(videoStream.id);
    } else {
      logger.info('disableVideo', `No video stream found to disable`);
    }
  }, [conference.localStreams, conference.stopLocalStream]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (conference.hasLocalVideo) {
      logger.info('toggleVideo', `Current local streams:`, 
        conference.localStreams.map(s => ({ id: s.id, type: s.type }))
      );
      
      const videoStream = conference.localStreams.find((s) => s.type === "video");
      
      if (videoStream) {
        logger.info('toggleVideo', `Found video stream to disable`, {
          streamId: videoStream.id,
          type: videoStream.type,
        });
        await conference.stopLocalStream(videoStream.id);
      }
    } else {
      logger.info('toggleVideo', `Starting video`);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      logger.info('toggleVideo', `Got user media track`, {
        trackId: videoTrack.id,
        trackKind: videoTrack.kind,
      });
      await conference.produceMedia({ videoTrack: videoTrack });
    }
  }, [conference.hasLocalVideo, conference.localStreams, conference.stopLocalStream, conference.produceMedia]);

  /**
   * Start screen sharing
   */
  const shareScreen = useCallback(async () => {
    if (!conference.hasLocalScreenShare) {
      logger.info('shareScreen', `Starting screen share`);
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const videoTrack = stream.getVideoTracks()[0];
      logger.info('shareScreen', `Got display media track`, {
        trackId: videoTrack.id,
        trackKind: videoTrack.kind,
      });

      // Produce the screen share first so we get the stream ID
      const result = await conference.produceMedia({
        videoTrack,
        type: "screenshare",
      });

      // Store the stream ID in ref for the onended callback
      if (result?.videoStreamId) {
        screenShareStreamIdRef.current = result.videoStreamId;
        logger.info('shareScreen', `Screen share produced successfully`, {
          streamId: result.videoStreamId,
        });
      }

      // Handle browser's native "Stop Sharing" button
      videoTrack.onended = () => {
        const streamId = screenShareStreamIdRef.current;
        logger.info('shareScreen:onended', `Track ended event fired`, {
          streamId,
          trackId: videoTrack.id,
        });
        
        if (streamId) {
          conference.stopLocalStream(streamId).catch((err) => {
            logger.error('shareScreen:onended', `Failed to stop screen share`, err);
          });
          screenShareStreamIdRef.current = null;
        }
      };
    }
  }, [conference.hasLocalScreenShare, conference.produceMedia, conference.stopLocalStream]);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    logger.info('stopScreenShare', `Current local streams:`, 
      conference.localStreams.map(s => ({ id: s.id, type: s.type }))
    );
    
    const screenStream = conference.localStreams.find(
      (s) => s.type === "screenshare"
    );
    
    if (screenStream) {
      logger.info('stopScreenShare', `Found screenshare stream to stop`, {
        streamId: screenStream.id,
        type: screenStream.type,
      });
      await conference.stopLocalStream(screenStream.id);
      screenShareStreamIdRef.current = null;
    } else {
      logger.info('stopScreenShare', `No screenshare stream found to stop`);
    }
  }, [conference.localStreams, conference.stopLocalStream]);

  /**
   * Toggle screen sharing on/off
   */
  const toggleScreenShare = useCallback(async () => {
    if (conference.hasLocalScreenShare) {
      const screenStream = conference.localStreams.find(
        (s) => s.type === "screenshare"
      );
      
      if (screenStream) {
        logger.info('toggleScreenShare', `Found screenshare stream to stop`, {
          streamId: screenStream.id,
          type: screenStream.type,
        });
        await conference.stopLocalStream(screenStream.id);
        screenShareStreamIdRef.current = null;
      }
    } else {
      logger.info('toggleScreenShare', `Starting screen share`);
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const videoTrack = stream.getVideoTracks()[0];

      const result = await conference.produceMedia({
        videoTrack,
        type: "screenshare",
      });

      if (result?.videoStreamId) {
        screenShareStreamIdRef.current = result.videoStreamId;
      }

      videoTrack.onended = () => {
        const streamId = screenShareStreamIdRef.current;
        if (streamId) {
          conference.stopLocalStream(streamId).catch((err) => {
            logger.error('toggleScreenShare:onended', `Failed to stop screen share`, err);
          });
          screenShareStreamIdRef.current = null;
        }
      };
    }
  }, [conference.hasLocalScreenShare, conference.localStreams, conference.stopLocalStream, conference.produceMedia]);

  /**
   * Consume streams from all remote participants
   */
  const watchAllParticipants = useCallback(async () => {
    await conference.consumeExistingStreams();
  }, [conference.consumeExistingStreams]);

  /**
   * Stop watching a specific participant
   */
  const stopWatchingParticipant = useCallback(async (participantId: string) => {
    await conference.stopWatchingParticipant(participantId);
  }, [conference.stopWatchingParticipant]);

  // Memoize the return object to provide stable reference
  return useMemo(() => ({
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
  }), [
    conference.isJoined,
    conference.isConnecting,
    conference.localStreams,
    conference.remoteParticipants,
    conference.error,
    conference.hasLocalAudio,
    conference.hasLocalVideo,
    conference.hasLocalScreenShare,
    conference.addEventListener,
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
  ]);
}
