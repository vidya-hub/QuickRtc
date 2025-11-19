# QuickRTC React Client

A production-ready, type-safe React client library for building WebRTC conferencing applications with [QuickRTC](https://github.com/vidyasagar/quickrtc). Built on top of **mediasoup-client** and **Redux Toolkit**.

## 🚀 Features

- **State Management**: Built-in Redux slice for predictable conference state.
- **React Hooks**: `useConference` hook for easy integration with functional components.
- **Type Safety**: Written in strict TypeScript with complete type definitions.
- **Event Handling**: Robust socket event middleware for real-time updates.
- **Media Management**: Simplified handling of local and remote media streams (audio/video/screenshare).
- **Performance**: Optimized selectors and efficient re-rendering.
- **Framework Agnostic**: Compatible with Next.js, Vite, Remix, Gatsby, etc.

## 📦 Installation

Install the package and its peer dependencies:

```bash
npm install quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client
# or
pnpm add quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client
# or
yarn add quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client
```

## 🛠️ Quick Start

### 1. Configure Redux Store

Add the `conferenceReducer` and `eventMiddleware` to your Redux store.

```typescript
// store.ts
import { configureStore } from "@reduxjs/toolkit";
import { conferenceReducer, eventMiddleware } from "quickrtc-react-client";

export const store = configureStore({
  reducer: {
    conference: conferenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths as they contain non-serializable MediaStream objects
        ignoredActions: [
          "conference/setLocalStream",
          "conference/addRemoteStream",
          "conference/setDevice",
          "conference/setSendTransport",
          "conference/setRecvTransport",
          "conference/addLocalStream",
          "conference/addRemoteParticipant",
        ],
        ignoredPaths: [
          "conference.localStreams",
          "conference.remoteParticipants",
          "conference.device",
          "conference.sendTransport",
          "conference.recvTransport",
        ],
      },
    }).concat(eventMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Wrap Your App with Provider

```tsx
// App.tsx or main.tsx
import { Provider } from "react-redux";
import { store } from "./store";
import ConferenceComponent from "./ConferenceComponent";

function App() {
  return (
    <Provider store={store}>
      <ConferenceComponent />
    </Provider>
  );
}
```

### 3. Build the Conference Component

Use the `useConference` hook to interact with the conference.

```tsx
import { useEffect } from "react";
import { useConference } from "quickrtc-react-client";
import { io } from "socket.io-client";

const SOCKET_URL = "https://your-quickrtc-server.com";

export default function ConferenceComponent() {
  const {
    // State
    isJoined,
    isConnecting,
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
    addEventListener,
  } = useConference();

  // Setup event listeners (optional but recommended for custom notifications)
  useEffect(() => {
    addEventListener({
      participantJoined: (data) => console.log("User joined:", data.participantName),
      participantLeft: (data) => console.log("User left:", data.participantId),
      error: (err) => console.error("Socket error:", err),
    });
  }, [addEventListener]);

  const handleJoin = async () => {
    const socket = io(SOCKET_URL);
    
    await joinConference({
      conferenceId: "room-1",
      participantId: `user-${Date.now()}`,
      participantName: "Alice",
      socket,
    });

    // Get and publish local media
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    await produceMedia({
      audioTrack: stream.getAudioTracks()[0],
      videoTrack: stream.getVideoTracks()[0],
    });
  };

  if (!isJoined) {
    return <button onClick={handleJoin} disabled={isConnecting}>Join Conference</button>;
  }

  return (
    <div>
      <button onClick={leaveConference}>Leave</button>
      
      {/* Local Video */}
      <div className="local-video">
        {localStreams.map(stream => (
          <video 
            key={stream.id}
            ref={el => { if (el) el.srcObject = stream.stream }}
            autoPlay 
            muted 
            playsInline 
          />
        ))}
      </div>

      {/* Remote Participants */}
      <div className="remote-grid">
        {remoteParticipants.map(participant => (
          <div key={participant.participantId}>
            <p>{participant.participantName}</p>
            {participant.videoStream && (
              <video 
                ref={el => { if (el) el.srcObject = participant.videoStream }}
                autoPlay 
                playsInline 
              />
            )}
            {participant.audioStream && (
              <audio 
                ref={el => { if (el) el.srcObject = participant.audioStream }}
                autoPlay 
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 📖 API Reference

### `useConference()` Hook

The primary hook for interacting with the library.

#### Returns

**State:**
- `isJoined: boolean`: True if currently joined to a conference.
- `isConnecting: boolean`: True if a join/connect operation is in progress.
- `localStreams: LocalStreamInfo[]`: List of local media streams being produced.
- `remoteParticipants: RemoteParticipant[]`: List of other users in the room.
- `error: string | null`: Latest error message.
- `hasLocalAudio: boolean`: Helper to check if local audio is active.
- `hasLocalVideo: boolean`: Helper to check if local video is active.
- `hasLocalScreenShare: boolean`: Helper to check if screen share is active.

**Actions:**
- `joinConference(config: ConferenceConfig)`: Connect to server and join room.
- `leaveConference()`: Disconnect and clean up all streams.
- `produceMedia(options: ProduceMediaOptions)`: Publish audio/video/screenshare.
- `consumeExistingStreams()`: Manually request streams from users already in the room (usually handled automatically).
- `stopLocalStream(streamId: string)`: Stop a specific local stream.
- `stopWatchingParticipant(participantId: string)`: Stop receiving media from a specific user.
- `toggleAudio(streamId?: string)`: Mute/unmute audio.
- `toggleVideo(streamId?: string)`: Pause/resume video.
- `addEventListener(handlers)`: Register callbacks for socket events.

### Types

#### `ConferenceConfig`
```typescript
interface ConferenceConfig {
  conferenceId: string;    // Room ID
  participantId: string;   // Unique User ID
  participantName: string; // Display Name
  socket: Socket;          // Initialized Socket.io client
}
```

#### `RemoteParticipant`
```typescript
interface RemoteParticipant {
  participantId: string;
  participantName: string;
  videoStream?: MediaStream; // Remote video stream (if enabled)
  audioStream?: MediaStream; // Remote audio stream (if enabled)
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}
```

### Selectors

For advanced usage or performance optimization, you can use Redux selectors directly:

```typescript
import { useSelector } from "react-redux";
import { 
  selectLocalStreams, 
  selectRemoteParticipants,
  selectIsJoined 
} from "quickrtc-react-client";

const MyComponent = () => {
  const participants = useSelector(selectRemoteParticipants);
  // ...
};
```

## ⚠️ Important Notes

1.  **HTTPS Required**: WebRTC requires a secure context (HTTPS) or localhost.
2.  **React Strict Mode**: In development, React Strict Mode may cause double-rendering which can initialize connections twice. The library handles this, but be aware of side effects in your own `useEffect` hooks.
3.  **Socket.io Version**: Ensure your client `socket.io-client` version matches the server's version (recommended v4.x).

## 📄 License

ISC
