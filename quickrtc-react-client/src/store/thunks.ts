import { createAsyncThunk } from "@reduxjs/toolkit";
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
  resetConference,
  setError,
} from "./conferenceSlice";
import type { RootState } from "./selectors";

/**
 * Enhanced logger for thunks
 */
const logger = {
  info: (thunk: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${thunk}]`;
    if (data) {
      console.info(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.info(`${timestamp} ${prefix} ${message}`);
    }
  },
  error: (thunk: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${thunk}]`;
    if (error) {
      console.error(`${timestamp} ${prefix} ${message}`, error);
    } else {
      console.error(`${timestamp} ${prefix} ${message}`);
    }
  },
};

/**
 * Join conference thunk
 */
export const joinConference = createAsyncThunk<
  void,
  ConferenceConfig,
  { state: RootState }
>("conference/join", async (config, { dispatch }) => {
  const THUNK = "joinConference";
  try {
    logger.info(THUNK, "🚀 Starting conference join process", {
      conferenceId: config.conferenceId,
      participantName: config.participantName,
    });

    dispatch(setConnecting(true));
    dispatch(setConfig(config));

    // Initialize socket
    logger.info(THUNK, "🔌 Initializing socket connection");
    socketService.setSocket(
      config.socket,
      config.conferenceId,
      config.participantId
    );

    // Join conference and get router capabilities
    logger.info(THUNK, "📡 Joining conference on server");
    const routerRtpCapabilities = await socketService.joinConference({
      conferenceId: config.conferenceId,
      conferenceName: config.conferenceName,
      participantId: config.participantId,
      participantName: config.participantName,
    });
    logger.info(THUNK, "✅ Successfully joined conference on server");

    // Load device
    logger.info(THUNK, "📱 Loading mediasoup device");
    const device = await deviceService.loadDevice(routerRtpCapabilities);
    dispatch(setDevice(device as any));
    logger.info(THUNK, "✅ Mediasoup device loaded successfully");

    // Create transports
    logger.info(THUNK, "🚚 Creating WebRTC transports");
    const transports = await socketService.createTransports();
    logger.info(THUNK, "✅ Transports created successfully");

    // Create send transport
    logger.info(THUNK, "📤 Setting up send transport");
    const sendTransport = device.createSendTransport(transports.sendTransport);

    // Setup send transport listeners
    sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          logger.info(THUNK, "🔗 Connecting send transport");
          await socketService.connectTransport({
            transportId: sendTransport.id,
            dtlsParameters,
            direction: "producer",
          });
          logger.info(THUNK, "✅ Send transport connected");
          callback();
        } catch (error: any) {
          logger.error(THUNK, "❌ Failed to connect send transport", error);
          errback(error);
        }
      }
    );

    sendTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        try {
          logger.info(THUNK, `📤 Producing ${kind} track`);
          const producerId = await socketService.produce({
            transportId: sendTransport.id,
            kind,
            rtpParameters,
          });
          logger.info(THUNK, `✅ Producer created for ${kind}`, { producerId });
          callback({ id: producerId });
        } catch (error: any) {
          logger.error(THUNK, `❌ Failed to produce ${kind}`, error);
          errback(error);
        }
      }
    );

    dispatch(setSendTransport(sendTransport as any));

    // Create receive transport
    logger.info(THUNK, "📥 Setting up receive transport");
    const recvTransport = device.createRecvTransport(transports.recvTransport);

    // Setup receive transport listeners
    recvTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          logger.info(THUNK, "🔗 Connecting receive transport");
          await socketService.connectTransport({
            transportId: recvTransport.id,
            dtlsParameters,
            direction: "consumer",
          });
          logger.info(THUNK, "✅ Receive transport connected");
          callback();
        } catch (error: any) {
          logger.error(THUNK, "❌ Failed to connect receive transport", error);
          errback(error);
        }
      }
    );

    dispatch(setRecvTransport(recvTransport as any));

    // Mark as joined
    dispatch(setJoined(true));

    logger.info(
      THUNK,
      "🎉 Successfully joined conference - ready to communicate!"
    );
  } catch (error: any) {
    logger.error(THUNK, "❌ Failed to join conference", error);
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
  const THUNK = "produceMedia";
  try {
    const state = getState();
    const sendTransport = state.conference.sendTransport;

    if (!sendTransport) {
      throw new Error("Send transport not available");
    }

    logger.info(THUNK, "🎬 Starting media production", {
      hasAudio: !!options.audioTrack,
      hasVideo: !!options.videoTrack,
      type: options.type || "video",
    });

    const result: ProduceMediaResult = {};

    // Produce audio
    if (options.audioTrack) {
      logger.info(THUNK, "🎤 Producing audio track");
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
      logger.info(THUNK, "✅ Audio producer created", {
        streamId: audioStreamId,
        producerId: audioProducer.id,
      });
    }

    // Produce video
    if (options.videoTrack) {
      const type = options.type || "video";
      logger.info(THUNK, `📹 Producing ${type} track`);

      const videoProducer = await sendTransport.produce({
        track: options.videoTrack,
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });

      const videoStreamId = `${type}-${Date.now()}`;
      const videoStreamInfo = streamService.createLocalStreamInfo(
        videoStreamId,
        type,
        options.videoTrack,
        videoProducer as any
      );

      dispatch(addLocalStream(videoStreamInfo as any));
      result.videoStreamId = videoStreamId;
      logger.info(THUNK, `✅ ${type} producer created`, {
        streamId: videoStreamId,
        producerId: videoProducer.id,
      });
    }

    logger.info(THUNK, "🎉 Media production completed successfully");
    return result;
  } catch (error: any) {
    logger.error(THUNK, "❌ Failed to produce media", error);
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
  const THUNK = "consumeExistingStreams";
  try {
    const state = getState();
    const device = state.conference.device;
    const recvTransport = state.conference.recvTransport;
    const config = state.conference.config;

    if (!device || !recvTransport || !config) {
      throw new Error("Not properly initialized");
    }

    logger.info(THUNK, "🔍 Fetching existing participants");

    // Get list of participants
    const participants = await socketService.getParticipants();
    logger.info(THUNK, `📋 Found ${participants.length} total participants`);

    // Filter out self
    const otherParticipants = participants.filter(
      (p) => p.participantId !== config.participantId
    );

    logger.info(
      THUNK,
      `👥 Consuming media from ${otherParticipants.length} other participants`
    );

    // Consume each participant
    for (const participant of otherParticipants) {
      logger.info(
        THUNK,
        `🔄 Consuming participant: ${participant.participantName}`
      );
      await dispatch(
        consumeParticipant({
          participantId: participant.participantId,
          participantName: participant.participantName,
        })
      );
    }

    logger.info(THUNK, "✅ Finished consuming existing streams");
  } catch (error: any) {
    logger.error(THUNK, "❌ Error consuming existing streams", error);
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
    const THUNK = "consumeParticipant";
    try {
      const state = getState();
      const device = state.conference.device;
      const recvTransport = state.conference.recvTransport;

      if (!device || !recvTransport) {
        throw new Error("Not properly initialized");
      }

      logger.info(
        THUNK,
        `🔄 Starting to consume participant: ${participantName}`,
        {
          participantId,
        }
      );

      const participantData = await streamService.consumeParticipant(
        device,
        recvTransport,
        participantId,
        participantName
      );

      const streamCount = Object.keys(participantData).length;
      logger.info(
        THUNK,
        `📊 Received ${streamCount} streams from ${participantName}`
      );

      if (streamCount > 0) {
        const existingParticipant = state.conference.remoteParticipants.find(
          (p) => p.participantId === participantId
        );

        if (existingParticipant) {
          logger.info(THUNK, `🔄 Updating existing participant ${participantName}`, {
            hasAudio: !!participantData.audioStream,
            hasVideo: !!participantData.videoStream,
          });
          
          dispatch(
            updateRemoteParticipant({
              participantId,
              updates: {
                ...participantData,
                isAudioEnabled: !!participantData.audioStream || existingParticipant.isAudioEnabled,
                isVideoEnabled: !!participantData.videoStream || existingParticipant.isVideoEnabled,
              },
            })
          );
        } else {
          const fullParticipant = {
            participantId,
            participantName,
            isAudioEnabled: !!participantData.audioStream,
            isVideoEnabled: !!participantData.videoStream,
            ...participantData,
          };
          dispatch(addRemoteParticipant(fullParticipant as any));
          logger.info(THUNK, `✅ Successfully consumed ${participantName}`, {
            hasAudio: !!participantData.audioStream,
            hasVideo: !!participantData.videoStream,
          });
        }
      } else {
        logger.info(THUNK, `ℹ️ No streams available from ${participantName}`);
      }
    } catch (error: any) {
      logger.error(
        THUNK,
        `❌ Error consuming participant ${participantId}`,
        error
      );
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
  const THUNK = "stopLocalStream";
  try {
    const state = getState();
    const streamInfo = state.conference.localStreams.find(
      (s) => s.id === streamId
    );

    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    logger.info(THUNK, `🛑 Stopping local ${streamInfo.type} stream`, {
      streamId,
    });

    await streamService.stopLocalStream(streamInfo);
    dispatch(removeLocalStream(streamId));

    logger.info(THUNK, `✅ Successfully stopped ${streamInfo.type} stream`);
  } catch (error: any) {
    logger.error(THUNK, "❌ Failed to stop local stream", error);
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
    const THUNK = "stopWatchingParticipant";
    try {
      const state = getState();
      const participant = state.conference.remoteParticipants.find(
        (p) => p.participantId === participantId
      );

      if (!participant) {
        throw new Error(`Participant ${participantId} not found`);
      }

      logger.info(
        THUNK,
        `🛑 Stopping watching participant: ${participant.participantName}`,
        {
          participantId,
        }
      );

      await streamService.stopConsumingParticipant(participant);
      dispatch(removeRemoteParticipant(participantId));

      logger.info(
        THUNK,
        `✅ Successfully stopped watching ${participant.participantName}`
      );
    } catch (error: any) {
      logger.error(THUNK, "❌ Failed to stop watching participant", error);
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
  const THUNK = "leaveConference";
  try {
    logger.info(THUNK, "👋 Starting conference leave process");
    const state = getState();

    // Stop all local streams
    logger.info(
      THUNK,
      `🛑 Stopping ${state.conference.localStreams.length} local streams`
    );
    for (const streamInfo of state.conference.localStreams) {
      await streamService.stopLocalStream(streamInfo);
    }
    logger.info(THUNK, "✅ All local streams stopped");

    // Stop all remote consumers
    logger.info(
      THUNK,
      `🛑 Stopping ${state.conference.remoteParticipants.length} remote participants`
    );
    for (const participant of state.conference.remoteParticipants) {
      await streamService.stopConsumingParticipant(participant);
    }
    logger.info(THUNK, "✅ All remote consumers stopped");

    // Close transports
    if (state.conference.sendTransport) {
      logger.info(THUNK, "🚚 Closing send transport");
      state.conference.sendTransport.close();
    }
    if (state.conference.recvTransport) {
      logger.info(THUNK, "🚚 Closing receive transport");
      state.conference.recvTransport.close();
    }

    // Leave conference on server
    logger.info(THUNK, "📡 Notifying server of departure");
    await socketService.leaveConference();

    // Cleanup services
    logger.info(THUNK, "🧹 Cleaning up services");
    socketService.reset();
    deviceService.reset();

    // Reset state
    dispatch(resetConference());

    logger.info(THUNK, "✅ Successfully left conference");
  } catch (error: any) {
    logger.error(THUNK, "❌ Error leaving conference", error);
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

// export const onNewProducer = createAsyncThunk<
//   void,
//   {
//     producerId: string;
//     participantId: string;
//     participantName: string;
//     kind: "audio" | "video";
//   },
//   { state: RootState }
// >(
//   "conference/onNewProducer",
//   async (data, { dispatch }) => {
//     console.log("📡 New producer:", data.kind, "from", data.participantName);

//     // Consume the new media
//     socketService.
