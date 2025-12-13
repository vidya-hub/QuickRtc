# quickrtc-react-client

React hooks and components for QuickRTC conferencing.

## Installation

```bash
npm install quickrtc-react-client
```

## Quick Start

```tsx
import { useQuickRTC, QuickRTCVideo } from "quickrtc-react-client";
import { io } from "socket.io-client";

function App() {
  const [socket, setSocket] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [localStreams, setLocalStreams] = useState([]);

  const { rtc, isConnected, join, leave, produce } = useQuickRTC({ socket });

  useEffect(() => {
    if (!rtc) return;

    rtc.on("newParticipant", ({ participantId, participantName, streams }) => {
      setRemoteParticipants(prev => [...prev, { id: participantId, name: participantName }]);
      setRemoteStreams(prev => [...prev, ...streams]);
    });

    rtc.on("streamAdded", (stream) => {
      setRemoteStreams(prev => [...prev, stream]);
    });

    rtc.on("streamRemoved", ({ streamId }) => {
      setRemoteStreams(prev => prev.filter(s => s.id !== streamId));
    });

    rtc.on("participantLeft", ({ participantId }) => {
      setRemoteParticipants(prev => prev.filter(p => p.id !== participantId));
      setRemoteStreams(prev => prev.filter(s => s.participantId !== participantId));
    });

    rtc.on("localStreamEnded", ({ streamId }) => {
      setLocalStreams(prev => prev.filter(s => s.id !== streamId));
    });
  }, [rtc]);

  const handleJoin = async () => {
    const newSocket = io("https://localhost:3000");
    await new Promise(resolve => newSocket.on("connect", resolve));
    setSocket(newSocket);
    
    await join({ conferenceId: "room-1", participantName: "Alice" });
    
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStreams(await produce(media.getTracks()));
  };

  return (
    <div>
      {localStreams.map(s => (
        <QuickRTCVideo key={s.id} stream={s.stream} muted mirror />
      ))}
      {remoteStreams.map(s => (
        <QuickRTCVideo key={s.id} stream={s.stream} />
      ))}
    </div>
  );
}
```

## Events

| Event | When | Data |
|-------|------|------|
| `newParticipant` | Someone joins | `{ participantId, participantName, streams[] }` |
| `streamAdded` | Participant starts sharing | `{ id, type, stream, participantId, participantName }` |
| `streamRemoved` | Participant stops sharing | `{ participantId, streamId, type }` |
| `participantLeft` | Someone leaves | `{ participantId }` |
| `localStreamEnded` | Your stream stopped externally | `{ streamId, type }` |

## Hook API

```typescript
const {
  rtc,           // QuickRTC instance for events
  isConnected,   // boolean
  join,          // ({ conferenceId, participantName }) => Promise
  leave,         // () => Promise
  produce,       // (tracks) => Promise<LocalStream[]>
} = useQuickRTC({ socket, debug?: boolean });
```

## Components

```tsx
<QuickRTCVideo
  stream={mediaStream}
  muted={false}       // Mute audio (use for local video)
  mirror={false}      // Flip horizontally (use for self-view)
  audioOnly={false}   // Render as hidden audio element
  className=""
/>
```

## License

ISC
