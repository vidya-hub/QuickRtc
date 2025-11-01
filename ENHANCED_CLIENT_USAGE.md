# Enhanced ConferenceClient Usage

The `ConferenceClient` has been enhanced to provide better remote stream management with participant information. Here's how to use the new features:

## Key Features

1. **Enhanced `consumeExistingProducers()`** - Returns participant track information
2. **Automatic Remote Stream Creation** - Streams are created on-demand with participant info
3. **Stream Management** - Get remote streams by participant or all streams
4. **Real-time Stream Events** - Listen for stream additions/removals with participant context

## Basic Usage

```typescript
import ConferenceClient from "./ConferenceClient";

// Initialize client
const client = new ConferenceClient(config);

// Set up event listeners BEFORE joining
client.addEventListener("remoteStreamAdded", (event) => {
  const { stream, participantId, participantName, kind } = event.detail;
  console.log(`New ${kind} stream from ${participantName} (${participantId})`);

  // Add to video element
  const videoElement = document.getElementById(`video-${participantId}`);
  if (videoElement && kind === "video") {
    videoElement.srcObject = stream;
  }
});

client.addEventListener("remoteStreamRemoved", (event) => {
  const { participantId, producerId } = event.detail;
  console.log(`Stream removed from ${participantId}`);
});

client.addEventListener("participantStreamsReady", (event) => {
  const { participantId, participantName, streams } = event.detail;
  console.log(`All streams ready for ${participantName}:`, streams);
});

// Join conference
await client.joinConference();

// Enable local media
await client.enableMedia(true, true);

// Consume existing producers and get participant info
const participantTracks = await client.consumeExistingProducers();
console.log("Participants with tracks:", participantTracks);

// Example output:
// [
//   {
//     participantId: "user-123",
//     participantName: "John Doe",
//     tracks: [
//       { producerId: "prod-audio-456", kind: "audio", enabled: true },
//       { producerId: "prod-video-789", kind: "video", enabled: true }
//     ]
//   }
// ]
```

## Advanced Usage

### Get All Remote Streams

```typescript
// Get all current remote streams with detailed info
const remoteStreams = client.getRemoteStreams();

remoteStreams.forEach(({ participantId, participantName, stream, tracks }) => {
  console.log(`Participant: ${participantName}`);
  console.log(`Stream ID: ${stream.id}`);
  console.log(`Tracks: ${tracks.length}`);

  tracks.forEach(({ kind, track, producerId, consumerId }) => {
    console.log(`  - ${kind} track: ${track.id} (producer: ${producerId})`);
  });
});
```

### Get Stream for Specific Participant

```typescript
const participantStream = client.getRemoteStreamForParticipant("user-123");
if (participantStream) {
  // Use the stream
  videoElement.srcObject = participantStream;
}
```

### Manual Producer Consumption

```typescript
// Consume a specific producer with participant info
const consumer = await client.consumeProducer("producer-id", {
  participantId: "user-123",
  participantName: "John Doe",
});
```

## Event Types

### Remote Stream Events

```typescript
// When a new remote stream track is added
type RemoteStreamAdded = {
  stream: MediaStream;
  participantId: string;
  consumerId: string;
  producerId: string;
  kind: "audio" | "video";
};

// When a remote stream track is removed
type RemoteStreamRemoved = {
  participantId: string;
  consumerId: string;
  producerId: string;
};

// When all streams for a participant are ready
type ParticipantStreamsReady = {
  participantId: string;
  participantName: string;
  streams: RemoteStreamData[];
};
```

### Data Types

```typescript
// Participant track information
interface ParticipantTrackInfo {
  participantId: string;
  participantName: string;
  tracks: {
    producerId: string;
    kind: "audio" | "video";
    enabled: boolean;
  }[];
}

// Complete remote stream data
interface RemoteStreamData {
  participantId: string;
  participantName: string;
  stream: MediaStream;
  tracks: {
    producerId: string;
    consumerId: string;
    kind: "audio" | "video";
    track: MediaStreamTrack;
  }[];
}
```

## Migration from Previous Version

If you were using the old `consumeExistingProducers()`:

```typescript
// OLD: Returns void
await client.consumeExistingProducers();

// NEW: Returns participant track information
const participantTracks = await client.consumeExistingProducers();
```

The new version provides the same functionality but with additional return data and better stream management.

## Server Requirements

For optimal functionality, the server should implement:

- `getProducersWithParticipants` endpoint that returns producer info with participant details
- Producer events should include `participantName` in addition to `participantId`
- Consumer data should include participant info in `appData`

If these aren't available, the client will gracefully fall back to the legacy mode.
