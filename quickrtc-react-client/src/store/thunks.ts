import { createAsyncThunk } from "@reduxjs/toolkit";
import { Device } from "mediasoup-client";
import type {
  ConferenceConfig,
  ProduceMediaOptions,
  ProduceMediaResult,
} from "../types";
import { deviceService } from "../api/deviceService";
import { socketService } from "../api/socketService";
import { streamService } from "../api/streamService";
import {
  setConnecting,
  setJoined,
  setConfig,
  setDevice,
  setSendTransport,
  setRecvTransport,
  addLocalStream,
  removeLocalStream,
  addRemoteParticipant,
  updateRemoteParticipant,
  removeRemoteParticipant,
  clearLocalStreams,
  clearRemoteParticipants,
  resetConference,
  setError,
} from "./conferenceSlice";
import type { RootState } from "./selectors";

/**
 * Join conference thunk
 */
export const joinConference = createAsyncThunk<
  void,
  ConferenceConfig,
  { state: RootState }
>("conference/join", async (config, { dispatch }) => {
  try {
    dispatch(setConnecting(true));
    dispatch(setConfig(config));

    // Initialize socket
    socketService.setSocket(
      config.socket,
      config.conferenceId,
      config.participantId
    );

    // Join conference and get router capabilities
    const routerRtpCapabilities = await socketService.joinConference({
      conferenceId: config.conferenceId,
      conferenceName: config.conferenceName,
      participantId: config.participantId,
      participantName: config.participantName,
    });

    // Load device
    const device = await deviceService.loadDevice(routerRtpCapabilities);
    dispatch(setDevice(device as any));

    // Create transports
    const transports = await socketService.createTransports();

    // Create send transport
    const sendTransport = device.createSendTransport(transports.sendTransport);

    // Setup send transport listeners
    sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await socketService.connectTransport({
            transportId: sendTransport.id,
            dtlsParameters,
            direction: "producer",
          });
          callback();
        } catch (error: any) {
          errback(error);
        }
      }
    );

    sendTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        try {
          const producerId = await socketService.produce({
            transportId: sendTransport.id,
            kind,
            rtpParameters,
          });
          callback({ id: producerId });
        } catch (error: any) {
          errback(error);
        }
      }
    );

    dispatch(setSendTransport(sendTransport as any));

    // Create receive transport
    const recvTransport = device.createRecvTransport(transports.recvTransport);

    // Setup receive transport listeners
    recvTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await socketService.connectTransport({
            transportId: recvTransport.id,
            dtlsParameters,
            direction: "consumer",
          });
          callback();
        } catch (error: any) {
          errback(error);
        }
      }
    );

    dispatch(setRecvTransport(recvTransport as any));

    // Mark as joined
    dispatch(setJoined(true));

    console.log("Successfully joined conference");
  } catch (error: any) {
    dispatch(setError(error.message || "Failed to join conference"));
    throw error;
  }
});

/**
 * Produce media thunk
 */
export const produceMedia = createAsyncThunk<
  ProduceMediaResult,
  ProduceMediaOptions,
  { state: RootState }
>("conference/produceMedia", async (options, { dispatch, getState }) => {
  try {
    const state = getState();
    const sendTransport = state.conference.sendTransport;

    if (!sendTransport) {
      throw new Error("Send transport not available");
    }

    const result: ProduceMediaResult = {};

    // Produce audio
    if (options.audioTrack) {
      const audioProducer = await sendTransport.produce({
        track: options.audioTrack,
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
        },
      });

      const audioStreamId = `audio-${Date.now()}`;
      const audioStreamInfo = streamService.createLocalStreamInfo(
        audioStreamId,
        "audio",
        options.audioTrack,
        audioProducer as any
      );

      dispatch(addLocalStream(audioStreamInfo as any));
      result.audioStreamId = audioStreamId;
    }

    // Produce video
    if (options.videoTrack) {
      const videoProducer = await sendTransport.produce({
        track: options.videoTrack,
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });

      const type = options.type || "video";
      const videoStreamId = `${type}-${Date.now()}`;
      const videoStreamInfo = streamService.createLocalStreamInfo(
        videoStreamId,
        type,
        options.videoTrack,
        videoProducer as any
      );

      dispatch(addLocalStream(videoStreamInfo as any));
      result.videoStreamId = videoStreamId;
    }

    return result;
  } catch (error: any) {
    dispatch(setError(error.message || "Failed to produce media"));
    throw error;
  }
});

/**
 * Consume existing streams thunk
 */
export const consumeExistingStreams = createAsyncThunk<
  void,
  void,
  { state: RootState }
>("conference/consumeExistingStreams", async (_, { dispatch, getState }) => {
  try {
    const state = getState();
    const device = state.conference.device;
    const recvTransport = state.conference.recvTransport;
    const config = state.conference.config;

    if (!device || !recvTransport || !config) {
      throw new Error("Not properly initialized");
    }

    // Get list of participants
    const participants = await socketService.getParticipants();

    // Filter out self
    const otherParticipants = participants.filter(
      (p) => p.participantId !== config.participantId
    );

    // Consume each participant
    for (const participant of otherParticipants) {
      await dispatch(
        consumeParticipant({
          participantId: participant.participantId,
          participantName: participant.participantName,
        })
      );
    }
  } catch (error: any) {
    console.error("Error consuming existing streams:", error);
    dispatch(setError(error.message || "Failed to consume existing streams"));
  }
});

/**
 * Consume specific participant thunk
 */
export const consumeParticipant = createAsyncThunk<
  void,
  { participantId: string; participantName: string },
  { state: RootState }
>(
  "conference/consumeParticipant",
  async ({ participantId, participantName }, { dispatch, getState }) => {
    try {
      const state = getState();
      const device = state.conference.device;
      const recvTransport = state.conference.recvTransport;

      if (!device || !recvTransport) {
        throw new Error("Not properly initialized");
      }

      const participantData = await streamService.consumeParticipant(
        device,
        recvTransport,
        participantId,
        participantName
      );

      if (Object.keys(participantData).length > 0) {
        const fullParticipant = {
          participantId,
          participantName,
          isAudioEnabled: false,
          isVideoEnabled: false,
          ...participantData,
        };
        dispatch(addRemoteParticipant(fullParticipant as any));
      }
    } catch (error: any) {
      console.error(`Error consuming participant ${participantId}:`, error);
    }
  }
);

/**
 * Stop local stream thunk
 */
export const stopLocalStream = createAsyncThunk<
  void,
  string,
  { state: RootState }
>("conference/stopLocalStream", async (streamId, { dispatch, getState }) => {
  try {
    const state = getState();
    const streamInfo = state.conference.localStreams.find(
      (s) => s.id === streamId
    );

    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    await streamService.stopLocalStream(streamInfo);
    dispatch(removeLocalStream(streamId));
  } catch (error: any) {
    dispatch(setError(error.message || "Failed to stop local stream"));
    throw error;
  }
});

/**
 * Stop watching participant thunk
 */
export const stopWatchingParticipant = createAsyncThunk<
  void,
  string,
  { state: RootState }
>(
  "conference/stopWatchingParticipant",
  async (participantId, { dispatch, getState }) => {
    try {
      const state = getState();
      const participant = state.conference.remoteParticipants.find(
        (p) => p.participantId === participantId
      );

      if (!participant) {
        throw new Error(`Participant ${participantId} not found`);
      }

      await streamService.stopConsumingParticipant(participant);
      dispatch(removeRemoteParticipant(participantId));
    } catch (error: any) {
      dispatch(
        setError(error.message || "Failed to stop watching participant")
      );
      throw error;
    }
  }
);

/**
 * Leave conference thunk
 */
export const leaveConference = createAsyncThunk<
  void,
  void,
  { state: RootState }
>("conference/leave", async (_, { dispatch, getState }) => {
  try {
    const state = getState();

    // Stop all local streams
    for (const streamInfo of state.conference.localStreams) {
      await streamService.stopLocalStream(streamInfo);
    }

    // Stop all remote consumers
    for (const participant of state.conference.remoteParticipants) {
      await streamService.stopConsumingParticipant(participant);
    }

    // Close transports
    if (state.conference.sendTransport) {
      state.conference.sendTransport.close();
    }
    if (state.conference.recvTransport) {
      state.conference.recvTransport.close();
    }

    // Leave conference on server
    await socketService.leaveConference();

    // Cleanup services
    socketService.reset();
    deviceService.reset();

    // Reset state
    dispatch(resetConference());

    console.log("Successfully left conference");
  } catch (error: any) {
    dispatch(setError(error.message || "Failed to leave conference"));
    throw error;
  }
});

/**
 * Toggle audio thunk
 */
export const toggleAudio = createAsyncThunk<
  boolean,
  string | undefined,
  { state: RootState }
>("conference/toggleAudio", async (streamId, { dispatch, getState }) => {
  try {
    const state = getState();
    let audioStream = streamId
      ? state.conference.localStreams.find((s) => s.id === streamId)
      : state.conference.localStreams.find((s) => s.type === "audio");

    if (!audioStream) {
      // No audio stream, need to create one
      return false;
    }

    // Stop the stream (mute)
    await dispatch(stopLocalStream(audioStream.id));
    return false;
  } catch (error: any) {
    dispatch(setError(error.message || "Failed to toggle audio"));
    throw error;
  }
});

/**
 * Toggle video thunk
 */
export const toggleVideo = createAsyncThunk<
  boolean,
  string | undefined,
  { state: RootState }
>("conference/toggleVideo", async (streamId, { dispatch, getState }) => {
  try {
    const state = getState();
    let videoStream = streamId
      ? state.conference.localStreams.find((s) => s.id === streamId)
      : state.conference.localStreams.find((s) => s.type === "video");

    if (!videoStream) {
      // No video stream, need to create one
      return false;
    }

    // Stop the stream (turn off)
    await dispatch(stopLocalStream(videoStream.id));
    return false;
  } catch (error: any) {
    dispatch(setError(error.message || "Failed to toggle video"));
    throw error;
  }
});
