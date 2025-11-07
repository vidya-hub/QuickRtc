import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import type { ConferenceConfig, ProduceMediaOptions } from "../types";
import {
  selectIsJoined,
  selectIsConnecting,
  selectLocalStreams,
  selectRemoteParticipants,
  selectError,
  selectHasLocalAudio,
  selectHasLocalVideo,
  selectHasLocalScreenShare,
} from "../store/selectors";
import {
  joinConference as joinConferenceThunk,
  leaveConference as leaveConferenceThunk,
  produceMedia as produceMediaThunk,
  consumeExistingStreams as consumeExistingStreamsThunk,
  stopLocalStream as stopLocalStreamThunk,
  stopWatchingParticipant as stopWatchingParticipantThunk,
  toggleAudio as toggleAudioThunk,
  toggleVideo as toggleVideoThunk,
} from "../store/thunks";

/**
 * Main hook for conference management
 * Provides all state and actions needed to manage a conference
 */
export function useConference() {
  const dispatch = useDispatch();

  // Selectors
  const isJoined = useSelector(selectIsJoined);
  const isConnecting = useSelector(selectIsConnecting);
  const localStreams = useSelector(selectLocalStreams);
  const remoteParticipants = useSelector(selectRemoteParticipants);
  const error = useSelector(selectError);
  const hasLocalAudio = useSelector(selectHasLocalAudio);
  const hasLocalVideo = useSelector(selectHasLocalVideo);
  const hasLocalScreenShare = useSelector(selectHasLocalScreenShare);

  // Actions
  const joinConference = useCallback(
    async (config: ConferenceConfig) => {
      return dispatch(joinConferenceThunk(config) as any).unwrap();
    },
    [dispatch]
  );

  const leaveConference = useCallback(async () => {
    return dispatch(leaveConferenceThunk() as any).unwrap();
  }, [dispatch]);

  const produceMedia = useCallback(
    async (options: ProduceMediaOptions) => {
      return dispatch(produceMediaThunk(options) as any).unwrap();
    },
    [dispatch]
  );

  const consumeExistingStreams = useCallback(async () => {
    return dispatch(consumeExistingStreamsThunk() as any).unwrap();
  }, [dispatch]);

  const stopLocalStream = useCallback(
    async (streamId: string) => {
      return dispatch(stopLocalStreamThunk(streamId) as any).unwrap();
    },
    [dispatch]
  );

  const stopWatchingParticipant = useCallback(
    async (participantId: string) => {
      return dispatch(
        stopWatchingParticipantThunk(participantId) as any
      ).unwrap();
    },
    [dispatch]
  );

  const toggleAudio = useCallback(
    async (streamId?: string) => {
      return dispatch(toggleAudioThunk(streamId) as any).unwrap();
    },
    [dispatch]
  );

  const toggleVideo = useCallback(
    async (streamId?: string) => {
      return dispatch(toggleVideoThunk(streamId) as any).unwrap();
    },
    [dispatch]
  );

  return {
    // State
    isJoined,
    isConnecting,
    localStreams,
    remoteParticipants,
    error,
    hasLocalAudio,
    hasLocalVideo,
    hasLocalScreenShare,

    // Actions
    joinConference,
    leaveConference,
    produceMedia,
    consumeExistingStreams,
    stopLocalStream,
    stopWatchingParticipant,
    toggleAudio,
    toggleVideo,
  };
}
