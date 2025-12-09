import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Device, Transport } from "mediasoup-client/lib/types";
import type {
  ConferenceState,
  ConferenceConfig,
  LocalStreamInfo,
  RemoteParticipant,
} from "../types";

/**
 * Initial state for conference slice
 */
const initialState: ConferenceState = {
  isJoined: false,
  isConnecting: false,
  config: null,
  device: null,
  sendTransport: null,
  recvTransport: null,
  localStreams: [],
  remoteParticipants: [],
  error: null,
};

/**
 * Conference slice - manages all conference state
 */
const conferenceSlice = createSlice({
  name: "conference",
  initialState,
  reducers: {
    // Connection actions
    setConnecting(state, action: PayloadAction<boolean>) {
      state.isConnecting = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    setJoined(state, action: PayloadAction<boolean>) {
      state.isJoined = action.payload;
      state.isConnecting = false;
    },

    setConfig(state, action: PayloadAction<ConferenceConfig>) {
      // Cast to any to avoid readonly (immutable) vs mutable type incompatibility
      state.config = action.payload as unknown as any;
    },

    // Device and transport actions
    setDevice(state, action: PayloadAction<Device | null>) {
      state.device = action.payload;
    },

    setSendTransport(state, action: PayloadAction<Transport | null>) {
      state.sendTransport = action.payload;
    },

    setRecvTransport(state, action: PayloadAction<Transport | null>) {
      state.recvTransport = action.payload;
    },

    // Local stream actions
    addLocalStream(state, action: PayloadAction<LocalStreamInfo>) {
      state.localStreams.push(action.payload);
    },

    removeLocalStream(state, action: PayloadAction<string>) {
      state.localStreams = state.localStreams.filter(
        (stream) => stream.id !== action.payload
      );
    },

    updateLocalStream(
      state,
      action: PayloadAction<{ streamId: string; enabled: boolean }>
    ) {
      const stream = state.localStreams.find(
        (s) => s.id === action.payload.streamId
      );
      if (stream) {
        stream.enabled = action.payload.enabled;
      }
    },

    clearLocalStreams(state) {
      state.localStreams = [];
    },

    // Remote participant actions
    addRemoteParticipant(state, action: PayloadAction<RemoteParticipant>) {
      const existing = state.remoteParticipants.find(
        (p) => p.participantId === action.payload.participantId
      );
      if (!existing) {
        state.remoteParticipants.push(action.payload);
      }
    },

    updateRemoteParticipant(
      state,
      action: PayloadAction<{
        participantId: string;
        updates: Partial<RemoteParticipant>;
      }>
    ) {
      const participant = state.remoteParticipants.find(
        (p) => p.participantId === action.payload.participantId
      );
      if (participant) {
        Object.assign(participant, action.payload.updates);
      }
    },

    removeRemoteParticipant(state, action: PayloadAction<string>) {
      state.remoteParticipants = state.remoteParticipants.filter(
        (p) => p.participantId !== action.payload
      );
    },

    clearRemoteParticipants(state) {
      state.remoteParticipants = [];
    },

    // Error actions
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isConnecting = false;
    },

    // Reset action
    resetConference() {
      return initialState;
    },
  },
});

// Export actions
export const {
  setConnecting,
  setJoined,
  setConfig,
  setDevice,
  setSendTransport,
  setRecvTransport,
  addLocalStream,
  removeLocalStream,
  updateLocalStream,
  clearLocalStreams,
  addRemoteParticipant,
  updateRemoteParticipant,
  removeRemoteParticipant,
  clearRemoteParticipants,
  setError,
  resetConference,
} = conferenceSlice.actions;

// Export reducer
export const conferenceReducer = conferenceSlice.reducer;
