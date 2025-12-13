---
sidebar_position: 1
---

# React Integration

The `quickrtc-react-client` package provides React hooks and components for building video conferencing UIs.

## Installation

```bash
npm install quickrtc-react-client socket.io-client
```

## Quick Start

```tsx
import { useState, useEffect } from "react";
import { useQuickRTC, QuickRTCVideo } from "quickrtc-react-client";
import type { LocalStream, RemoteStream } from "quickrtc-react-client";
import { io, Socket } from "socket.io-client";

function VideoRoom() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

  const { rtc, isConnected, join, leave, produce } = useQuickRTC({
    socket,
    debug: true,
  });

  // Subscribe to events
  useEffect(() => {
    if (!rtc) return;

    rtc.on("newParticipant", ({ participantName, streams }) => {
      console.log(`${participantName} joined`);
      setRemoteStreams(prev => [...prev, ...streams]);
    });

    rtc.on("streamAdded", (stream) => {
      setRemoteStreams(prev => [...prev, stream]);
    });

    rtc.on("streamRemoved", ({ streamId }) => {
      setRemoteStreams(prev => prev.filter(s => s.id !== streamId));
    });

    rtc.on("participantLeft", ({ participantId }) => {
      setRemoteStreams(prev => 
        prev.filter(s => s.participantId !== participantId)
      );
    });

    rtc.on("localStreamEnded", ({ streamId }) => {
      setLocalStreams(prev => prev.filter(s => s.id !== streamId));
    });
  }, [rtc]);

  const handleJoin = async () => {
    // Connect socket
    const newSocket = io("https://localhost:3000");
    await new Promise(resolve => newSocket.on("connect", resolve));
    setSocket(newSocket);

    // Join conference
    await join({
      conferenceId: "my-room",
      participantName: "Alice",
    });

    // Start camera
    const media = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const streams = await produce(media.getTracks());
    setLocalStreams(streams);
  };

  const handleLeave = async () => {
    await leave();
    socket?.disconnect();
    setSocket(null);
    setLocalStreams([]);
    setRemoteStreams([]);
  };

  if (!isConnected) {
    return <button onClick={handleJoin}>Join Room</button>;
  }

  return (
    <div>
      <button onClick={handleLeave}>Leave</button>
      
      {/* Local video */}
      {localStreams.filter(s => s.type === "video").map(stream => (
        <QuickRTCVideo
          key={stream.id}
          stream={stream.stream}
          muted
          mirror
        />
      ))}
      
      {/* Remote videos */}
      {remoteStreams.filter(s => s.type === "video").map(stream => (
        <QuickRTCVideo
          key={stream.id}
          stream={stream.stream}
        />
      ))}
      
      {/* Remote audio (hidden) */}
      {remoteStreams.filter(s => s.type === "audio").map(stream => (
        <QuickRTCVideo
          key={stream.id}
          stream={stream.stream}
          audioOnly
        />
      ))}
    </div>
  );
}
```

## useQuickRTC Hook

### Options

```typescript
interface UseQuickRTCOptions {
  socket: Socket | null;      // Socket.IO client (can be null initially)
  maxParticipants?: number;   // Max participants (0 = unlimited)
  debug?: boolean;            // Enable debug logging
}
```

### Return Value

```typescript
interface UseQuickRTCReturn {
  rtc: QuickRTC | null;           // Instance for event subscriptions
  isConnected: boolean;           // Connection state
  conferenceId: string | null;    // Current conference ID
  participantId: string | null;   // Current participant ID
  
  // Actions
  join: (config: JoinConfig) => Promise<{ conferenceId, participantId }>;
  leave: () => Promise<void>;
  produce: (input: ProduceInput) => Promise<LocalStream[]>;
  pause: (streamId: string) => Promise<void>;
  resume: (streamId: string) => Promise<void>;
  stop: (streamId: string) => Promise<void>;
}
```

### Usage Pattern

The hook follows a **state-external** pattern - you manage your own stream state:

```tsx
const { rtc, isConnected, join, produce } = useQuickRTC({ socket });

// Your own state
const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

// Subscribe to events and update YOUR state
useEffect(() => {
  if (!rtc) return;

  rtc.on("newParticipant", ({ streams }) => {
    setRemoteStreams(prev => [...prev, ...streams]);
  });

  // ... other events
}, [rtc]);
```

## QuickRTCVideo Component

A simple video/audio element that handles MediaStream attachment.

### Props

```typescript
interface QuickRTCVideoProps {
  stream: MediaStream;       // The MediaStream to display
  muted?: boolean;          // Mute audio (default: false)
  mirror?: boolean;         // Flip horizontally (default: false)
  audioOnly?: boolean;      // Render as hidden audio element
  className?: string;       // CSS class name
  style?: React.CSSProperties;
}
```

### Examples

```tsx
// Local video (muted to prevent echo, mirrored for self-view)
<QuickRTCVideo
  stream={localVideoStream.stream}
  muted
  mirror
  className="w-full rounded-lg"
/>

// Remote video
<QuickRTCVideo
  stream={remoteVideoStream.stream}
  className="w-full rounded-lg"
/>

// Audio-only (hidden element for remote audio)
<QuickRTCVideo
  stream={remoteAudioStream.stream}
  audioOnly
/>

// Screen share (no mirror, contain fit)
<QuickRTCVideo
  stream={screenShareStream.stream}
  style={{ objectFit: "contain" }}
/>
```

## Events Reference

Subscribe to events via the `rtc` instance:

```tsx
useEffect(() => {
  if (!rtc) return;

  const handleNewParticipant = (data) => {
    console.log(data.participantName, data.streams);
  };

  rtc.on("newParticipant", handleNewParticipant);

  return () => {
    rtc.off("newParticipant", handleNewParticipant);
  };
}, [rtc]);
```

| Event | Data | Description |
|-------|------|-------------|
| `newParticipant` | `{ participantId, participantName, participantInfo, streams[] }` | Participant joined |
| `streamAdded` | `RemoteStream` | Participant added a stream |
| `streamRemoved` | `{ participantId, streamId, type }` | Stream removed |
| `participantLeft` | `{ participantId }` | Participant left |
| `localStreamEnded` | `{ streamId, type }` | Local track ended externally |
| `error` | `{ message, error }` | Error occurred |

## Complete Example

```tsx
import { useState, useEffect, useCallback } from "react";
import { useQuickRTC, QuickRTCVideo } from "quickrtc-react-client";
import type { LocalStream, RemoteStream } from "quickrtc-react-client";
import { io, Socket } from "socket.io-client";

const SERVER_URL = "https://localhost:3000";

interface RemoteParticipant {
  id: string;
  name: string;
  streams: RemoteStream[];
}

export default function App() {
  // Connection state
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("demo-room");
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Media state
  const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);

  const { rtc, isConnected, join, leave, produce } = useQuickRTC({ 
    socket, 
    debug: true 
  });

  // Subscribe to events
  useEffect(() => {
    if (!rtc) return;

    const handleNewParticipant = ({ participantId, participantName, streams }) => {
      setRemoteParticipants(prev => {
        const exists = prev.find(p => p.id === participantId);
        if (exists) return prev;
        return [...prev, { id: participantId, name: participantName, streams }];
      });
    };

    const handleStreamAdded = (stream: RemoteStream) => {
      setRemoteParticipants(prev => 
        prev.map(p => 
          p.id === stream.participantId
            ? { ...p, streams: [...p.streams, stream] }
            : p
        )
      );
    };

    const handleStreamRemoved = ({ participantId, streamId }) => {
      setRemoteParticipants(prev =>
        prev.map(p =>
          p.id === participantId
            ? { ...p, streams: p.streams.filter(s => s.id !== streamId) }
            : p
        )
      );
    };

    const handleParticipantLeft = ({ participantId }) => {
      setRemoteParticipants(prev => 
        prev.filter(p => p.id !== participantId)
      );
    };

    const handleLocalStreamEnded = ({ streamId }) => {
      setLocalStreams(prev => prev.filter(s => s.id !== streamId));
    };

    rtc.on("newParticipant", handleNewParticipant);
    rtc.on("streamAdded", handleStreamAdded);
    rtc.on("streamRemoved", handleStreamRemoved);
    rtc.on("participantLeft", handleParticipantLeft);
    rtc.on("localStreamEnded", handleLocalStreamEnded);

    return () => {
      rtc.off("newParticipant", handleNewParticipant);
      rtc.off("streamAdded", handleStreamAdded);
      rtc.off("streamRemoved", handleStreamRemoved);
      rtc.off("participantLeft", handleParticipantLeft);
      rtc.off("localStreamEnded", handleLocalStreamEnded);
    };
  }, [rtc]);

  const handleJoin = useCallback(async () => {
    if (!name.trim()) return;

    const newSocket = io(SERVER_URL);
    await new Promise<void>((resolve, reject) => {
      newSocket.on("connect", () => resolve());
      newSocket.on("connect_error", reject);
    });
    setSocket(newSocket);

    await join({ conferenceId: roomId, participantName: name });
  }, [name, roomId, join]);

  const handleLeave = useCallback(async () => {
    await leave();
    socket?.disconnect();
    setSocket(null);
    setLocalStreams([]);
    setRemoteParticipants([]);
  }, [leave, socket]);

  const toggleVideo = useCallback(async () => {
    const hasVideo = localStreams.some(s => s.type === "video");
    
    if (hasVideo) {
      const video = localStreams.find(s => s.type === "video");
      if (video) {
        await video.stop();
        setLocalStreams(prev => prev.filter(s => s.id !== video.id));
      }
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const [videoStream] = await produce(stream.getVideoTracks());
      if (videoStream) {
        setLocalStreams(prev => [...prev, videoStream]);
      }
    }
  }, [localStreams, produce]);

  // Join form
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-neutral-900 p-8 rounded-xl w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-6">Join Room</h1>
          <input
            className="w-full p-3 mb-4 bg-neutral-800 text-white rounded-lg"
            placeholder="Your Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="w-full p-3 mb-4 bg-neutral-800 text-white rounded-lg"
            placeholder="Room ID"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
          />
          <button
            className="w-full p-3 bg-white text-black rounded-lg font-semibold"
            onClick={handleJoin}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  // Conference room
  const localVideo = localStreams.find(s => s.type === "video");

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="flex gap-2 mb-4 justify-center">
        <button
          className="px-4 py-2 rounded-lg bg-neutral-800 text-white"
          onClick={toggleVideo}
        >
          {localVideo ? "Stop Video" : "Start Video"}
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-red-600 text-white"
          onClick={handleLeave}
        >
          Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Local video */}
        <div className="bg-neutral-900 rounded-lg aspect-video relative">
          <span className="absolute top-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
            You
          </span>
          {localVideo ? (
            <QuickRTCVideo
              stream={localVideo.stream}
              muted
              mirror
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500">
              Camera off
            </div>
          )}
        </div>

        {/* Remote participants */}
        {remoteParticipants.map(participant => {
          const video = participant.streams.find(s => s.type === "video");
          const audio = participant.streams.find(s => s.type === "audio");

          return (
            <div key={participant.id} className="bg-neutral-900 rounded-lg aspect-video relative">
              <span className="absolute top-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded z-10">
                {participant.name}
              </span>
              {video ? (
                <QuickRTCVideo
                  stream={video.stream}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              )}
              {audio && <QuickRTCVideo stream={audio.stream} audioOnly />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Types

All types are re-exported from `quickrtc-client`:

```typescript
import type {
  LocalStream,
  RemoteStream,
  JoinConfig,
  ProduceInput,
  NewParticipantEvent,
} from "quickrtc-react-client";
```
