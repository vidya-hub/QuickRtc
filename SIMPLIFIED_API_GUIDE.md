# Simplified ConferenceClient API Guide

## Overview

The `ConferenceClient` has been completely refactored to provide a clean, simple, and intuitive API for video conferencing. All complex logic is handled internally, exposing only 7 core methods and comprehensive event listeners.

## ✨ Features

- **Simple API**: Only 7 methods to learn
- **Automatic Stream Management**: Automatically consumes streams when participants join
- **Event-Driven**: React to participant changes and media toggles with event listeners
- **Type-Safe**: Full TypeScript support with detailed interfaces
- **Error Handling**: Comprehensive error events and logging

## 🚀 Quick Start

```javascript
import { ConferenceClient } from "/simple_ms_client/dist/client.js";

// 1. Create the client
const client = new ConferenceClient({
  conferenceId: "my-room",
  conferenceName: "My Conference",
  participantId: "unique-id",
  participantName: "John Doe",
  socket: io(window.location.origin),
});

// 2. Setup event listeners (BEFORE joining)
setupEventListeners();

// 3. Join the meeting
await client.joinMeeting();

// 4. Enable media
const localStream = await client.enableMedia(true, true);
videoElement.srcObject = localStream;

// 5. Consume existing participants
await client.consumeExistingStreams();
```

## 📋 The 7 Core Methods

### 1. `joinMeeting()`

Joins the conference and initializes all transports.

```javascript
await client.joinMeeting();
```

**What it does:**

- Connects to the conference server
- Loads MediaSoup device with router capabilities
- Creates send and receive transports
- Sets up internal event listeners

**Throws:** Error if already joined or connection fails

---

### 2. `enableMedia(audio, video)`

Requests user media and creates producers.

```javascript
const stream = await client.enableMedia(true, true); // Both audio and video
// OR
const stream = await client.enableMedia(true, false); // Audio only
```

**Parameters:**

- `audio` (boolean): Enable audio (default: true)
- `video` (boolean): Enable video (default: true)

**Returns:** `MediaStream` - Your local media stream

**What it does:**

- Requests camera/microphone permissions
- Creates audio/video producers
- Broadcasts your media to other participants

**Throws:** Error if called before joining or if media access denied

---

### 3. `consumeExistingStreams()`

Consumes media from all participants already in the conference.

```javascript
await client.consumeExistingStreams();
```

**What it does:**

- Fetches list of current participants
- Creates consumers for each participant's audio/video
- Automatically emits `remoteStreamAdded` events for each stream

**Use case:** Call this after joining to receive existing participants' streams

---

### 4. `stopWatchingStream(participantId)`

Stop receiving media from a specific participant.

```javascript
await client.stopWatchingStream("participant-123");
```

**Parameters:**

- `participantId` (string): ID of participant to stop watching

**What it does:**

- Closes all consumers for that participant
- Removes participant from internal tracking
- Emits `remoteStreamRemoved` events

**Use case:** When user clicks "Stop Watching" button on a participant

---

### 5. `toggleAudio(mute?)`

Toggle local audio on/off.

```javascript
const enabled = await client.toggleAudio(); // Toggle
// OR
await client.toggleAudio(true); // Mute
await client.toggleAudio(false); // Unmute
```

**Parameters:**

- `mute` (boolean, optional): Explicit mute state. If omitted, toggles current state.

**Returns:** `boolean` - New enabled state (true = unmuted, false = muted)

**What it does:**

- Pauses/resumes audio producer
- Disables/enables local audio track
- Notifies server and other participants
- Emits `localAudioToggled` event

---

### 6. `toggleVideo(mute?)`

Toggle local video on/off.

```javascript
const enabled = await client.toggleVideo(); // Toggle
// OR
await client.toggleVideo(true); // Turn off video
await client.toggleVideo(false); // Turn on video
```

**Parameters:**

- `mute` (boolean, optional): Explicit mute state. If omitted, toggles current state.

**Returns:** `boolean` - New enabled state (true = enabled, false = disabled)

**What it does:**

- Pauses/resumes video producer
- Disables/enables local video track
- Notifies server and other participants
- Emits `localVideoToggled` event

---

### 7. Event Listeners (Automatic)

The client automatically sets up event listeners and emits events for UI updates.

**Events are automatically emitted when:**

- Participants join/leave
- Remote streams are added/removed
- Remote participants toggle their audio/video
- Errors occur

See "Event System" section below for details.

---

## 📡 Event System

### Participant Events

#### `participantJoined`

Emitted when a new participant joins.

```javascript
client.addEventListener("participantJoined", (event) => {
  const { participantId, participantName } = event.detail;
  console.log(`${participantName} joined!`);
});
```

**Auto-behavior:** Client automatically starts consuming the new participant's media.

---

#### `participantLeft`

Emitted when a participant leaves.

```javascript
client.addEventListener("participantLeft", (event) => {
  const { participantId } = event.detail;
  console.log(`Participant ${participantId} left`);
  // Remove participant from UI
});
```

**Auto-behavior:** Client automatically cleans up participant's consumers.

---

### Stream Events

#### `remoteStreamAdded`

Emitted when a remote stream is available.

```javascript
client.addEventListener("remoteStreamAdded", (event) => {
  const { participantId, participantName, kind, stream } = event.detail;

  if (kind === "video") {
    videoElement.srcObject = stream;
  } else if (kind === "audio") {
    audioElement.srcObject = stream;
  }
});
```

**Detail properties:**

- `participantId` (string): Participant's unique ID
- `participantName` (string): Participant's display name
- `kind` ("audio" | "video"): Type of media
- `stream` (MediaStream): The actual media stream

---

#### `remoteStreamRemoved`

Emitted when a remote stream is closed.

```javascript
client.addEventListener("remoteStreamRemoved", (event) => {
  const { participantId, kind } = event.detail;
  // Remove stream from UI
});
```

---

### Media Toggle Events

#### `localAudioToggled`

Emitted when your audio is toggled.

```javascript
client.addEventListener("localAudioToggled", (event) => {
  const { enabled } = event.detail;
  updateMicButton(enabled);
});
```

---

#### `localVideoToggled`

Emitted when your video is toggled.

```javascript
client.addEventListener("localVideoToggled", (event) => {
  const { enabled } = event.detail;
  updateCameraButton(enabled);
});
```

---

#### `remoteAudioToggled`

Emitted when a remote participant toggles their audio.

```javascript
client.addEventListener("remoteAudioToggled", (event) => {
  const { participantId, enabled } = event.detail;
  updateRemoteAudioIndicator(participantId, enabled);
});
```

---

#### `remoteVideoToggled`

Emitted when a remote participant toggles their video.

```javascript
client.addEventListener("remoteVideoToggled", (event) => {
  const { participantId, enabled } = event.detail;
  updateRemoteVideoIndicator(participantId, enabled);
});
```

---

### Error Events

#### `error`

Emitted when any error occurs.

```javascript
client.addEventListener("error", (event) => {
  const { message, error } = event.detail;
  console.error("Error:", message, error);
  showErrorNotification(message);
});
```

---

## 🔧 Helper Methods

### `leaveMeeting()`

Cleanup and leave the conference.

```javascript
await client.leaveMeeting();
```

**What it does:**

- Stops all local tracks
- Closes all producers and consumers
- Closes all transports
- Notifies server
- Resets internal state

---

### `getParticipants()`

Get list of all participants in the conference.

```javascript
const participants = await client.getParticipants();
console.log(participants);
// [{ participantId: "...", participantName: "..." }, ...]
```

---

### `getRemoteParticipant(participantId)`

Get a specific remote participant's data.

```javascript
const participant = client.getRemoteParticipant("participant-123");
if (participant) {
  console.log(participant.videoStream);
  console.log(participant.audioStream);
}
```

**Returns:** `RemoteParticipant | undefined`

---

### `getAllRemoteParticipants()`

Get all remote participants.

```javascript
const participants = client.getAllRemoteParticipants();
participants.forEach((p) => {
  console.log(p.participantName, p.videoStream);
});
```

**Returns:** `RemoteParticipant[]`

---

### `isInMeeting()`

Check if currently in a meeting.

```javascript
if (client.isInMeeting()) {
  console.log("In meeting");
}
```

---

### `isLocalMediaEnabled()`

Check if local media is enabled.

```javascript
if (client.isLocalMediaEnabled()) {
  console.log("Media enabled");
}
```

---

### `getLocalStream()`

Get your local media stream.

```javascript
const stream = client.getLocalStream();
if (stream) {
  localVideo.srcObject = stream;
}
```

---

## 💡 Complete Usage Example

```javascript
import { ConferenceClient } from "/simple_ms_client/dist/client.js";

let client = null;

// Setup event listeners
function setupEventListeners() {
  // Participant events
  client.addEventListener("participantJoined", (event) => {
    const { participantName } = event.detail;
    console.log(`🎉 ${participantName} joined!`);
    addParticipantToList(participantName);
  });

  client.addEventListener("participantLeft", (event) => {
    removeParticipantFromUI(event.detail.participantId);
  });

  // Stream events
  client.addEventListener("remoteStreamAdded", (event) => {
    const { participantId, kind, stream } = event.detail;
    displayRemoteStream(participantId, kind, stream);
  });

  client.addEventListener("remoteStreamRemoved", (event) => {
    removeRemoteStream(event.detail.participantId, event.detail.kind);
  });

  // Media toggle events
  client.addEventListener("localAudioToggled", (event) => {
    updateMicButton(event.detail.enabled);
  });

  client.addEventListener("localVideoToggled", (event) => {
    updateCameraButton(event.detail.enabled);
  });

  // Error handling
  client.addEventListener("error", (event) => {
    alert(`Error: ${event.detail.message}`);
  });
}

// Join conference
async function joinConference() {
  const socket = io(window.location.origin);

  client = new ConferenceClient({
    conferenceId: "my-room",
    participantId: generateId(),
    participantName: "User-" + generateId(),
    socket,
  });

  // Setup listeners BEFORE joining
  setupEventListeners();

  try {
    // 1. Join meeting
    await client.joinMeeting();

    // 2. Enable media
    const localStream = await client.enableMedia(true, true);
    document.getElementById("localVideo").srcObject = localStream;

    // 3. Consume existing streams
    await client.consumeExistingStreams();

    console.log("✅ Successfully joined conference!");
  } catch (error) {
    console.error("❌ Failed to join:", error);
  }
}

// Toggle audio
async function toggleAudio() {
  const enabled = await client.toggleAudio();
  console.log(`🎤 Audio ${enabled ? "ON" : "OFF"}`);
}

// Toggle video
async function toggleVideo() {
  const enabled = await client.toggleVideo();
  console.log(`📹 Video ${enabled ? "ON" : "OFF"}`);
}

// Leave meeting
async function leaveConference() {
  await client.leaveMeeting();
  client = null;
  console.log("👋 Left conference");
}
```

---

## 🎯 All Scenarios Covered

### ✅ Joining a Meeting

1. Create client
2. Setup event listeners
3. Call `joinMeeting()`
4. Call `enableMedia()`
5. Call `consumeExistingStreams()`

### ✅ New Participant Joins

1. `participantJoined` event fires
2. Client **automatically** consumes their media
3. `remoteStreamAdded` events fire for their audio/video
4. UI updates to show new participant

### ✅ Participant Leaves

1. `participantLeft` event fires
2. Client **automatically** cleans up consumers
3. `remoteStreamRemoved` events fire
4. UI removes participant

### ✅ Toggling Your Media

1. Call `toggleAudio()` or `toggleVideo()`
2. `localAudioToggled` or `localVideoToggled` event fires
3. Server is notified
4. Other participants receive notification

### ✅ Remote Participant Toggles Media

1. Server sends notification
2. `remoteAudioToggled` or `remoteVideoToggled` event fires
3. UI can update indicator (muted icon, etc.)

### ✅ Stop Watching a Participant

1. Call `client.stopWatchingStream(participantId)`
2. Consumers are closed
3. `remoteStreamRemoved` events fire
4. UI removes participant's video

### ✅ Leaving Meeting

1. Call `leaveMeeting()`
2. All resources cleaned up
3. Server notified
4. UI reset

### ✅ Error Handling

1. Any error occurs
2. `error` event fires with details
3. UI can show error message
4. User can retry or take action

---

## 🎨 UI Integration Tips

### Button States

```javascript
// Update mute button based on state
client.addEventListener("localAudioToggled", (event) => {
  const btn = document.getElementById("muteBtn");
  btn.textContent = event.detail.enabled ? "🔇 Mute" : "🔊 Unmute";
  btn.style.background = event.detail.enabled ? "#dc3545" : "#28a745";
});
```

### Participant List

```javascript
client.addEventListener("participantJoined", (event) => {
  const li = document.createElement("li");
  li.id = `participant-${event.detail.participantId}`;
  li.textContent = event.detail.participantName;
  document.getElementById("participantList").appendChild(li);
});

client.addEventListener("participantLeft", (event) => {
  const li = document.getElementById(
    `participant-${event.detail.participantId}`
  );
  li?.remove();
});
```

### Remote Video Grid

```javascript
client.addEventListener("remoteStreamAdded", (event) => {
  const { participantId, kind, stream } = event.detail;

  if (kind === "video") {
    const video = document.createElement("video");
    video.id = `video-${participantId}`;
    video.srcObject = stream;
    video.autoplay = true;
    document.getElementById("remoteVideos").appendChild(video);
  }
});
```

---

## 🔒 Type Definitions

```typescript
interface ConferenceClientConfig {
  conferenceId: string;
  conferenceName?: string;
  participantId: string;
  participantName: string;
  socket: ClientSocket;
}

interface RemoteParticipant {
  participantId: string;
  participantName: string;
  videoStream?: MediaStream;
  audioStream?: MediaStream;
  videoConsumer?: Consumer;
  audioConsumer?: Consumer;
}

interface ConferenceClientEvents {
  participantJoined: { participantId: string; participantName: string };
  participantLeft: { participantId: string };
  remoteStreamAdded: {
    participantId: string;
    kind: "audio" | "video";
    stream: MediaStream;
  };
  remoteStreamRemoved: { participantId: string; kind: "audio" | "video" };
  localAudioToggled: { enabled: boolean };
  localVideoToggled: { enabled: boolean };
  remoteAudioToggled: { participantId: string; enabled: boolean };
  remoteVideoToggled: { participantId: string; enabled: boolean };
  error: { message: string; error?: any };
}
```

---

## 🚀 Ready to Use!

The ConferenceClient is now completely refactored with:

- ✅ 7 simple, intuitive methods
- ✅ Comprehensive event system
- ✅ Automatic stream management
- ✅ Full type safety
- ✅ Error handling
- ✅ Clean, maintainable code
- ✅ Updated UI with audio/video controls

**No complex logic exposed - just join, enable media, and react to events!**
