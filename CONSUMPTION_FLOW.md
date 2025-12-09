# Participant Video/Audio Consumption Flow

## How It Works

QuickRTC React Client handles participant media consumption **automatically** in most cases. Here's how:

## Automatic Consumption (Event Middleware)

The library includes an **event middleware** that automatically handles:

### 1. When a New Participant Joins

```typescript
// Event: "participantJoined"
// What happens automatically:
// ✅ Participant is added to state
// ✅ Their existing media streams are consumed
// ✅ Video/audio appears in remoteParticipants array
```

### 2. When a Participant Starts Their Camera/Mic

```typescript
// Event: "newProducer"
// What happens automatically:
// ✅ The new stream (audio/video) is consumed
// ✅ remoteParticipants state is updated
// ✅ You see/hear them immediately
```

### 3. When a Participant Stops Their Camera/Mic

```typescript
// Event: "producerClosed"
// What happens automatically:
// ✅ Stream is removed from state
// ✅ Video/audio stops displaying
```

## Manual Consumption (When Needed)

### Consuming Existing Participants on Join

When **you** join a room where others are already present, call `watchAllParticipants()`:

```tsx
const { join, watchAllParticipants } = useQuickRTC();

const handleJoin = async () => {
  const socket = io("https://localhost:3443");

  // 1. Join the room
  await join({
    conferenceId: "room-123",
    participantName: "John",
    socket,
  });

  // 2. Consume existing participants who are already in the room
  await watchAllParticipants();
  // After this, you'll see everyone who was already there
};
```

## Complete Flow Example

```tsx
function VideoRoom() {
  const {
    join,
    toggleAudio,
    toggleVideo,
    watchAllParticipants,
    localStreams,
    remoteParticipants,
  } = useQuickRTC();

  const handleJoin = async () => {
    const socket = io("https://localhost:3443");

    // Step 1: Join the conference
    await join({
      conferenceId: "room-123",
      participantName: "Alice",
      socket,
    });

    // Step 2: Start your own media
    await toggleAudio(); // Your microphone
    await toggleVideo(); // Your camera

    // Step 3: Watch existing participants (people already in room)
    await watchAllParticipants();

    // That's it! From now on:
    // - New joiners are auto-consumed
    // - Their media changes are auto-handled
    // - Everything appears in remoteParticipants automatically
  };

  return (
    <div>
      <button onClick={handleJoin}>Join Room</button>

      {/* Display remote participants */}
      {remoteParticipants.map((participant) => (
        <div key={participant.participantId}>
          <h3>{participant.participantName}</h3>

          {/* Video - automatically updated */}
          {participant.videoStream && (
            <video
              ref={(ref) => ref && (ref.srcObject = participant.videoStream)}
              autoPlay
            />
          )}

          {/* Audio - automatically updated */}
          {participant.audioStream && (
            <audio
              ref={(ref) => ref && (ref.srcObject = participant.audioStream)}
              autoPlay
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

## Timeline Example

Imagine this scenario:

### Room State: Bob is alone in "room-123"

- Bob sees himself (local video)
- `remoteParticipants` array is empty

### Alice joins the room

**Alice's perspective:**

1. Alice calls `join()` → Joins the room
2. Alice calls `watchAllParticipants()` → Sees Bob
3. Alice's `remoteParticipants` = [Bob]

**Bob's perspective:**

1. Event middleware detects `participantJoined` for Alice
2. Automatically consumes Alice's streams
3. Bob's `remoteParticipants` = [Alice]

### Charlie joins the room

**Charlie's perspective:**

1. Charlie calls `join()` → Joins the room
2. Charlie calls `watchAllParticipants()` → Sees Bob and Alice
3. Charlie's `remoteParticipants` = [Bob, Alice]

**Alice and Bob's perspective:**

1. Event middleware detects `participantJoined` for Charlie
2. Automatically consumes Charlie's streams
3. Their `remoteParticipants` arrays now include Charlie

### Bob turns on his camera

**Everyone's perspective:**

1. Event middleware detects `newProducer` (Bob's video)
2. Automatically consumes Bob's video stream
3. Bob's video appears for Alice and Charlie
4. Bob's entry in `remoteParticipants` is updated with `videoStream`

## Summary

| Scenario                       | What to Do                                   | What Happens Automatically                                |
| ------------------------------ | -------------------------------------------- | --------------------------------------------------------- |
| **You join a room**            | Call `watchAllParticipants()` after `join()` | Nothing - you must manually consume existing participants |
| **Someone joins after you**    | Nothing!                                     | ✅ Event middleware auto-consumes their streams           |
| **Someone starts video/audio** | Nothing!                                     | ✅ Event middleware auto-consumes the new stream          |
| **Someone stops video/audio**  | Nothing!                                     | ✅ Event middleware removes the stream                    |
| **Someone leaves**             | Nothing!                                     | ✅ Event middleware removes them from state               |

## Key Takeaway

**You only need to call `watchAllParticipants()` once** - right after joining. Everything else is handled automatically by the event middleware!

```tsx
// This is all you need:
await join({ conferenceId, participantName, socket });
await watchAllParticipants(); // Only needed once!
// ✨ Everything else is automatic ✨
```
