# quickrtc-react-client

React hooks for QuickRTC video conferencing.

## Installation

```bash
npm install quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client
```

## Setup

### 1. Configure Store

```typescript
// store.ts
import { configureStore } from "@reduxjs/toolkit";
import { conferenceReducer, eventMiddleware } from "quickrtc-react-client";

export const store = configureStore({
  reducer: { conference: conferenceReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["conference/setLocalStream", "conference/addRemoteStream", "conference/addLocalStream", "conference/addRemoteParticipant"],
        ignoredPaths: ["conference.localStreams", "conference.remoteParticipants", "conference.device", "conference.sendTransport", "conference.recvTransport"],
      },
    }).concat(eventMiddleware),
});
```

### 2. Wrap App

```tsx
import { Provider } from "react-redux";
import { store } from "./store";

<Provider store={store}>
  <App />
</Provider>
```

### 3. Use Hook

```tsx
import { useConference } from "quickrtc-react-client";
import { io } from "socket.io-client";

function Conference() {
  const { isJoined, localStreams, remoteParticipants, joinConference, leaveConference, produceMedia } = useConference();

  const handleJoin = async () => {
    const socket = io("https://your-server.com");
    await joinConference({ conferenceId: "room-1", participantId: "user-1", participantName: "Alice", socket });

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    await produceMedia({ audioTrack: stream.getAudioTracks()[0], videoTrack: stream.getVideoTracks()[0] });
  };

  return (
    <div>
      {!isJoined ? (
        <button onClick={handleJoin}>Join</button>
      ) : (
        <>
          <button onClick={leaveConference}>Leave</button>
          {remoteParticipants.map((p) => (
            <video key={p.participantId} ref={(el) => el && (el.srcObject = p.videoStream)} autoPlay playsInline />
          ))}
        </>
      )}
    </div>
  );
}
```

## Hook API

```typescript
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
  stopLocalStream,
  stopWatchingParticipant,
  toggleAudio,
  toggleVideo,
  addEventListener,
} = useConference();
```

## License

ISC
