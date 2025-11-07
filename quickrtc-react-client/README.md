# QuickRTC React Client

Production-ready React client library for QuickRTC with Redux state management. Framework-agnostic architecture compatible with Next.js, Remix, Gatsby, and other React-based frameworks.

## Features

- 🎯 **Redux Toolkit** for predictable state management
- 🔒 **Strict TypeScript** for type safety
- ⚛️ **React Hooks** for easy integration
- 🏗️ **Clean Architecture** with separation of concerns
- 🔌 **Framework Agnostic** - works with any React framework
- 📦 **Tree Shakeable** for optimal bundle size
- 🎨 **Headless** - bring your own UI components

## Installation

```bash
npm install quickrtc-react-client @reduxjs/toolkit react-redux
# or
pnpm add quickrtc-react-client @reduxjs/toolkit react-redux
```

## Quick Start

### 1. Configure Redux Store

```typescript
import { configureStore } from "@reduxjs/toolkit";
import { conferenceReducer, eventMiddleware } from "quickrtc-react-client";

export const store = configureStore({
  reducer: {
    conference: conferenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "conference/setLocalStream",
          "conference/addRemoteStream",
        ],
        ignoredPaths: [
          "conference.localStreams",
          "conference.remoteParticipants",
        ],
      },
    }).concat(eventMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Use the Hook in Your Component

```typescript
import { useConference } from "quickrtc-react-client";
import { io } from "socket.io-client";

function VideoConference() {
  const {
    // State
    isJoined,
    localStreams,
    remoteParticipants,
    error,

    // Actions
    joinConference,
    leaveConference,
    produceMedia,
    toggleAudio,
    toggleVideo,
    stopWatchingParticipant,
  } = useConference();

  const handleJoin = async () => {
    const socket = io("https://your-server.com");

    await joinConference({
      conferenceId: "my-room",
      participantId: "user-123",
      participantName: "John Doe",
      socket,
    });

    // Get user media
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    await produceMedia({
      audioTrack: stream.getAudioTracks()[0],
      videoTrack: stream.getVideoTracks()[0],
    });
  };

  return (
    <div>
      {!isJoined ? (
        <button onClick={handleJoin}>Join Conference</button>
      ) : (
        <>
          <button onClick={leaveConference}>Leave</button>
          <button onClick={() => toggleAudio()}>Toggle Audio</button>
          <button onClick={() => toggleVideo()}>Toggle Video</button>

          {/* Render local streams */}
          {localStreams.map((stream) => (
            <video
              key={stream.id}
              ref={(el) => {
                if (el) el.srcObject = stream.stream;
              }}
              autoPlay
              muted
            />
          ))}

          {/* Render remote participants */}
          {remoteParticipants.map((participant) => (
            <div key={participant.participantId}>
              <h3>{participant.participantName}</h3>
              {participant.videoStream && (
                <video
                  ref={(el) => {
                    if (el) el.srcObject = participant.videoStream;
                  }}
                  autoPlay
                />
              )}
              {participant.audioStream && (
                <audio
                  ref={(el) => {
                    if (el) el.srcObject = participant.audioStream;
                  }}
                  autoPlay
                />
              )}
              <button
                onClick={() =>
                  stopWatchingParticipant(participant.participantId)
                }
              >
                Stop Watching
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

## API Reference

### Hook: `useConference()`

Returns an object with state and actions for managing the conference.

#### State

- `isJoined: boolean` - Whether the user has joined the conference
- `isConnecting: boolean` - Whether a connection attempt is in progress
- `localStreams: LocalStreamInfo[]` - Array of local media streams
- `remoteParticipants: RemoteParticipant[]` - Array of remote participants
- `error: string | null` - Current error message, if any

#### Actions

- `joinConference(config)` - Join a conference
- `leaveConference()` - Leave the current conference
- `produceMedia(options)` - Start producing audio/video
- `toggleAudio(streamId?)` - Toggle audio on/off
- `toggleVideo(streamId?)` - Toggle video on/off
- `stopLocalStream(streamId)` - Stop a specific local stream
- `stopWatchingParticipant(participantId)` - Stop consuming a participant's media
- `consumeExistingStreams()` - Consume media from existing participants

### Selectors

```typescript
import {
  selectLocalStreams,
  selectRemoteParticipants,
} from "quickrtc-react-client";

// In your component
const localStreams = useSelector(selectLocalStreams);
const remoteParticipants = useSelector(selectRemoteParticipants);
```

## Framework Integration

### Next.js (App Router)

```typescript
"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import VideoConference from "./VideoConference";

export default function ConferencePage() {
  return (
    <Provider store={store}>
      <VideoConference />
    </Provider>
  );
}
```

### Next.js (Pages Router)

```typescript
import { Provider } from "react-redux";
import { store } from "../store";

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}

export default MyApp;
```

### Remix

```typescript
import { Provider } from "react-redux";
import { store } from "./store";

export default function App() {
  return (
    <Provider store={store}>
      <Outlet />
    </Provider>
  );
}
```

## Architecture

```
src/
  ├── store/
  │   ├── conferenceSlice.ts    # Redux slice with all state logic
  │   ├── selectors.ts           # Memoized selectors
  │   ├── thunks.ts              # Async actions
  │   └── eventMiddleware.ts     # WebSocket event handling
  ├── api/
  │   ├── deviceService.ts       # MediaSoup device management
  │   ├── streamService.ts       # Media stream handling
  │   └── socketService.ts       # Socket.io communication
  ├── hooks/
  │   └── useConference.ts       # Main React hook
  ├── types.ts                   # TypeScript definitions
  └── index.ts                   # Public API exports
```

## License

ISC
