# QuickRTC React Example# QuickRTC React Example

A **minimal, single-file example** showing how to integrate QuickRTC React Client in under 220 lines of code.A complete, production-ready video conferencing application built with [QuickRTC React Client](https://github.com/vidyasagar/quickrtc-react-client). This example demonstrates best practices for building scalable WebRTC applications using React and Redux.

## ✨ Features Demonstrated## 🌟 Features

- ✅ Join/Leave conference- **Real-time Video Conferencing**: Multi-party video calls with low latency.

- ✅ Toggle audio on/off- **Smart Media Handling**:

- ✅ Toggle video on/off - Automatic quality adjustment

- ✅ Screen sharing - Bandwidth optimization

- ✅ Remote participant handling - Device management (camera/microphone selection)

- ✅ Auto-consume remote streams- **Rich Interactions**:

- ✅ Minimal UI with inline styles - 🎤 Audio mute/unmute

  - 📹 Video on/off

## 🚀 Quick Start - 🖥️ Screen sharing

- **State Management**: Powered by Redux Toolkit for predictable state updates.

### 1. Install Dependencies- **Modern UI**: Responsive layout with grid view for participants.

- **Robust Error Handling**: Graceful handling of network issues and permission errors.

```bash

npm install## 🚀 Getting Started

# or

pnpm install### Prerequisites

```

- Node.js 18+

### 2. Start the Server- A running instance of the **QuickRTC Server** (see `quickrtc_server` directory)

Make sure the QuickRTC server is running at `https://localhost:3443`:### Installation

````bash1. Clone the repository (if you haven't already):

cd ../quickrtc_example    ```bash

pnpm dev    git clone https://github.com/vidyasagar/simple_mediasoup.git

```    cd simple_mediasoup/quickrtc-react-example

    ```

### 3. Run the Example

2.  Install dependencies:

```bash    ```bash

npm run dev    npm install

# or    # or

pnpm dev    pnpm install

```    ```



### 4. Accept Certificate### Configuration



Before joining a conference:By default, the app connects to `https://localhost:3443`. If your server is running on a different host or port, update the `serverUrl` in `src/App.tsx`:

1. Visit https://localhost:3443 in your browser

2. Accept the self-signed certificate warning```typescript

3. Return to the example app and joinconst [serverUrl] = useState("https://your-server-url:port");

````

## 📝 Integration Guide

> **Note**: WebRTC requires a secure context (HTTPS) or localhost. Ensure your server is configured with SSL certificates or use localhost for development.

The entire implementation is in `src/App.tsx` (218 lines). Here's the minimal setup:

### Running the App

### Step 1: Wrap with Provider

Start the development server:

````tsx

// src/main.tsx```bash

import { QuickRTCProvider } from 'quickrtc-react-client';npm run dev

````

ReactDOM.createRoot(document.getElementById("root")!).render(

<QuickRTCProvider>The application will be available at `http://localhost:5173` (or the port shown in your terminal).

    <App />

</QuickRTCProvider>## 🏗️ Project Structure

);

````

src/

### Step 2: Use the Hook├── components/

│   ├── VideoStream.tsx      # Renders individual video streams (local/remote)

```tsx│   ├── Controls.tsx         # Media controls (mute, video, screen share, leave)

// src/App.tsx│   └── ParticipantList.tsx  # Displays participant info and stats

import { useQuickRTC } from 'quickrtc-react-client';├── App.tsx                  # Main application logic and layout

import { io } from 'socket.io-client';├── main.tsx                 # Entry point and Redux provider setup

├── store.ts                 # Redux store configuration with conference slice

function App() {└── index.css                # Global styles and utility classes

  const {```

    join,

    leave,## 💡 Key Concepts Demonstrated

    toggleAudio,

    toggleVideo,### 1. Redux Integration

    toggleScreenShare,

    localStreams,The example shows how to integrate `quickrtc-react-client` into a Redux store:

    remoteParticipants,

    hasAudio,```typescript

    hasVideo,// store.ts

    isJoinedimport { configureStore } from "@reduxjs/toolkit";

  } = useQuickRTC();import { conferenceReducer, eventMiddleware } from "quickrtc-react-client";



  const handleJoin = async () => {export const store = configureStore({

    const socket = io("https://localhost:3443");  reducer: { conference: conferenceReducer },

    await join({   middleware: (getDefaultMiddleware) =>

      conferenceId: "room-123",     getDefaultMiddleware({

      participantName: "John",      serializableCheck: {

      socket         ignoredActions: ["conference/setLocalStream", /* ... */],

    });        ignoredPaths: ["conference.localStreams", /* ... */],

    await toggleAudio();  // Start audio      },

    await toggleVideo();  // Start video    }).concat(eventMiddleware),

  };});

```

  return (

    // Your UI here### 2. Hook Usage

  );

}The `useConference` hook is the central point of interaction:

```

```typescript

That's it! No Redux store setup, no complex configuration.const {

  joinConference,

## 🎯 API Reference  produceMedia,

  localStreams,

### `useQuickRTC()` Hook  remoteParticipants

} = useConference();

#### State

- `isJoined: boolean` - Conference join status// Joining a room

- `isConnecting: boolean` - Connection in progressawait joinConference({

- `localStreams: LocalStreamInfo[]` - Your local media streams  conferenceId: "demo-room",

- `remoteParticipants: RemoteParticipant[]` - Other participants  participantId: "user-1",

- `error: string | null` - Error message if any  participantName: "Alice",

- `hasAudio: boolean` - Local audio enabled  socket

- `hasVideo: boolean` - Local video enabled});

- `hasScreenShare: boolean` - Screen share active```



#### Actions### 3. Media Handling

- `join(options)` - Join a conference

- `leave()` - Leave the conferenceThe app demonstrates how to handle media streams efficiently:

- `toggleAudio()` - Toggle audio on/off

- `toggleVideo()` - Toggle video on/off- **Local Streams**: Displayed immediately upon creation.

- `toggleScreenShare()` - Toggle screen share- **Remote Streams**: Automatically consumed via the `eventMiddleware` and displayed when available.

- `enableAudio()` - Turn audio on- **Screen Sharing**: Handled as a separate video track type (`screenshare`).

- `disableAudio()` - Turn audio off

- `enableVideo()` - Turn video on## 🔧 Troubleshooting

- `disableVideo()` - Turn video off

- `watchAllParticipants()` - Consume all remote streams### Certificate Errors

If you are using self-signed certificates on localhost:

## 📦 What's Included1.  Open the server URL (e.g., `https://localhost:3443`) in a separate tab.

2.  Accept the security warning ("Proceed to localhost (unsafe)").

- `src/App.tsx` - Complete example in one file (218 lines)3.  Refresh the React app.

- `src/main.tsx` - Simple provider setup (12 lines)

- No separate components directory needed### "Device Not Found"

- No Redux store configuration neededEnsure your browser has permission to access the camera and microphone. Check the browser's permission settings for the site.

- Inline styles for minimal dependencies

### Connection Failed

## 🔧 Customization1.  Verify the QuickRTC server is running.

2.  Check the browser console for WebSocket connection errors.

The example uses inline styles for simplicity. For production:3.  Ensure the `serverUrl` matches your server configuration.



1. Replace inline styles with your CSS framework (Tailwind, MUI, etc.)## 📦 Building for Production

2. Extract components if needed for your app structure

3. Add error handling and loading statesTo create a production build:

4. Customize the UI to match your design

```bash

## 📚 Full Documentationnpm run build

```

See the [main README](../README.md) for complete API documentation and advanced usage.

The output will be in the `dist` directory, ready to be deployed to any static host (Vercel, Netlify, Nginx, etc.).

## 💡 Tips

## 📄 License

- Always call `watchAllParticipants()` after joining to see remote participants

- Handle `connect_error` events for better UXISC

- The hook manages all Redux state internally - you don't need to know Redux
- For custom state management, use the advanced API exports
````
