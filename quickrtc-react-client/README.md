# QuickRTC React Client

A React client library for WebRTC video conferencing built on mediasoup.

## Installation

```bash
npm install quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client
```

## Quick Start

### 1. Configure Redux Store

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

### 2. Wrap Your App

```tsx
// main.tsx
import { Provider } from "react-redux";
import { store } from "./store";

function App() {
  return (
    <Provider store={store}>
      <Conference />
    </Provider>
  );
}
```

### 3. Use the Hook

```tsx
import { useConference } from "quickrtc-react-client";
import { io } from "socket.io-client";

function Conference() {
  const {
    isJoined,
    isConnecting,
    localStreams,
    remoteParticipants,
    joinConference,
    leaveConference,
    produceMedia,
  } = useConference();

  const handleJoin = async () => {
    const socket = io("https://your-server.com");

    await joinConference({
      conferenceId: "room-1",
      participantId: `user-${Date.now()}`,
      participantName: "Alice",
      socket,
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    await produceMedia({
      audioTrack: stream.getAudioTracks()[0],
      videoTrack: stream.getVideoTracks()[0],
    });
  };

  if (!isJoined) {
    return (
      <button onClick={handleJoin} disabled={isConnecting}>
        Join
      </button>
    );
  }

  return (
    <div>
      <button onClick={leaveConference}>Leave</button>

      {/* Local Video */}
      {localStreams.map((stream) => (
        <video
          key={stream.id}
          ref={(el) => el && (el.srcObject = stream.stream)}
          autoPlay
          muted
          playsInline
        />
      ))}

      {/* Remote Participants */}
      {remoteParticipants.map((p) => (
        <div key={p.participantId}>
          <p>{p.participantName}</p>
          {p.videoStream && (
            <video
              ref={(el) => el && (el.srcObject = p.videoStream)}
              autoPlay
              playsInline
            />
          )}
          {p.audioStream && (
            <audio
              ref={(el) => el && (el.srcObject = p.audioStream)}
              autoPlay
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### `useConference()` Hook

**State:**
- `isJoined: boolean` - Connected to conference
- `isConnecting: boolean` - Connection in progress
- `localStreams: LocalStreamInfo[]` - Your media streams
- `remoteParticipants: RemoteParticipant[]` - Other participants
- `error: string | null` - Error message

**Actions:**
- `joinConference(config)` - Join a room
- `leaveConference()` - Leave and cleanup
- `produceMedia(options)` - Publish audio/video
- `stopLocalStream(streamId)` - Stop a stream
- `stopWatchingParticipant(participantId)` - Stop receiving from a user
- `toggleAudio(streamId?)` - Mute/unmute
- `toggleVideo(streamId?)` - Pause/resume video
- `addEventListener(handlers)` - Listen to socket events

### Types

```typescript
interface ConferenceConfig {
  conferenceId: string;
  participantId: string;
  participantName: string;
  socket: Socket;
  conferenceName?: string;
}

interface ProduceMediaOptions {
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  type?: "audio" | "video" | "screenshare";
}
```

## Event Listeners

```typescript
const { addEventListener } = useConference();

useEffect(() => {
  addEventListener({
    participantJoined: (data) => console.log("Joined:", data.participantName),
    participantLeft: (data) => console.log("Left:", data.participantId),
    newProducer: (data) => console.log("New producer:", data.kind),
  });
}, [addEventListener]);
```

## Requirements

- HTTPS (WebRTC requirement)
- QuickRTC server running

## License

ISC
