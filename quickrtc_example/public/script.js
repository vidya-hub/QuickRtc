import { ConferenceClient } from "https://cdn.jsdelivr.net/npm/quickrtc-client@1.0.1/dist/client.min.js";

// Global state
let client = null;
let remoteParticipants = new Map(); // Track participant media elements
let localAudioStreamId = null; // Track audio stream ID
let localVideoStreamId = null; // Track video stream ID
let localScreenShareId = null; // Track screen share stream ID

// DOM elements
let elements = {};

document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements
  elements = {
    joinButton: document.getElementById("joinButton"),
    leaveButton: document.getElementById("leaveButton"),
    toggleAudioButton: document.getElementById("toggleAudioButton"),
    toggleVideoButton: document.getElementById("toggleVideoButton"),
    shareScreenButton: document.getElementById("shareScreenButton"),
    localVideo: document.getElementById("localVideo"),
    partList: document.getElementById("partList"),
    remoteStreams: document.getElementById("remoteStreams"),
    details: document.getElementById("details"),
  };

  elements.joinButton.addEventListener("click", handleJoinConference);
  elements.leaveButton.addEventListener("click", handleLeaveConference);
  elements.toggleAudioButton.addEventListener("click", handleToggleAudio);
  elements.toggleVideoButton.addEventListener("click", handleToggleVideo);
  elements.shareScreenButton.addEventListener("click", handleShareScreen);
});

// Main conference join handler
async function handleJoinConference() {
  const socket = io(window.location.origin);

  // Create conference client
  client = new ConferenceClient({
    conferenceId: "my-room",
    conferenceName: "My Conference",
    participantId: generateId(),
    participantName: generateId(),
    socket,
  });

  // Update UI with participant details
  elements.details.innerText = `Participant Name: ${client.config.participantName}\nParticipant ID: ${client.config.participantId}`;

  // Set up event listeners BEFORE joining
  setupEventListeners();

  try {
    // Join conference
    await client.joinMeeting();
    console.log("Joined conference successfully");

    await produceMedia();

    // Get all local streams to display in UI
    const localStreams = client.getLocalStreams();
    for (const streamInfo of localStreams) {
      // Prioritize screenshare, then video
      if (streamInfo.type === "screenshare" && elements.localVideo) {
        elements.localVideo.srcObject = streamInfo.stream;
        break;
      } else if (streamInfo.type === "video" && elements.localVideo) {
        elements.localVideo.srcObject = streamInfo.stream;
      }
    }

    // Consume existing participants' streams
    await client.consumeExistingStreams();
    console.log("✓ Consumed existing streams");

    // Update UI
    elements.joinButton.disabled = true;
    elements.joinButton.style.display = "none";
    elements.leaveButton.style.display = "inline-block";
    elements.toggleAudioButton.style.display = "inline-block";
    elements.toggleVideoButton.style.display = "inline-block";
    elements.shareScreenButton.style.display = "inline-block";

    console.log("Successfully joined conference");
  } catch (error) {
    console.error("Error joining conference:", error);
    elements.joinButton.disabled = false;
    elements.details.innerText = `Error: ${error.message}`;
  }
}
async function produceMedia() {
  // Get user media from navigator
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });

  // Extract tracks and produce them
  const audioTrack = mediaStream.getAudioTracks()[0];
  const videoTrack = mediaStream.getVideoTracks()[0];

  const streamIds = await client.produceMedia(audioTrack, videoTrack);
  localAudioStreamId = streamIds.audioStreamId;
  localVideoStreamId = streamIds.videoStreamId;

  console.log("Media produced successfully", streamIds);
}

// Handle leave conference
async function handleLeaveConference() {
  try {
    if (client) {
      await client.leaveMeeting();
      console.log("Left conference successfully");
    }
  } catch (error) {
    console.error("Error leaving conference:", error);
  } finally {
    cleanup();
    elements.joinButton.style.display = "inline-block";
    elements.leaveButton.style.display = "none";
    elements.toggleAudioButton.style.display = "none";
    elements.toggleVideoButton.style.display = "none";
    elements.shareScreenButton.style.display = "none";
    elements.details.innerText = "MediaSoup Conference Client";
    client = null;
    localAudioStreamId = null;
    localVideoStreamId = null;
    localScreenShareId = null;
  }
}

// Handle toggle audio
async function handleToggleAudio() {
  if (!client) return;

  try {
    // Check if audio stream exists
    const hasAudio = localAudioStreamId !== null;

    if (hasAudio) {
      // Mute: stop the audio stream
      await client.toggleAudio(localAudioStreamId, true);
      localAudioStreamId = null;
      elements.toggleAudioButton.textContent = "🔊 Unmute Audio";
      elements.toggleAudioButton.style.background = "#28a745";
    } else {
      // Unmute: create new audio stream
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const audioTrack = audioStream.getAudioTracks()[0];
      const { audioStreamId } = await client.produceMedia(audioTrack);
      localAudioStreamId = audioStreamId;
      elements.toggleAudioButton.textContent = "� Mute Audio";
      elements.toggleAudioButton.style.background = "#dc3545";
    }
  } catch (error) {
    console.error("Error toggling audio:", error);
    alert("Failed to toggle audio: " + error.message);
  }
}

// Handle toggle video
async function handleToggleVideo() {
  if (!client) return;

  try {
    // Check if video stream exists
    const hasVideo = localVideoStreamId !== null;

    if (hasVideo) {
      // Turn off: stop the video stream
      await client.toggleVideo(localVideoStreamId, true);
      localVideoStreamId = null;
      elements.toggleVideoButton.textContent = "📷 Turn On Video";
      elements.toggleVideoButton.style.background = "#28a745";

      // Clear local video display if no screenshare
      if (!localScreenShareId && elements.localVideo) {
        elements.localVideo.srcObject = null;
      }
    } else {
      // Turn on: create new video stream
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      const { videoStreamId } = await client.produceMedia(
        undefined,
        videoTrack,
        "video"
      );
      localVideoStreamId = videoStreamId;
      elements.toggleVideoButton.textContent = "� Turn Off Video";
      elements.toggleVideoButton.style.background = "#dc3545";

      // Update local video display if no screenshare
      if (!localScreenShareId) {
        const localStream = client.getLocalStream(videoStreamId);
        if (localStream && elements.localVideo) {
          elements.localVideo.srcObject = localStream;
        }
      }
    }
  } catch (error) {
    console.error("Error toggling video:", error);
    alert("Failed to toggle video: " + error.message);
  }
}

// Handle share screen
async function handleShareScreen() {
  if (!client) return;

  try {
    // If already sharing, stop it
    if (localScreenShareId) {
      await client.stopLocalStream(localScreenShareId);
      localScreenShareId = null;
      elements.shareScreenButton.textContent = "🖥️ Share Screen";
      elements.shareScreenButton.style.background = "#007bff";
      return;
    }

    // Start screen share
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    // Handle when user stops sharing via browser UI
    screenTrack.onended = () => {
      localScreenShareId = null;
      elements.shareScreenButton.textContent = "🖥️ Share Screen";
      elements.shareScreenButton.style.background = "#007bff";
    };

    const { videoStreamId } = await client.produceMedia(
      undefined,
      screenTrack,
      "screenshare"
    );

    localScreenShareId = videoStreamId;
    elements.shareScreenButton.textContent = "⏹️ Stop Sharing";
    elements.shareScreenButton.style.background = "#dc3545";

    console.log("Screen share started:", videoStreamId);
  } catch (error) {
    console.error("Error sharing screen:", error);
    if (error.name === "NotAllowedError") {
      console.log("Screen share permission denied");
    }
  }
}

// Set up event listeners for client events
function setupEventListeners() {
  // 7. Participant joined event listener
  client.addEventListener("participantJoined", (event) => {
    const { participantId, participantName } = event.detail;
    console.log("🎉 New participant joined:", participantName, participantId);
    addParticipantToList(participantName, participantId);
  });

  // Remote stream added (automatically triggered when consuming)
  client.addEventListener("remoteStreamAdded", (event) => {
    const { participantId, participantName, kind, stream } = event.detail;
    console.log("📺 Remote stream added:", participantName, kind);
    handleRemoteStream(participantId, participantName, kind, stream);
  });

  // Participant left
  client.addEventListener("participantLeft", (event) => {
    const { participantId } = event.detail;
    console.log("👋 Participant left:", participantId);
    removeParticipant(participantId);
  });

  // Remote stream removed
  client.addEventListener("remoteStreamRemoved", (event) => {
    const { participantId, kind } = event.detail;
    console.log("❌ Remote stream removed:", participantId, kind);

    // Get participant name for better alert message
    const participant = client.getRemoteParticipant(participantId);
    const participantName =
      participant?.participantName || participantId.substring(0, 8);
    console.log(`❌ ${participantName} stopped sharing ${kind}`);

    // Show alert based on media type
    // if (kind === "audio") {
    //   // alert(`🔇 ${participantName} stopped sharing audio`);
    // } else if (kind === "video") {
    //   // alert(`📹 ${participantName} stopped sharing video`);
    // }

    removeParticipantStream(participantId, kind);
  });

  // Local media toggle events
  client.addEventListener("localAudioToggled", (event) => {
    const { streamId, enabled } = event.detail;
    console.log(
      "🎤 Local audio:",
      enabled ? "ON" : "OFF",
      "StreamID:",
      streamId
    );
  });

  // Local stream added - for displaying video/screenshare
  client.addEventListener("localStreamAdded", (event) => {
    const { streamId, type, stream } = event.detail;
    console.log("➕ Local stream added:", type, "StreamID:", streamId);

    // For video and screenshare, display in the local video element
    if (type === "video" || type === "screenshare") {
      if (elements.localVideo) {
        elements.localVideo.srcObject = stream;
      }
    }
    // For audio, it plays in background (no visual element needed)
  });

  // Local stream removed
  client.addEventListener("localStreamRemoved", (event) => {
    const { streamId, type } = event.detail;
    console.log("➖ Local stream removed:", type, "StreamID:", streamId);
  });

  client.addEventListener("localVideoToggled", (event) => {
    const { streamId, enabled } = event.detail;
    console.log(
      "📹 Local video:",
      enabled ? "ON" : "OFF",
      "StreamID:",
      streamId
    );

    // Update local video display with new stream when re-enabled
    // Only if no screenshare is active
    if (enabled && !localScreenShareId) {
      const localStream = client.getLocalStream(streamId);
      if (localStream && elements.localVideo) {
        elements.localVideo.srcObject = localStream;
      }
    }
  });

  // Error events
  client.addEventListener("error", (event) => {
    console.error("❌ Client error:", event.detail.message);
    // alert(`Error: ${event.detail.message}`);
  });
}

// Handle remote stream (video or audio)
function handleRemoteStream(participantId, participantName, kind, stream) {
  const participantContainer = getOrCreateParticipantContainer(
    participantId,
    participantName
  );

  if (kind === "video") {
    let videoEl = participantContainer.querySelector(".video-element");
    if (!videoEl) {
      videoEl = createVideoElement(participantId);
      participantContainer.appendChild(videoEl);
    }
    videoEl.srcObject = stream;
  } else if (kind === "audio") {
    let audioEl = participantContainer.querySelector(".audio-element");
    if (!audioEl) {
      audioEl = createAudioElement(participantId);
      participantContainer.appendChild(audioEl);
    }
    audioEl.srcObject = stream;
  }
}

// Create or get participant container
function getOrCreateParticipantContainer(participantId, participantName) {
  let container = document.getElementById(`participant-${participantId}`);

  if (!container) {
    container = document.createElement("div");
    container.id = `participant-${participantId}`;
    container.className = "participant-container";
    container.style.cssText = `
      position: relative;
      display: inline-block;
      margin: 10px;
      border: 2px solid #ccc;
      border-radius: 8px;
      padding: 5px;
      background: #f9f9f9;
    `;

    // Add participant label
    const label = document.createElement("div");
    label.className = "participant-label";
    label.textContent =
      participantName || `Participant ${participantId.substring(0, 8)}...`;
    label.style.cssText = `
      position: absolute;
      top: -10px;
      left: 5px;
      background: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      color: #333;
      border: 1px solid #ccc;
    `;
    container.appendChild(label);

    // Add stop watching button (4. can be able to not watch the stream)
    const stopButton = document.createElement("button");
    stopButton.className = "stop-watching-btn";
    stopButton.textContent = "👁️ Stop Watching";
    stopButton.style.cssText = `
      position: absolute;
      top: -10px;
      right: 5px;
      background: #dc3545;
      color: white;
      border: none;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      z-index: 10;
    `;
    stopButton.addEventListener("click", async () => {
      if (client) {
        await client.stopWatchingStream(participantId);
        console.log("Stopped watching", participantId);
      }
    });
    container.appendChild(stopButton);

    elements.remoteStreams.appendChild(container);
    remoteParticipants.set(participantId, container);
  }

  return container;
}

// Create video element
function createVideoElement(participantId) {
  const videoEl = document.createElement("video");
  videoEl.id = `remoteVideo-${participantId}`;
  videoEl.className = "video-element";
  videoEl.autoplay = true;
  videoEl.controls = true;
  videoEl.playsInline = true;
  videoEl.muted = false;
  videoEl.style.cssText = `
    width: 300px;
    height: 200px;
    background: #000;
    border-radius: 4px;
  `;
  return videoEl;
}

// Create audio element
function createAudioElement(participantId) {
  const audioEl = document.createElement("audio");
  audioEl.id = `remoteAudio-${participantId}`;
  audioEl.className = "audio-element";
  audioEl.autoplay = true;
  audioEl.playsInline = true;
  audioEl.style.cssText = `
    position: absolute;
    bottom: 5px;
    right: 5px;
    width: 30px;
    height: 20px;
    opacity: 0.8;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
  `;

  audioEl.addEventListener("loadeddata", () => {
    console.log(`Audio stream loaded for participant ${participantId}`);
  });

  audioEl.addEventListener("error", (e) => {
    console.error(`Audio error for participant ${participantId}:`, e);
  });

  // Add audio indicator
  const audioIndicator = document.createElement("div");
  audioIndicator.className = "audio-indicator";
  audioIndicator.innerHTML = "🔊";
  audioIndicator.title = `Audio for participant ${participantId.substring(
    0,
    8
  )}... (Click to toggle mute)`;
  audioIndicator.style.cssText = `
    position: absolute;
    bottom: 8px;
    right: 8px;
    font-size: 14px;
    cursor: pointer;
    z-index: 10;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 4px;
    border-radius: 3px;
    user-select: none;
    transition: background-color 0.3s;
  `;

  let isMuted = false;
  audioIndicator.addEventListener("click", (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    audioEl.muted = isMuted;
    audioIndicator.innerHTML = isMuted ? "🔇" : "🔊";
    audioIndicator.style.backgroundColor = isMuted
      ? "rgba(255, 0, 0, 0.7)"
      : "rgba(0, 0, 0, 0.7)";
    console.log(
      `Audio ${isMuted ? "muted" : "unmuted"} for participant ${participantId}`
    );
  });

  audioIndicator.addEventListener("mouseenter", () => {
    audioIndicator.style.backgroundColor = "rgba(0, 123, 255, 0.7)";
  });

  audioIndicator.addEventListener("mouseleave", () => {
    audioIndicator.style.backgroundColor = isMuted
      ? "rgba(255, 0, 0, 0.7)"
      : "rgba(0, 0, 0, 0.7)";
  });

  setTimeout(() => {
    const container = audioEl.closest(".participant-container");
    if (container) {
      container.appendChild(audioIndicator);
    }
  }, 0);

  return audioEl;
}

// Remove participant from UI
function removeParticipant(participantId) {
  const container = document.getElementById(`participant-${participantId}`);
  if (container) {
    container.remove();
    remoteParticipants.delete(participantId);
  }

  // Remove from participant list
  const listItems = elements.partList.querySelectorAll("li");
  listItems.forEach((item) => {
    if (item.dataset.participantId === participantId) {
      item.remove();
    }
  });
}

// Remove specific stream from participant
function removeParticipantStream(participantId, kind) {
  const container = document.getElementById(`participant-${participantId}`);
  if (container) {
    const mediaElement = container.querySelector(
      kind === "video" ? ".video-element" : ".audio-element"
    );
    if (mediaElement) {
      mediaElement.srcObject = null;
      mediaElement.remove();
    }

    // If container has no media elements left, remove it
    const hasVideo = container.querySelector(".video-element");
    const hasAudio = container.querySelector(".audio-element");
    if (!hasVideo && !hasAudio) {
      container.remove();
      remoteParticipants.delete(participantId);
    }
  }
}

// Update remote media indicator (for remote mute/unmute events)
// Add participant to list
function addParticipantToList(participantName, participantId) {
  const li = document.createElement("li");
  li.textContent = participantName;
  li.dataset.participantId = participantId;
  li.style.cssText = `
    padding: 5px;
    margin: 2px 0;
    background: #f0f0f0;
    border-radius: 4px;
  `;
  elements.partList.appendChild(li);
}

// Clean up function for when leaving conference
function cleanup() {
  // Clear remote participants
  remoteParticipants.clear();

  // Clear DOM elements
  elements.remoteStreams.innerHTML = "";
  elements.partList.innerHTML = "";

  // Reset local video
  if (elements.localVideo.srcObject) {
    const tracks = elements.localVideo.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    elements.localVideo.srcObject = null;
  }

  // Reset UI state
  elements.joinButton.disabled = false;
  elements.details.innerText = "MediaSoup Conference Client";

  // Reset button states
  elements.toggleAudioButton.textContent = "🔇 Mute Audio";
  elements.toggleAudioButton.style.background = "#dc3545";
  elements.toggleVideoButton.textContent = "📹 Turn Off Video";
  elements.toggleVideoButton.style.background = "#dc3545";
}

// Utility function to generate random ID
function generateId() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
