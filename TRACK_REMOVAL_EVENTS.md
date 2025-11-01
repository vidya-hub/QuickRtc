# Track Removal Events Implementation

## Overview

Implemented real-time notifications to all participants when a user removes or stops their media tracks (audio, video, or screen share).

## Changes Made

### 1. Type Definitions (`simple_ms_types`)

**File:** `src/socket_client.ts`

Added `kind` field to `ProducerClosedData` interface:

```typescript
export interface ProducerClosedData {
  participantId: string;
  producerId: string;
  kind: "audio" | "video"; // NEW: Identifies which media type was removed
}
```

**File:** `src/core.ts`

Updated `Conference` interface to return media kind:

```typescript
closeProducer(
  participantId: string,
  producerId: string
): Promise<"audio" | "video" | null>;
```

### 2. Server Updates

#### Participant Model (`simple_ms_server/src/models/participant.ts`)

Modified `removeProducer()` to return the media kind:

```typescript
removeProducer(producerId: string): "audio" | "video" | null {
  const userProducers = this.producers.get(this.id);
  if (userProducers && userProducers[producerId]) {
    const producer = userProducers[producerId];
    const mediaState = this.getMediaState(producerId);
    const kind = mediaState?.kind || (producer.kind as "audio" | "video");

    producer.close();
    delete userProducers[producerId];
    this.producers.set(this.id, userProducers);
    this.updateMediaState(producerId, { closed: true });

    return kind;  // Return the media type
  }
  return null;
}
```

#### Conference Model (`simple_ms_server/src/models/conference.ts`)

Updated to propagate the kind:

```typescript
async closeProducer(
  participantId: string,
  producerId: string
): Promise<"audio" | "video" | null> {
  const participant = this.getParticipant(participantId) as MediasoupParticipant;
  if (!participant) {
    throw new Error("Participant does not exist in the conference");
  }
  return participant.removeProducer(producerId);  // Return kind
}
```

#### MediasoupController (`simple_ms_server/src/controllers/MediasoupController.ts`)

Enhanced to include kind in event logs:

```typescript
async closeProducer(params: {
  conferenceId: string;
  participantId: string;
  producerId: string;
}): Promise<"audio" | "video" | null> {
  const { conferenceId, participantId, producerId } = params;
  const conference = this.conferences.get(conferenceId);
  if (!conference) {
    throw new Error("Conference does not exist");
  }
  const kind = await conference.closeProducer(participantId, producerId);

  this.emit("producerClosed", {
    conferenceId,
    participantId,
    producerId,
    kind,  // Include kind in event
  });

  console.log(`📹 Producer closed: ${producerId} for participant ${participantId}`);
  console.log(`[${new Date().toISOString()}] 🎭 Media kind: ${kind}`);

  return kind;
}
```

#### SocketController (`simple_ms_server/src/controllers/SocketController.ts`)

Updated to broadcast kind to all participants:

```typescript
private async closeProducer(
  socketEventData: ProducerControlRequest,
  callback: (response: SocketResponse) => void
) {
  const { extraData, conferenceId, participantId } = socketEventData;
  const { producerId } = extraData || {};

  if (!producerId) {
    callback({ status: "error", error: "Missing producerId" });
    return;
  }

  try {
    const kind = await this.mediasoupController?.closeProducer({
      conferenceId,
      participantId,
      producerId,
    });
    callback({ status: "ok" });

    const producerClosedData: ProducerClosedData = {
      participantId,
      producerId,
      kind: kind || "video",  // Include kind in broadcast
    };

    // Broadcast to all other participants in the room
    this.mediasoupSocket
      .to(conferenceId)
      .emit("producerClosed", producerClosedData);
    this.emit("producerClosed", producerClosedData);
  } catch (error) {
    console.error("Error closing producer:", error);
    callback({ status: "error", error: (error as Error).message });
  }
}
```

### 3. Client Updates (`simple_ms_client/src/mediasoup/ConferenceClient.ts`)

Enhanced `producerClosed` event listener to properly handle track removal:

```typescript
// Producer closed
this.socketController.addEventListener("producerClosed", ((
  event: CustomEvent
) => {
  const { producerId, participantId, kind } = event.detail;
  console.log(
    `Producer closed: ${producerId} (${kind}) from participant ${participantId}`
  );

  // Find and close the corresponding consumer
  const participant = this.remoteParticipants.get(participantId);
  if (!participant) {
    return;
  }

  // Close the appropriate consumer based on kind
  if (kind === "audio" && participant.audioConsumer) {
    participant.audioConsumer.close();
    participant.audioConsumer = undefined;
    participant.audioStream = undefined;

    // Emit event for UI to remove audio
    this.dispatchEvent(
      new CustomEvent("remoteStreamRemoved", {
        detail: { participantId, kind: "audio" },
      })
    );
  } else if (kind === "video" && participant.videoConsumer) {
    participant.videoConsumer.close();
    participant.videoConsumer = undefined;
    participant.videoStream = undefined;

    // Emit event for UI to remove video
    this.dispatchEvent(
      new CustomEvent("remoteStreamRemoved", {
        detail: { participantId, kind: "video" },
      })
    );
  }

  // If both consumers are closed, remove the participant
  if (!participant.audioConsumer && !participant.videoConsumer) {
    this.remoteParticipants.delete(participantId);
  }
}) as EventListener);
```

## Event Flow

```
User A stops their camera/mic/screenshare
    ↓
Client calls stopLocalStream(streamId) or toggleAudio/toggleVideo
    ↓
Client sends 'closeProducer' to server
    ↓
Server closes the producer and gets media kind (audio/video)
    ↓
Server broadcasts 'producerClosed' event with {participantId, producerId, kind}
    ↓
All other participants receive the event
    ↓
Each client closes their corresponding consumer
    ↓
Each client emits 'remoteStreamRemoved' event
    ↓
UI removes the media element (audio/video player)
```

## Usage in Frontend (`script.js`)

The existing `remoteStreamRemoved` event listener will automatically handle the UI updates:

```javascript
client.addEventListener("remoteStreamRemoved", (event) => {
  const { participantId, kind } = event.detail;
  console.log("❌ Remote stream removed:", participantId, kind);
  removeParticipantStream(participantId, kind);
});
```

## Benefits

1. **Real-time Updates**: All participants immediately see when someone stops their camera, mic, or screen share
2. **Proper Cleanup**: Consumers are properly closed, preventing memory leaks
3. **UI Synchronization**: Remote video/audio elements are automatically removed from the UI
4. **Type Safety**: All events include the media kind, making it clear what was removed
5. **Resource Management**: Proper cleanup of WebRTC connections

## Testing

To test:

1. Join a conference with multiple participants
2. Turn off video/audio or stop screen sharing
3. Other participants should see the media element disappear immediately
4. Check browser console for log messages confirming the event flow

## Notes

- Screen share is treated as "video" kind
- When a participant disconnects, all their producers are closed with kind information
- The system handles both explicit track stopping and implicit cleanup on disconnect
