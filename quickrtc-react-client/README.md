# QuickRTC React Client# QuickRTC React Client

**The simplest way to add WebRTC to your React application** - Zero Redux knowledge required!A production-ready, type-safe React client library for building WebRTC conferencing applications with [QuickRTC](https://github.com/vidyasagar/quickrtc). Built on top of **mediasoup-client** and **Redux Toolkit**.

A production-ready React client library for WebRTC video conferencing built on mediasoup. Handles all the complexity of WebRTC, Redux state management, and real-time communication so you can focus on building your application.## 🚀 Features

## ✨ Features- **State Management**: Built-in Redux slice for predictable conference state.

- **React Hooks**: `useConference` hook for easy integration with functional components.

- 🎯 **Dead Simple API** - One provider, one hook, done!- **Type Safety**: Written in strict TypeScript with complete type definitions.

- 🚀 **Zero Redux Boilerplate** - Redux is handled internally- **Event Handling**: Robust socket event middleware for real-time updates.

- 📦 **Batteries Included** - Audio, video, screen sharing out of the box- **Media Management**: Simplified handling of local and remote media streams (audio/video/screenshare).

- 🎨 **UI Agnostic** - Works with any React UI framework- **Performance**: Optimized selectors and efficient re-rendering.

- 🔄 **Real-time Sync** - Automatic state synchronization- **Framework Agnostic**: Compatible with Next.js, Vite, Remix, Gatsby, etc.

- 💪 **TypeScript First** - Full type safety

- ⚡ **Production Ready** - Used in real-world applications## 📦 Installation

## 📦 InstallationInstall the package and its peer dependencies:

`bash`bash

npm install quickrtc-react-client socket.io-client mediasoup-clientnpm install quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client

# or# or

pnpm add quickrtc-react-client socket.io-client mediasoup-clientpnpm add quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client

````# or

yarn add quickrtc-react-client @reduxjs/toolkit react-redux socket.io-client mediasoup-client

## 🚀 Quick Start (30 seconds)```



### 1. Wrap your app with the provider## 🛠️ Quick Start



```tsx### 1. Configure Redux Store

import { QuickRTCProvider } from 'quickrtc-react-client';

Add the `conferenceReducer` and `eventMiddleware` to your Redux store.

function App() {

  return (```typescript

    <QuickRTCProvider>// store.ts

      <VideoRoom />import { configureStore } from "@reduxjs/toolkit";

    </QuickRTCProvider>import { conferenceReducer, eventMiddleware } from "quickrtc-react-client";

  );

}export const store = configureStore({

```  reducer: {

    conference: conferenceReducer,

### 2. Use the hook in your component  },

  middleware: (getDefaultMiddleware) =>

```tsx    getDefaultMiddleware({

import { useQuickRTC } from 'quickrtc-react-client';      serializableCheck: {

import { io } from 'socket.io-client';        // Ignore these paths as they contain non-serializable MediaStream objects

        ignoredActions: [

function VideoRoom() {          "conference/setLocalStream",

  const {           "conference/addRemoteStream",

    join,           "conference/setDevice",

    leave,           "conference/setSendTransport",

    toggleAudio,           "conference/setRecvTransport",

    toggleVideo,           "conference/addLocalStream",

    localStreams,           "conference/addRemoteParticipant",

    remoteParticipants         ],

  } = useQuickRTC();        ignoredPaths: [

          "conference.localStreams",

  const handleJoin = async () => {          "conference.remoteParticipants",

    const socket = io('https://your-server.com:3443');          "conference.device",

              "conference.sendTransport",

    // Join conference          "conference.recvTransport",

    await join({        ],

      conferenceId: 'room-123',      },

      participantName: 'John Doe',    }).concat(eventMiddleware),

      socket});

    });

    export type RootState = ReturnType<typeof store.getState>;

    // Enable audio and videoexport type AppDispatch = typeof store.dispatch;

    await toggleAudio();```

    await toggleVideo();

  };### 2. Wrap Your App with Provider



  return (```tsx

    <div>// App.tsx or main.tsx

      <button onClick={handleJoin}>Join Room</button>import { Provider } from "react-redux";

      <button onClick={toggleAudio}>Toggle Audio</button>import { store } from "./store";

      <button onClick={toggleVideo}>Toggle Video</button>import ConferenceComponent from "./ConferenceComponent";

      <button onClick={leave}>Leave</button>

      function App() {

      {/* Display local video */}  return (

      {localStreams.map(stream => (    <Provider store={store}>

        <video       <ConferenceComponent />

          key={stream.id}    </Provider>

          ref={ref => ref && (ref.srcObject = stream.stream)}  );

          autoPlay }

          muted ```

        />

      ))}### 3. Build the Conference Component



      {/* Display remote participants */}Use the `useConference` hook to interact with the conference.

      {remoteParticipants.map(participant => (

        <div key={participant.participantId}>```tsx

          <h3>{participant.participantName}</h3>import { useEffect } from "react";

          {participant.videoStream && (import { useConference } from "quickrtc-react-client";

            <video import { io } from "socket.io-client";

              ref={ref => ref && (ref.srcObject = participant.videoStream)}

              autoPlay const SOCKET_URL = "https://your-quickrtc-server.com";

            />

          )}export default function ConferenceComponent() {

        </div>  const {

      ))}    // State

    </div>    isJoined,

  );    isConnecting,

}    localStreams,

```    remoteParticipants,

    error,

That's it! You have a working video conference app.

    // Actions

## 📖 API Reference    joinConference,

    leaveConference,

### `useQuickRTC()`    produceMedia,

    toggleAudio,

The main hook that gives you everything you need.    toggleVideo,

    stopWatchingParticipant,

#### State    addEventListener,

  } = useConference();

| Property | Type | Description |

|----------|------|-------------|  // Setup event listeners (optional but recommended for custom notifications)

| `isJoined` | `boolean` | Whether you're connected to a conference |  useEffect(() => {

| `isConnecting` | `boolean` | Connection in progress |    addEventListener({

| `localStreams` | `LocalStreamInfo[]` | Your audio/video/screen streams |      participantJoined: (data) => console.log("User joined:", data.participantName),

| `remoteParticipants` | `RemoteParticipant[]` | Other participants in the room |      participantLeft: (data) => console.log("User left:", data.participantId),

| `error` | `string \| null` | Error message if something went wrong |      error: (err) => console.error("Socket error:", err),

| `hasAudio` | `boolean` | Is local audio enabled |    });

| `hasVideo` | `boolean` | Is local video enabled |  }, [addEventListener]);

| `hasScreenShare` | `boolean` | Is screen sharing active |

  const handleJoin = async () => {

#### Actions    const socket = io(SOCKET_URL);



| Method | Description |    await joinConference({

|--------|-------------|      conferenceId: "room-1",

| `join(options)` | Join a conference room |      participantId: `user-${Date.now()}`,

| `leave()` | Leave the conference |      participantName: "Alice",

| `toggleAudio()` | Turn audio on/off |      socket,

| `toggleVideo()` | Turn video on/off |    });

| `toggleScreenShare()` | Start/stop screen sharing |

| `enableAudio()` | Turn on audio |    // Get and publish local media

| `disableAudio()` | Turn off audio |    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

| `enableVideo()` | Turn on video |    await produceMedia({

| `disableVideo()` | Turn off video |      audioTrack: stream.getAudioTracks()[0],

| `watchAllParticipants()` | Start receiving streams from all participants |      videoTrack: stream.getVideoTracks()[0],

| `stopWatchingParticipant(id)` | Stop receiving streams from a specific participant |    });

  };

### Types

  if (!isJoined) {

```typescript    return <button onClick={handleJoin} disabled={isConnecting}>Join Conference</button>;

interface UseQuickRTCOptions {  }

  conferenceId: string;      // Room ID

  participantName: string;   // Display name  return (

  socket: Socket;            // Socket.io instance    <div>

}      <button onClick={leaveConference}>Leave</button>



interface LocalStreamInfo {      {/* Local Video */}

  id: string;      <div className="local-video">

  type: 'audio' | 'video' | 'screenshare';        {localStreams.map(stream => (

  stream: MediaStream;          <video

  track: MediaStreamTrack;            key={stream.id}

  enabled: boolean;            ref={el => { if (el) el.srcObject = stream.stream }}

}            autoPlay

            muted

interface RemoteParticipant {            playsInline

  participantId: string;          />

  participantName: string;        ))}

  videoStream?: MediaStream;      </div>

  audioStream?: MediaStream;

  isAudioEnabled: boolean;      {/* Remote Participants */}

  isVideoEnabled: boolean;      <div className="remote-grid">

}        {remoteParticipants.map(participant => (

```          <div key={participant.participantId}>

            <p>{participant.participantName}</p>

## 🎯 Common Patterns            {participant.videoStream && (

              <video

### Screen Sharing                ref={el => { if (el) el.srcObject = participant.videoStream }}

                autoPlay

```tsx                playsInline

const { toggleScreenShare, hasScreenShare } = useQuickRTC();              />

            )}

<button onClick={toggleScreenShare}>            {participant.audioStream && (

  {hasScreenShare ? 'Stop Sharing' : 'Share Screen'}              <audio

</button>                ref={el => { if (el) el.srcObject = participant.audioStream }}

```                autoPlay

              />

### Display Local Video            )}

          </div>

```tsx        ))}

function LocalVideo() {      </div>

  const { localStreams } = useQuickRTC();    </div>

  const videoRef = useRef<HTMLVideoElement>(null);  );

  }

  useEffect(() => {```

    const videoStream = localStreams.find(s => s.type === 'video');

    if (videoRef.current && videoStream) {## 📖 API Reference

      videoRef.current.srcObject = videoStream.stream;

    }### `useConference()` Hook

  }, [localStreams]);

  The primary hook for interacting with the library.

  return <video ref={videoRef} autoPlay muted />;

}#### Returns

````

**State:**

### Display Remote Participants- `isJoined: boolean`: True if currently joined to a conference.

- `isConnecting: boolean`: True if a join/connect operation is in progress.

```tsx- `localStreams: LocalStreamInfo[]`: List of local media streams being produced.

function RemoteVideos() {- `remoteParticipants: RemoteParticipant[]`: List of other users in the room.

const { remoteParticipants } = useQuickRTC();- `error: string | null`: Latest error message.

- `hasLocalAudio: boolean`: Helper to check if local audio is active.

return (- `hasLocalVideo: boolean`: Helper to check if local video is active.

    <div>- `hasLocalScreenShare: boolean`: Helper to check if screen share is active.

      {remoteParticipants.map(participant => (

        <RemoteVideo key={participant.participantId} participant={participant} />**Actions:**

      ))}- `joinConference(config: ConferenceConfig)`: Connect to server and join room.

    </div>- `leaveConference()`: Disconnect and clean up all streams.

);- `produceMedia(options: ProduceMediaOptions)`: Publish audio/video/screenshare.

}- `consumeExistingStreams()`: Manually request streams from users already in the room (usually handled automatically).

- `stopLocalStream(streamId: string)`: Stop a specific local stream.

function RemoteVideo({ participant }) {- `stopWatchingParticipant(participantId: string)`: Stop receiving media from a specific user.

const videoRef = useRef<HTMLVideoElement>(null);- `toggleAudio(streamId?: string)`: Mute/unmute audio.

- `toggleVideo(streamId?: string)`: Pause/resume video.

useEffect(() => {- `addEventListener(handlers)`: Register callbacks for socket events.

    if (videoRef.current && participant.videoStream) {

      videoRef.current.srcObject = participant.videoStream;### Types

    }

}, [participant.videoStream]);#### `ConferenceConfig`

````typescript

return (interface ConferenceConfig {

  <div>  conferenceId: string;    // Room ID

    <h3>{participant.participantName}</h3>  participantId: string;   // Unique User ID

    <video ref={videoRef} autoPlay />  participantName: string; // Display Name

  </div>  socket: Socket;          // Initialized Socket.io client

);}

}```

````

#### `RemoteParticipant`

## 🔧 Advanced Usage```typescript

interface RemoteParticipant {

### Custom Redux Integration participantId: string;

participantName: string;

If you already have a Redux store and want to integrate QuickRTC: videoStream?: MediaStream; // Remote video stream (if enabled)

audioStream?: MediaStream; // Remote audio stream (if enabled)

```tsx isAudioEnabled: boolean;

import { configureStore } from '@reduxjs/toolkit';  isVideoEnabled: boolean;

import { conferenceReducer, eventMiddleware } from 'quickrtc-react-client';}

```

const store = configureStore({

reducer: {### Selectors

    conference: conferenceReducer,

    // your other reducersFor advanced usage or performance optimization, you can use Redux selectors directly:

},

middleware: (getDefaultMiddleware) =>```typescript

    getDefaultMiddleware({import { useSelector } from "react-redux";

      serializableCheck: {import {

        ignoredActions: ['conference/setConfig', /* ... */],  selectLocalStreams,

        ignoredPaths: ['conference.localStreams', /* ... */],  selectRemoteParticipants,

      },  selectIsJoined

    }).concat(eventMiddleware),} from "quickrtc-react-client";

});

````const MyComponent = () => {

  const participants = useSelector(selectRemoteParticipants);

Then use the lower-level `useConference` hook instead of `useQuickRTC`.  // ...

};

### Event Listeners```



Listen to conference events for custom logic:## ⚠️ Important Notes



```tsx1.  **HTTPS Required**: WebRTC requires a secure context (HTTPS) or localhost.

const { addEventListener } = useQuickRTC();2.  **React Strict Mode**: In development, React Strict Mode may cause double-rendering which can initialize connections twice. The library handles this, but be aware of side effects in your own `useEffect` hooks.

3.  **Socket.io Version**: Ensure your client `socket.io-client` version matches the server's version (recommended v4.x).

useEffect(() => {

  addEventListener({## 📄 License

    participantJoined: (data) => {

      console.log(`${data.participantName} joined!`);ISC

    },
    participantLeft: (data) => {
      console.log(`Participant ${data.participantId} left`);
    },
    newProducer: (data) => {
      console.log(`New ${data.kind} from ${data.participantName}`);
    },
  });
}, [addEventListener]);
````

## 📂 Example

Check out the [complete example](../quickrtc-react-example) showing a full implementation in just 218 lines.

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📄 License

ISC

## 🆘 Support

- 📖 [Documentation](../README.md)
- 🐛 [Issue Tracker](https://github.com/vidya-hub/simple_mediasoup/issues)
- 💬 [Discussions](https://github.com/vidya-hub/simple_mediasoup/discussions)
