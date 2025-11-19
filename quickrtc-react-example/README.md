# QuickRTC React Example

A complete, production-ready video conferencing application built with [QuickRTC React Client](https://github.com/vidyasagar/quickrtc-react-client). This example demonstrates best practices for building scalable WebRTC applications using React and Redux.

## 🌟 Features

- **Real-time Video Conferencing**: Multi-party video calls with low latency.
- **Smart Media Handling**:
  - Automatic quality adjustment
  - Bandwidth optimization
  - Device management (camera/microphone selection)
- **Rich Interactions**:
  - 🎤 Audio mute/unmute
  - 📹 Video on/off
  - 🖥️ Screen sharing
- **State Management**: Powered by Redux Toolkit for predictable state updates.
- **Modern UI**: Responsive layout with grid view for participants.
- **Robust Error Handling**: Graceful handling of network issues and permission errors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A running instance of the **QuickRTC Server** (see `quickrtc_server` directory)

### Installation

1.  Clone the repository (if you haven't already):
    ```bash
    git clone https://github.com/vidyasagar/simple_mediasoup.git
    cd simple_mediasoup/quickrtc-react-example
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    ```

### Configuration

By default, the app connects to `https://localhost:3443`. If your server is running on a different host or port, update the `serverUrl` in `src/App.tsx`:

```typescript
const [serverUrl] = useState("https://your-server-url:port");
```

> **Note**: WebRTC requires a secure context (HTTPS) or localhost. Ensure your server is configured with SSL certificates or use localhost for development.

### Running the App

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

## 🏗️ Project Structure

```
src/
├── components/
│   ├── VideoStream.tsx      # Renders individual video streams (local/remote)
│   ├── Controls.tsx         # Media controls (mute, video, screen share, leave)
│   └── ParticipantList.tsx  # Displays participant info and stats
├── App.tsx                  # Main application logic and layout
├── main.tsx                 # Entry point and Redux provider setup
├── store.ts                 # Redux store configuration with conference slice
└── index.css                # Global styles and utility classes
```

## 💡 Key Concepts Demonstrated

### 1. Redux Integration

The example shows how to integrate `quickrtc-react-client` into a Redux store:

```typescript
// store.ts
import { configureStore } from "@reduxjs/toolkit";
import { conferenceReducer, eventMiddleware } from "quickrtc-react-client";

export const store = configureStore({
  reducer: { conference: conferenceReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["conference/setLocalStream", /* ... */],
        ignoredPaths: ["conference.localStreams", /* ... */],
      },
    }).concat(eventMiddleware),
});
```

### 2. Hook Usage

The `useConference` hook is the central point of interaction:

```typescript
const {
  joinConference,
  produceMedia,
  localStreams,
  remoteParticipants
} = useConference();

// Joining a room
await joinConference({
  conferenceId: "demo-room",
  participantId: "user-1",
  participantName: "Alice",
  socket
});
```

### 3. Media Handling

The app demonstrates how to handle media streams efficiently:

- **Local Streams**: Displayed immediately upon creation.
- **Remote Streams**: Automatically consumed via the `eventMiddleware` and displayed when available.
- **Screen Sharing**: Handled as a separate video track type (`screenshare`).

## 🔧 Troubleshooting

### Certificate Errors
If you are using self-signed certificates on localhost:
1.  Open the server URL (e.g., `https://localhost:3443`) in a separate tab.
2.  Accept the security warning ("Proceed to localhost (unsafe)").
3.  Refresh the React app.

### "Device Not Found"
Ensure your browser has permission to access the camera and microphone. Check the browser's permission settings for the site.

### Connection Failed
1.  Verify the QuickRTC server is running.
2.  Check the browser console for WebSocket connection errors.
3.  Ensure the `serverUrl` matches your server configuration.

## 📦 Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory, ready to be deployed to any static host (Vercel, Netlify, Nginx, etc.).

## 📄 License

ISC
