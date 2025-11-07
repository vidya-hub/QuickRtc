import { configureStore } from "@reduxjs/toolkit";
import { conferenceReducer, eventMiddleware } from "quickrtc-react-client/src";

export const store = configureStore({
  reducer: {
    conference: conferenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          "conference/setConfig",
          "conference/setDevice",
          "conference/setSendTransport",
          "conference/setRecvTransport",
          "conference/addLocalStream",
          "conference/addRemoteParticipant",
          "conference/updateRemoteParticipant",
          "conference/join/pending",
          "conference/join/fulfilled",
          "conference/join/rejected",
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          "conference.config.socket",
          "conference.device",
          "conference.sendTransport",
          "conference.recvTransport",
          "conference.localStreams",
          "conference.remoteParticipants",
        ],
      },
    }).concat(eventMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
