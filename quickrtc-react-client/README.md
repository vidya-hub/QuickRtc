# quickrtc-react-client

React hooks and Redux integration for QuickRTC video conferencing.

## Installation

```bash
npm install quickrtc-react-client
```

## Quick Start

### 1. Wrap with Provider

```tsx
import { QuickRTCProvider } from "quickrtc-react-client";

function Main() {
  return (
    <QuickRTCProvider>
      <App />
    </QuickRTCProvider>
  );
}
```

### 2. Use the Hook

```tsx
import { useQuickRTC } from "quickrtc-react-client";
import { io } from "socket.io-client";

function Conference() {
  const {
    isJoined,
    localStreams,
    remoteParticipants,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    watchAllParticipants,
    hasAudio,
    hasVideo,
    hasScreenShare,
  } = useQuickRTC();

  const handleJoin = async () => {
    const socket = io("https://your-server.com");
    await join({
      conferenceId: "room-1",
      participantName: "Alice",
      socket,
    });
    await toggleAudio();
    await toggleVideo();
    await watchAllParticipants();
  };

  if (!isJoined) {
    return <button onClick={handleJoin}>Join</button>;
  }

  return (
    <div>
      <button onClick={toggleAudio}>{hasAudio ? "Mute" : "Unmute"}</button>
      <button onClick={toggleVideo}>{hasVideo ? "Stop" : "Start"} Video</button>
      <button onClick={toggleScreenShare}>
        {hasScreenShare ? "Stop" : "Start"} Screen Share
      </button>
      <button onClick={leave}>Leave</button>

      {/* Local video */}
      {localStreams.map((stream) => (
        <video
          key={stream.id}
          ref={(el) => el && (el.srcObject = stream.stream)}
          autoPlay
          muted
          playsInline
        />
      ))}

      {/* Remote participants */}
      {remoteParticipants.map((p) => (
        <div key={p.participantId}>
          <p>{p.participantName}</p>
          {p.streams?.map((s) => (
            <video
              key={s.id}
              ref={(el) => el && (el.srcObject = s.stream)}
              autoPlay
              playsInline
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

## useQuickRTC Hook API

```typescript
const {
  // Connection State
  isJoined: boolean,
  isConnecting: boolean,
  error: string | null,

  // Streams
  localStreams: LocalStreamInfo[],      // Your audio/video/screenshare streams
  remoteParticipants: RemoteParticipant[], // Other participants with their streams

  // Convenience Flags
  hasAudio: boolean,      // Has active audio stream
  hasVideo: boolean,      // Has active video stream  
  hasScreenShare: boolean, // Has active screen share

  // Actions
  join: (config: ConferenceConfig) => Promise<void>,
  leave: () => Promise<void>,
  toggleAudio: () => Promise<void>,
  toggleVideo: () => Promise<void>,
  toggleScreenShare: () => Promise<void>,
  watchAllParticipants: () => Promise<void>,
} = useQuickRTC();
```

## Types

### LocalStreamInfo

```typescript
interface LocalStreamInfo {
  id: string;
  type: "audio" | "video" | "screenshare";
  track: MediaStreamTrack;
  stream: MediaStream;
  producer: Producer;
  enabled: boolean;
}
```

### RemoteParticipant

```typescript
interface RemoteParticipant {
  participantId: string;
  participantName: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenShareEnabled: boolean;
  streams: RemoteStreamInfo[];
  // Legacy fields (for backwards compatibility)
  videoStream?: MediaStream;
  audioStream?: MediaStream;
}
```

### RemoteStreamInfo

```typescript
interface RemoteStreamInfo {
  id: string;
  type: "audio" | "video" | "screenshare";
  stream: MediaStream;
  consumer: Consumer;
  producerId: string;
}
```

### ConferenceConfig

```typescript
interface ConferenceConfig {
  conferenceId: string;
  participantName: string;
  socket: Socket;
  participantId?: string;  // Auto-generated if not provided
  conferenceName?: string;
}
```

## Advanced: Using useConference

For more control, use the lower-level `useConference` hook:

```typescript
import { useConference } from "quickrtc-react-client";

const {
  // All useQuickRTC state...
  
  // Additional actions
  produceMedia: (options: ProduceMediaOptions) => Promise<ProduceMediaResult>,
  stopLocalStream: (streamId: string) => Promise<void>,
  stopWatchingParticipant: (participantId: string) => Promise<void>,
} = useConference();
```

## Multi-Stream Support

QuickRTC supports multiple simultaneous streams per participant:

- **Camera video** - Regular video stream
- **Screen share** - Display/window capture  
- **Audio** - Microphone input

Each participant can share both camera and screen simultaneously. The `streams` array on `RemoteParticipant` contains all active streams with their type.

```tsx
{remoteParticipants.map((participant) => {
  const videoStream = participant.streams.find(s => s.type === "video");
  const screenStream = participant.streams.find(s => s.type === "screenshare");
  const audioStream = participant.streams.find(s => s.type === "audio");
  
  return (
    <div key={participant.participantId}>
      {screenStream && <video srcObject={screenStream.stream} />}
      {videoStream && <video srcObject={videoStream.stream} />}
      {audioStream && <audio srcObject={audioStream.stream} />}
    </div>
  );
})}
```

## License

ISC
