import { ConferenceClient } from "/simple_ms_client/dist/client.js";

// Global state
let currentParticipant = null;
let client = null;
let remoteTracks = {};
let remoteParticipants = new Map(); // Track participant media elements

// DOM elements
let elements = {};

document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements
  elements = {
    button: document.getElementById("myButton"),
    leaveButton: document.getElementById("leaveButton"),
    localVideo: document.getElementById("localVideo"),
    partList: document.getElementById("partList"),
    remoteStreams: document.getElementById("remoteStreams"),
    details: document.getElementById("details"),
  };

  elements.button.addEventListener("click", handleJoinConference);
  elements.leaveButton.addEventListener("click", handleLeaveConference);
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
    enableAudio: true,
    enableVideo: true,
  });

  // Update UI with participant details
  elements.details.innerText = `Participant Name: ${client.config.participantName}\nParticipant ID: ${client.config.participantId}`;
  currentParticipant = client.config;

  // Set up event listeners
  setupEventListeners();

  try {
    // Join conference and enable media
    await client.joinConference();
    elements.button.disabled = true;
    elements.button.style.display = "none";
    elements.leaveButton.style.display = "inline-block";

    const localStream = await client.enableMedia(true, true);
    elements.localVideo.srcObject = localStream;

    // Handle existing participants
    await handleExistingParticipants();

    console.log("Successfully joined conference");
  } catch (error) {
    console.error("Error joining conference:", error);
    elements.button.disabled = false;
    elements.details.innerText = `Error: ${error.message}`;
  }
}

// Handle leave conference
async function handleLeaveConference() {
  try {
    if (client) {
      await client.leaveConference();
      console.log("Left conference successfully");
    }
  } catch (error) {
    console.error("Error leaving conference:", error);
  } finally {
    cleanup();
    elements.button.style.display = "inline-block";
    elements.leaveButton.style.display = "none";
    elements.details.innerText = "MediaSoup Conference Client";
    client = null;
    currentParticipant = null;
  }
}

// Set up event listeners for client events
function setupEventListeners() {
  client.addEventListener("participantJoined", handleParticipantJoined);
  client.addEventListener("remoteStreamAdded", handleRemoteStreamAdded);
  client.addEventListener("participantLeft", handleParticipantLeft);
  client.addEventListener("remoteStreamRemoved", handleRemoteStreamRemoved);
}

// Handle participant joined event
function handleParticipantJoined(event) {
  const participantName = event.detail.participantName;
  addParticipantToList(participantName);
}

// Handle remote stream added event
function handleRemoteStreamAdded(event) {
  const { participantId, kind, stream } = event.detail;
  remoteTracks[`${participantId}-${kind}`] = stream;

  if (kind === "video") {
    handleVideoStream(participantId, stream);
  } else if (kind === "audio") {
    handleAudioStream(participantId, stream);
  }
}

// Handle existing participants when joining
async function handleExistingParticipants() {
  const existingParticipants = await client.getParticipants();
  console.log("Existing participants:", existingParticipants);

  existingParticipants.forEach((participant) => {
    const displayName = `${participant.participantName} ${
      participant.participantId === currentParticipant.participantId
        ? "(You)"
        : ""
    }`;
    addParticipantToList(displayName);
  });
}
// Media handling functions
function handleVideoStream(participantId, stream) {
  const participantContainer = getOrCreateParticipantContainer(participantId);
  let videoEl = participantContainer.querySelector(".video-element");

  if (!videoEl) {
    videoEl = createVideoElement(participantId);
    participantContainer.appendChild(videoEl);
  }

  videoEl.srcObject = stream;
}

function handleAudioStream(participantId, stream) {
  const participantContainer = getOrCreateParticipantContainer(participantId);
  let audioEl = participantContainer.querySelector(".audio-element");

  if (!audioEl) {
    audioEl = createAudioElement(participantId);
    participantContainer.appendChild(audioEl);
  }

  audioEl.srcObject = stream;
}

// Create or get participant container
function getOrCreateParticipantContainer(participantId) {
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
    label.textContent = `Participant ${participantId.substring(0, 8)}...`;
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

// Create hidden audio element positioned near video
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

  // Add audio controls and volume indicator
  audioEl.addEventListener("loadeddata", () => {
    console.log(`Audio stream loaded for participant ${participantId}`);
  });

  audioEl.addEventListener("error", (e) => {
    console.error(`Audio error for participant ${participantId}:`, e);
  });

  // Add a visual indicator for audio with interactive controls
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

  // Add click handler for muting/unmuting
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

  // Add hover effect
  audioIndicator.addEventListener("mouseenter", () => {
    audioIndicator.style.backgroundColor = "rgba(0, 123, 255, 0.7)";
  });

  audioIndicator.addEventListener("mouseleave", () => {
    audioIndicator.style.backgroundColor = isMuted
      ? "rgba(255, 0, 0, 0.7)"
      : "rgba(0, 0, 0, 0.7)";
  });

  // Add audio indicator to the container
  setTimeout(() => {
    const container = audioEl.closest(".participant-container");
    if (container) {
      container.appendChild(audioIndicator);
    }
  }, 0);

  return audioEl;
}

// Handle participant left event
function handleParticipantLeft(event) {
  const participantId = event.detail.participantId;
  console.log("Participant left:", participantId);

  // Remove participant container
  const container = document.getElementById(`participant-${participantId}`);
  if (container) {
    container.remove();
    remoteParticipants.delete(participantId);
  }

  // Clean up tracks
  const videoTrackKey = `${participantId}-video`;
  const audioTrackKey = `${participantId}-audio`;

  if (remoteTracks[videoTrackKey]) {
    delete remoteTracks[videoTrackKey];
  }
  if (remoteTracks[audioTrackKey]) {
    delete remoteTracks[audioTrackKey];
  }
}

// Handle remote stream removed event
function handleRemoteStreamRemoved(event) {
  const { participantId, kind } = event.detail;
  console.log("Remote stream removed:", participantId, kind);

  const trackKey = `${participantId}-${kind}`;
  if (remoteTracks[trackKey]) {
    delete remoteTracks[trackKey];
  }

  // Remove specific media element
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

// Add participant to list
function addParticipantToList(participantName) {
  const li = document.createElement("li");
  li.textContent = participantName;
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
  // Clear remote tracks
  Object.keys(remoteTracks).forEach((key) => {
    delete remoteTracks[key];
  });

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
  elements.button.disabled = false;
  elements.details.innerText = "MediaSoup Conference Client";
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
