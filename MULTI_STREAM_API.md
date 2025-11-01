# Multi-Stream Architecture - API Documentation

## Overview

The ConferenceClient now supports **multiple local streams** instead of just one, allowing clients to:

- Produce multiple audio sources (different microphones, system audio, etc.)
- Produce multiple video sources (camera, screen share, virtual camera, etc.)
- Stop tracks when muting (turns off camera/microphone hardware)
- Track each stream independently with unique IDs

## Key Changes

### 1. Multiple Local Streams

**Before (Single Stream):**

```typescript
private localStream: MediaStream | null = null;
private audioProducer: Producer | null = null;
private videoProducer: Producer | null = null;
```

**After (Multi-Stream):**

```typescript
private localStreams: Map<string, LocalStreamInfo> = new Map();

interface LocalStreamInfo {
  id: string;              // Unique stream ID
  type: LocalStreamType;   // "audio" | "video" | "screenshare"
  track: MediaStreamTrack;
  producer: Producer;
  stream: MediaStream;
}
```

### 2. Produce Media Returns Stream IDs

**Before:**

```typescript
await client.produceMedia(audioTrack, videoTrack); // Returns void
```

**After:**

```typescript
const { audioStreamId, videoStreamId } = await client.produceMedia(
  audioTrack,
  videoTrack
);
// Returns: { audioStreamId?: string; videoStreamId?: string }
```

### 3. Toggle Methods Now Stop/Restart Tracks

**Audio Toggle:**

- **Mute**: Stops the microphone track (turns off mic hardware)
- **Unmute**: Gets a new track from `navigator.mediaDevices.getUserMedia()`

**Video Toggle:**

- **Mute**: Stops the camera track (turns off camera light)
- **Unmute**: Gets a new track from `navigator.mediaDevices.getUserMedia()`

### 4. Toggle Methods Accept Stream IDs

**Before:**

```typescript
await client.toggleAudio(); // Toggles the only audio
await client.toggleVideo(); // Toggles the only video
```

**After:**

```typescript
await client.toggleAudio(streamId); // Toggles specific audio stream
await client.toggleVideo(streamId); // Toggles specific video stream
// If no streamId provided, toggles first stream of that type
```

## New Events

### Local Stream Events

```typescript
// When a local stream is added
client.addEventListener("localStreamAdded", (event) => {
  const { streamId, type, stream } = event.detail;
  // type: "audio" | "video" | "screenshare"

  if (type === "video" || type === "screenshare") {
    // Display in frontend element
    videoElement.srcObject = stream;
  }
  // Audio plays in background automatically
});

// When a local stream is removed
client.addEventListener("localStreamRemoved", (event) => {
  const { streamId, type } = event.detail;
});

// When local audio is toggled
client.addEventListener("localAudioToggled", (event) => {
  const { streamId, enabled } = event.detail;
});

// When local video is toggled
client.addEventListener("localVideoToggled", (event) => {
  const { streamId, enabled } = event.detail;
});
```

## Updated Getter Methods

```typescript
// Get all local streams
const streams: Map<string, LocalStreamInfo> = client.getLocalStreams();

// Get a specific stream by ID
const stream: MediaStream | null = client.getLocalStream(streamId);

// Get streams by type
const videoStreams: LocalStreamInfo[] = client.getLocalStreamsByType("video");
const audioStreams: LocalStreamInfo[] = client.getLocalStreamsByType("audio");
const screenshares: LocalStreamInfo[] =
  client.getLocalStreamsByType("screenshare");
```

## Complete Example Usage

```javascript
// 1. Join the meeting
await client.joinMeeting();

// 2. Produce camera video and microphone audio
const cameraStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
});
const { audioStreamId, videoStreamId } = await client.produceMedia(
  cameraStream.getAudioTracks()[0],
  cameraStream.getVideoTracks()[0],
  "video" // type
);

// 3. Later, add screen share
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
});
const { videoStreamId: screenShareId } = await client.produceMedia(
  undefined, // no audio
  screenStream.getVideoTracks()[0],
  "screenshare" // type
);

// 4. Toggle microphone (stops mic when muted)
await client.toggleAudio(audioStreamId);

// 5. Toggle camera (stops camera when muted)
await client.toggleVideo(videoStreamId);

// 6. Stop screen share
const screenInfo = client.getLocalStream(screenShareId);
if (screenInfo) {
  screenInfo.track.stop();
  await client.socketController.closeProducer(screenInfo.producer.id);
}
```

## Stream Display Strategy

### Audio Streams

- Play in **background** using HTML5 audio elements
- No visual element needed
- Auto-plays when stream is added

### Video/Screenshare Streams

- Display in **frontend** using HTML video elements
- Attach `stream` to `video.srcObject`
- Listen to `localStreamAdded` event to get the stream

### Example HTML Structure

```html
<!-- Local video display -->
<video id="localVideo" autoplay muted playsinline></video>

<!-- Remote participants -->
<div id="remoteStreams">
  <!-- Dynamically created video/audio elements -->
</div>

<!-- Background audio for local mic (optional, usually muted) -->
<audio id="localAudio" autoplay muted></audio>
```

## Benefits

1. **Multiple Sources**: Produce from multiple cameras, mics, screens simultaneously
2. **Hardware Control**: Actually stops camera/mic when muted (privacy)
3. **Flexible Architecture**: Each stream tracked independently
4. **Clean API**: Stream IDs allow precise control
5. **Better UX**: Camera light turns off when video is muted
6. **Extensible**: Easy to add new stream types in the future

## Migration Guide

### Old Code:

```javascript
await client.joinMeeting();
const localStream = await client.enableMedia(true, true);
localVideo.srcObject = localStream;
await client.toggleAudio(); // No stream ID
```

### New Code:

```javascript
await client.joinMeeting();

// Get media from navigator
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
});

// Produce with tracks
const { audioStreamId, videoStreamId } = await client.produceMedia(
  mediaStream.getAudioTracks()[0],
  mediaStream.getVideoTracks()[0]
);

// Listen for stream added event
client.addEventListener("localStreamAdded", (e) => {
  if (e.detail.type === "video") {
    localVideo.srcObject = e.detail.stream;
  }
});

// Toggle with stream ID
await client.toggleAudio(audioStreamId);
```

## Implementation Details

### When Muting (Audio/Video):

1. Pause the producer
2. Disable the track
3. **Stop the track** (releases hardware)
4. Notify server via `pauseProducer`

### When Unmuting (Audio/Video):

1. Request new track from `navigator.mediaDevices.getUserMedia()`
2. Replace track in producer using `producer.replaceTrack()`
3. Update stored track and stream
4. Resume producer
5. Notify server via `resumeProducer`

This ensures hardware (camera/mic) is actually turned off when muted, providing better privacy and battery life.
