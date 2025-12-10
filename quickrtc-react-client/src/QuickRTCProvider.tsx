import React, { ReactNode, useMemo } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { conferenceReducer } from "./store/conferenceSlice";
import { eventMiddleware } from "./store/eventMiddleware";

/**
 * Internal Redux store factory - creates a singleton store
 */
const createQuickRTCStore = () => {
  return configureStore({
    reducer: {
      conference: conferenceReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
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
};

interface QuickRTCProviderProps {
  children: ReactNode;
}

/**
 * QuickRTCProvider - Simplified provider that handles all Redux setup internally
 * 
 * The store is memoized to prevent recreation on re-renders, which would cause
 * state loss and performance issues.
 *
 * Usage:
 * ```tsx
 * import { QuickRTCProvider } from 'quickrtc-react-client';
 *
 * function App() {
 *   return (
 *     <QuickRTCProvider>
 *       <YourComponent />
 *     </QuickRTCProvider>
 *   );
 * }
 * ```
 */
export function QuickRTCProvider({ children }: QuickRTCProviderProps) {
  // Memoize the store to prevent recreation on every render
  // This is critical for performance - creating a new store would reset all state
  const store = useMemo(() => createQuickRTCStore(), []);

  return <Provider store={store}>{children}</Provider>;
}
