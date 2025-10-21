/**
 * SimpleClient Usage Examples
 *
 * This file demonstrates how to use the SimpleClient for easy WebRTC communication
 */

import {
  SimpleClient,
  SimpleClientConfig,
  SimpleClientEvents,
} from "../src/client";

// Basic configuration
const config: SimpleClientConfig = {
  serverUrl: "http://localhost:3000",
  enableAudio: true,
  enableVideo: true,
  autoConsume: true, // Automatically receive remote streams
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Create client instance
const client = new SimpleClient(config);

/**
 * Example 1: Basic Video Call Setup
 */
async function basicVideoCall() {
  try {
    // Connect to conference
    await client.connect("conference-123", "John Doe");

    console.log("Connected to conference!");
    console.log("Connection info:", client.getConnectionInfo());
  } catch (error) {
    console.error("Failed to connect:", error);
  }
}

/**
 * Example 2: Complete Event Handling Setup
 */
function setupEventHandlers() {
  // Connection events
  client.on("connected", (event) => {
    console.log("✅ Connected to conference:", event.detail.connection);
    displayMessage("Connected to conference!");
  });

  client.on("disconnected", (event) => {
    console.log("❌ Disconnected from conference:", event.detail.reason);
    displayMessage("Disconnected from conference");
  });

  client.on("error", (event) => {
    console.error("🚨 Error occurred:", event.detail.error.message);
    displayError(`Error: ${event.detail.error.message}`);
  });

  // Participant events
  client.on("participantJoined", (event) => {
    console.log("👋 Participant joined:", event.detail.participant);
    displayMessage(`${event.detail.participant.name} joined the conference`);
    updateParticipantsList();
  });

  client.on("participantLeft", (event) => {
    console.log("👋 Participant left:", event.detail.participant);
    displayMessage(`${event.detail.participant.name} left the conference`);
    updateParticipantsList();
  });

  // Media stream events
  client.on("localStreamReady", (event) => {
    console.log("📹 Local stream ready");
    displayLocalVideo(event.detail.stream);
  });

  client.on("remoteStreamAdded", (event) => {
    console.log("📹 Remote stream added:", event.detail.stream);
    displayRemoteVideo(event.detail.stream);
  });

  client.on("remoteStreamRemoved", (event) => {
    console.log("📹 Remote stream removed:", event.detail);
    removeRemoteVideo(event.detail.streamId);
  });

  // Audio/Video mute events
  client.on("audioMuted", (event) => {
    const { participantId, isLocal } = event.detail;
    console.log(`🔇 Audio muted - ${isLocal ? "You" : participantId}`);
    updateMuteButton("audio", true, isLocal);
  });

  client.on("audioUnmuted", (event) => {
    const { participantId, isLocal } = event.detail;
    console.log(`🔊 Audio unmuted - ${isLocal ? "You" : participantId}`);
    updateMuteButton("audio", false, isLocal);
  });

  client.on("videoMuted", (event) => {
    const { participantId, isLocal } = event.detail;
    console.log(`📵 Video muted - ${isLocal ? "You" : participantId}`);
    updateMuteButton("video", true, isLocal);
  });

  client.on("videoUnmuted", (event) => {
    const { participantId, isLocal } = event.detail;
    console.log(`📹 Video unmuted - ${isLocal ? "You" : participantId}`);
    updateMuteButton("video", false, isLocal);
  });

  // Screen sharing events
  client.on("screenShareStarted", (event) => {
    console.log("🖥️ Screen sharing started:", event.detail.participantId);
    if (event.detail.stream) {
      displayScreenShare(event.detail.stream);
    }
  });

  client.on("screenShareStopped", (event) => {
    console.log("🖥️ Screen sharing stopped:", event.detail.participantId);
    hideScreenShare();
  });
}

/**
 * Example 3: UI Integration Functions
 */

// Join conference with UI
async function joinConference() {
  const conferenceId = (
    document.getElementById("conferenceId") as HTMLInputElement
  )?.value;
  const participantName = (
    document.getElementById("participantName") as HTMLInputElement
  )?.value;

  if (!conferenceId || !participantName) {
    alert("Please enter conference ID and your name");
    return;
  }

  try {
    setupEventHandlers();
    await client.connect(conferenceId, participantName);
  } catch (error) {
    console.error("Failed to join conference:", error);
    alert("Failed to join conference");
  }
}

// Toggle audio with UI feedback
async function toggleAudio() {
  try {
    const isMuted = await client.toggleAudio();
    const button = document.getElementById("audioToggle");
    if (button) {
      button.textContent = isMuted ? "🔇 Unmute" : "🔊 Mute";
      button.className = isMuted ? "btn-danger" : "btn-success";
    }
  } catch (error) {
    console.error("Failed to toggle audio:", error);
  }
}

// Toggle video with UI feedback
async function toggleVideo() {
  try {
    const isMuted = await client.toggleVideo();
    const button = document.getElementById("videoToggle");
    if (button) {
      button.textContent = isMuted ? "📵 Start Video" : "📹 Stop Video";
      button.className = isMuted ? "btn-danger" : "btn-success";
    }
  } catch (error) {
    console.error("Failed to toggle video:", error);
  }
}

// Start screen sharing
async function startScreenShare() {
  try {
    const stream = await client.startScreenShare();
    if (stream) {
      displayScreenShare(stream);
    }
  } catch (error) {
    console.error("Failed to start screen share:", error);
    alert("Screen sharing failed. Please check permissions.");
  }
}

// Leave conference
async function leaveConference() {
  try {
    await client.disconnect();
    clearAllVideos();
    updateUI("disconnected");
  } catch (error) {
    console.error("Failed to leave conference:", error);
  }
}

/**
 * UI Helper Functions
 */

function displayLocalVideo(stream: MediaStream) {
  const video = document.getElementById("localVideo") as HTMLVideoElement;
  if (video) {
    video.srcObject = stream;
    video.muted = true; // Always mute local video to prevent feedback
    video.play();
  }
}

function displayRemoteVideo(streamInfo: any) {
  const container = document.getElementById("remoteVideos");
  if (!container) return;

  const videoElement = document.createElement("video");
  videoElement.id = `remote-${streamInfo.streamId}`;
  videoElement.srcObject = streamInfo.stream;
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.className = "remote-video";

  const wrapper = document.createElement("div");
  wrapper.className = "video-wrapper";
  wrapper.appendChild(videoElement);

  const label = document.createElement("div");
  label.className = "video-label";
  label.textContent = `Participant ${streamInfo.participantId}`;
  wrapper.appendChild(label);

  container.appendChild(wrapper);
}

function removeRemoteVideo(streamId: string) {
  const video = document.getElementById(`remote-${streamId}`);
  if (video && video.parentElement) {
    video.parentElement.remove();
  }
}

function displayScreenShare(stream: MediaStream) {
  const video = document.getElementById("screenShare") as HTMLVideoElement;
  if (video) {
    video.srcObject = stream;
    video.play();
    video.style.display = "block";
  }
}

function hideScreenShare() {
  const video = document.getElementById("screenShare") as HTMLVideoElement;
  if (video) {
    video.style.display = "none";
    video.srcObject = null;
  }
}

function updateParticipantsList() {
  const participants = client.getParticipants();
  const list = document.getElementById("participantsList");
  if (list) {
    list.innerHTML = participants
      .map((p) => `<li>${p.name} ${p.isLocal ? "(You)" : ""}</li>`)
      .join("");
  }
}

function updateMuteButton(
  type: "audio" | "video",
  isMuted: boolean,
  isLocal: boolean
) {
  if (!isLocal) return; // Only update UI for local user

  const button = document.getElementById(`${type}Toggle`);
  if (button) {
    if (type === "audio") {
      button.textContent = isMuted ? "🔇 Unmute" : "🔊 Mute";
    } else {
      button.textContent = isMuted ? "📵 Start Video" : "📹 Stop Video";
    }
    button.className = isMuted ? "btn-danger" : "btn-success";
  }
}

function displayMessage(message: string) {
  const messages = document.getElementById("messages");
  if (messages) {
    const div = document.createElement("div");
    div.className = "message";
    div.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
}

function displayError(error: string) {
  const messages = document.getElementById("messages");
  if (messages) {
    const div = document.createElement("div");
    div.className = "message error";
    div.textContent = `${new Date().toLocaleTimeString()}: ${error}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
}

function clearAllVideos() {
  const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
  if (localVideo) {
    localVideo.srcObject = null;
  }

  const remoteContainer = document.getElementById("remoteVideos");
  if (remoteContainer) {
    remoteContainer.innerHTML = "";
  }

  hideScreenShare();
}

function updateUI(state: "connected" | "disconnected") {
  const joinBtn = document.getElementById("joinBtn");
  const leaveBtn = document.getElementById("leaveBtn");
  const controls = document.getElementById("controls");

  if (state === "connected") {
    if (joinBtn) joinBtn.style.display = "none";
    if (leaveBtn) leaveBtn.style.display = "inline-block";
    if (controls) controls.style.display = "block";
  } else {
    if (joinBtn) joinBtn.style.display = "inline-block";
    if (leaveBtn) leaveBtn.style.display = "none";
    if (controls) controls.style.display = "none";
  }
}

/**
 * Example 4: Advanced Usage - Custom Error Handling
 */
function setupAdvancedErrorHandling() {
  client.on("error", (event) => {
    const { error, code } = event.detail;

    switch (code) {
      case "CONNECTION_FAILED":
        displayError(
          "Unable to connect to server. Please check your internet connection."
        );
        break;
      case "MEDIA_ACCESS_FAILED":
        displayError(
          "Camera/microphone access denied. Please check permissions."
        );
        break;
      case "AUDIO_TOGGLE_FAILED":
        displayError("Failed to toggle audio. Please try again.");
        break;
      case "VIDEO_TOGGLE_FAILED":
        displayError("Failed to toggle video. Please try again.");
        break;
      case "SCREEN_SHARE_FAILED":
        displayError("Screen sharing failed. Feature may not be supported.");
        break;
      default:
        displayError(`An error occurred: ${error.message}`);
    }
  });
}

// Export functions for global access (if needed for HTML onclick handlers)
if (typeof window !== "undefined") {
  (window as any).joinConference = joinConference;
  (window as any).toggleAudio = toggleAudio;
  (window as any).toggleVideo = toggleVideo;
  (window as any).startScreenShare = startScreenShare;
  (window as any).leaveConference = leaveConference;
}
