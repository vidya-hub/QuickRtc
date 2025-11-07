# QuickRTC React Example

This is a complete example application demonstrating how to use the `quickrtc-react-client` library to build a production-ready video conferencing application.

## Features Demonstrated

- ✅ Join/Leave conference
- ✅ Produce audio and video media
- ✅ Toggle audio on/off (mute/unmute)
- ✅ Toggle video on/off
- ✅ Screen sharing
- ✅ Consume remote participants' streams
- ✅ Display local and remote video
- ✅ Mute remote participants locally
- ✅ Stop watching specific participants
- ✅ Redux state management
- ✅ Clean component architecture
- ✅ Responsive design
- ✅ Error handling

## Prerequisites

1. Make sure the QuickRTC server is running (from `quickrtc_example` directory)
2. Ensure you have Node.js 18+ installed

## Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

## Development

```bash
# Start the development server
npm run dev
# or
pnpm dev
```

The application will be available at `https://localhost:3000` (note: HTTPS is required for WebRTC)

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  ├── components/
  │   ├── VideoStream.tsx      # Component for displaying video streams
  │   ├── Controls.tsx          # Control buttons (audio, video, screen share, leave)
  │   └── ParticipantList.tsx   # Remote participant video/audio display
  ├── App.tsx                   # Main application component
  ├── main.tsx                  # Application entry point
  ├── store.ts                  # Redux store configuration
  └── index.css                 # Global styles
```

## Usage Guide

### 1. Configure Redux Store

```typescript
import { configureStore } from "@reduxjs/toolkit";
import { conferenceReducer, eventMiddleware } from "quickrtc-react-client";

export const store = configureStore({
  reducer: {
    conference: conferenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["conference/setDevice", /* ... */],
        ignoredPaths: ["conference.localStreams", /* ... */],
      },
    }).concat(eventMiddleware),
});
```

### 2. Use the Hook

```typescript
import { useConference } from "quickrtc-react-client";

function MyComponent() {
  const {
    isJoined,
    localStreams,
    remoteParticipants,
    joinConference,
    produceMedia,
    // ... other methods
  } = useConference();

  // Use the hook methods and state
}
```

### 3. Join Conference

```typescript
const socket = io("https://your-server.com");

await joinConference({
  conferenceId: "my-room",
  participantId: "unique-id",
  participantName: "John Doe",
  socket,
});
```

### 4. Produce Media

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
});

await produceMedia({
  audioTrack: stream.getAudioTracks()[0],
  videoTrack: stream.getVideoTracks()[0],
});
```

### 5. Consume Existing Streams

```typescript
await consumeExistingStreams();
```

## Key Features

### Audio/Video Toggle

The example demonstrates proper audio/video toggling by:
- Stopping the stream when muting/turning off
- Creating a new stream when unmuting/turning on
- Properly updating the Redux state

### Screen Sharing

Screen sharing is implemented with:
- MediaDevices.getDisplayMedia API
- Proper handling of user cancellation
- Support for multiple streams (camera + screen share)

### Remote Participant Management

- Automatically consumes new participants' media
- Displays video and audio streams
- Allows muting remote audio locally
- Option to stop watching specific participants

## Browser Support

- Chrome 74+
- Firefox 66+
- Safari 12.1+
- Edge 79+

Note: WebRTC requires HTTPS in production environments.

## Troubleshooting

### Camera/Microphone Permission Issues

Ensure your browser has permission to access camera and microphone. The application requires HTTPS for WebRTC features.

### Connection Issues

1. Verify the server is running
2. Check that the socket.io connection is established
3. Ensure firewall allows WebRTC ports

### Video Not Displaying

1. Check browser console for errors
2. Verify media tracks are being produced
3. Ensure video element is properly mounted

## License

ISC
