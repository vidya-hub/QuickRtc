// Simple MediaSoup Client Application
// Video Conference Example JavaScript

// Import the client library - in production, this would be from CDN or npm build
import { SimpleClient } from "/simple_ms_client/dist/client.js";
console.log("Simple MediaSoup client application started");

// Application state
let client = null;
let isConnected = false;
let isAudioMuted = false;
let isVideoMuted = false;

// DOM elements
const elements = {
  // Connection
  statusIndicator: document.getElementById("statusIndicator"),
  conferenceId: document.getElementById("conferenceId"),
  participantName: document.getElementById("participantName"),
  connectBtn: document.getElementById("connectBtn"),
  disconnectBtn: document.getElementById("disconnectBtn"),

  // Media controls
  toggleAudioBtn: document.getElementById("toggleAudioBtn"),
  toggleVideoBtn: document.getElementById("toggleVideoBtn"),
  screenShareBtn: document.getElementById("screenShareBtn"),

  // Videos
  localVideo: document.getElementById("localVideo"),
  remoteVideos: document.getElementById("remoteVideos"),

  // Participants
  participantsList: document.getElementById("participantsList"),

  // Logs
  logs: document.getElementById("logs"),
  showLogsBtn: document.getElementById("showLogsBtn"),
  logsModal: document.getElementById("logsModal"),
  closeLogsBtn: document.getElementById("closeLogsBtn"),
  clearLogsBtn: document.getElementById("clearLogsBtn"),
};

// Logging function
function log(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry ${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;
  elements.logs.appendChild(logEntry);
  elements.logs.scrollTop = elements.logs.scrollHeight;

  // Keep only last 50 log entries
  while (elements.logs.children.length > 50) {
    elements.logs.removeChild(elements.logs.firstChild);
  }
}

// Update status indicator
function updateStatus(status, message) {
  elements.statusIndicator.className = `status ${status}`;
  elements.statusIndicator.textContent = message;
}

// Update UI based on connection state
function updateUI() {
  elements.connectBtn.disabled = isConnected;
  elements.disconnectBtn.disabled = !isConnected;
  elements.toggleAudioBtn.disabled = !isConnected;
  elements.toggleVideoBtn.disabled = !isConnected;
  elements.screenShareBtn.disabled = !isConnected;
  elements.conferenceId.disabled = isConnected;
  elements.participantName.disabled = isConnected;
}

// Update participants list
function updateParticipantsList() {
  if (!client) return;

  const participants = client.getParticipants();
  console.log("participants are ", participants);

  elements.participantsList.innerHTML = "";

  participants.forEach((participant) => {
    const div = document.createElement("div");
    div.className = `participant ${participant.isLocal ? "local" : "remote"}`;
    div.textContent = `${participant.name}${
      participant.isLocal ? " (You)" : ""
    }`;
    elements.participantsList.appendChild(div);
  });
}

// Setup event listeners
function setupEventListeners() {
  if (!client) return;

  console.log("Setting up event listeners for client");

  // Connection events
  client.addEventListener("connected", (event) => {
    const { connection } = event.detail;
    console.log("connection details ", connection);

    log(`Connected to conference: ${connection.conferenceId}`, "success");
    updateStatus("connected", `Connected to ${connection.conferenceId}`);
    isConnected = true;
    updateUI();
    updateParticipantsList();
  });

  client.addEventListener("disconnected", (event) => {
    log("Disconnected from conference", "warning");
    updateStatus("disconnected", "Disconnected");
    isConnected = false;
    updateUI();
    elements.participantsList.innerHTML = "";
    elements.remoteVideos.innerHTML = "";
    elements.localVideo.srcObject = null;
  });

  client.addEventListener("error", (event) => {
    const { error, code } = event.detail;
    log(`Error (${code}): ${error.message}`, "error");
  });

  // Participant events
  client.addEventListener("participantJoined", (event) => {
    const { participant } = event.detail;
    log(`${participant.name} joined the conference`, "success");
    updateParticipantsList();
  });

  client.addEventListener("participantLeft", (event) => {
    const { participant } = event.detail;
    log(`${participant.name} left the conference`, "warning");
    updateParticipantsList();
  });

  // Media events
  client.addEventListener("localStreamReady", (event) => {
    const { stream } = event.detail;
    elements.localVideo.srcObject = stream;
    log("Local video stream ready", "success");
  });

  client.addEventListener("remoteStreamAdded", (event) => {
    const { stream } = event.detail;
    log(
      `Remote stream added from participant ${stream.participantId}`,
      "success"
    );

    const video = document.createElement("video");
    video.id = `remote-${stream.streamId}`;
    video.className = "remote-video";
    video.srcObject = stream.stream;
    video.autoplay = true;
    video.playsinline = true;

    elements.remoteVideos.appendChild(video);
  });

  client.addEventListener("remoteStreamRemoved", (event) => {
    const { streamId, participantId } = event.detail;
    log(`Remote stream removed from participant ${participantId}`, "warning");

    const video = document.getElementById(`remote-${streamId}`);
    if (video) {
      video.remove();
    }
  });

  // Audio/Video state events
  client.addEventListener("audioMuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleAudioBtn.textContent = "Unmute Audio";
      isAudioMuted = true;
    }
    log(`Audio muted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  client.addEventListener("audioUnmuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleAudioBtn.textContent = "Mute Audio";
      isAudioMuted = false;
    }
    log(`Audio unmuted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  client.addEventListener("videoMuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleVideoBtn.textContent = "Unmute Video";
      isVideoMuted = true;
    }
    log(`Video muted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  client.addEventListener("videoUnmuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleVideoBtn.textContent = "Mute Video";
      isVideoMuted = false;
    }
    log(`Video unmuted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  // Screen sharing events
  client.addEventListener("screenShareStarted", (event) => {
    const { participantId } = event.detail;
    log(`Screen sharing started by ${participantId}`, "info");
  });

  client.addEventListener("screenShareStopped", (event) => {
    const { participantId } = event.detail;
    log(`Screen sharing stopped by ${participantId}`, "info");
  });
}

// Connect to conference
async function connect() {
  const conferenceId = elements.conferenceId.value.trim();
  const participantName = elements.participantName.value.trim();

  if (!conferenceId || !participantName) {
    log("Please enter both conference room and your name", "error");
    return;
  }

  try {
    updateStatus("connecting", "Connecting...");
    log("Connecting to conference...", "info");

    // Create new client instance
    client = new SimpleClient({
      serverUrl: window.location.origin,
      enableAudio: true,
      enableVideo: true,
      autoConsume: true,
    });

    console.log("client created successfully");

    // Setup event listeners BEFORE connecting
    setupEventListeners();
    // Connect to conference
    try {
      await client.connect(conferenceId, participantName);
      console.log("Successfully connected to conference");
    } catch (error) {
      console.error("Connection failed:", error);
      throw error; // Re-throw to be caught by outer try-catch
    }

    log("Successfully connected to conference", "success");
  } catch (error) {
    log(`Failed to connect: ${error.message}`, "error");
    updateStatus("disconnected", "Connection failed");
    client = null;
  }
}

// Disconnect from conference
async function disconnect() {
  if (!client) return;

  try {
    log("Disconnecting from conference...", "info");
    await client.disconnect();
    client = null;
  } catch (error) {
    log(`Error disconnecting: ${error.message}`, "error");
  }
}

// Toggle audio
async function toggleAudio() {
  if (!client) return;

  try {
    const muted = await client.toggleAudio();
    log(`Audio ${muted ? "muted" : "unmuted"}`, "info");
  } catch (error) {
    log(`Failed to toggle audio: ${error.message}`, "error");
  }
}

// Toggle video
async function toggleVideo() {
  if (!client) return;

  try {
    const muted = await client.toggleVideo();
    log(`Video ${muted ? "muted" : "unmuted"}`, "info");
  } catch (error) {
    log(`Failed to toggle video: ${error.message}`, "error");
  }
}

// Start screen share
async function startScreenShare() {
  if (!client) return;

  try {
    const stream = await client.startScreenShare();
    if (stream) {
      log("Screen sharing started", "success");
    }
  } catch (error) {
    log(`Failed to start screen share: ${error.message}`, "error");
  }
}

// Modal functions
function showLogsModal() {
  elements.logsModal.classList.add("show");
}

function hideLogsModal() {
  elements.logsModal.classList.remove("show");
}

function clearLogs() {
  elements.logs.innerHTML = "";
  log("Logs cleared", "info");
}

// Initialize application when DOM is loaded
function initializeApp() {
  // Bind event listeners
  elements.connectBtn.addEventListener("click", connect);
  elements.disconnectBtn.addEventListener("click", disconnect);
  elements.toggleAudioBtn.addEventListener("click", toggleAudio);
  elements.toggleVideoBtn.addEventListener("click", toggleVideo);
  elements.screenShareBtn.addEventListener("click", startScreenShare);

  // Modal event listeners
  elements.showLogsBtn.addEventListener("click", showLogsModal);
  elements.closeLogsBtn.addEventListener("click", hideLogsModal);
  elements.clearLogsBtn.addEventListener("click", clearLogs);

  // Close modal when clicking outside of it
  elements.logsModal.addEventListener("click", (e) => {
    if (e.target === elements.logsModal) {
      hideLogsModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elements.logsModal.classList.contains("show")) {
      hideLogsModal();
    }
  });

  // Allow Enter key to connect
  elements.conferenceId.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !isConnected) connect();
  });
  elements.participantName.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !isConnected) connect();
  });

  // Initialize UI
  updateUI();
  log("Simple MediaSoup client loaded successfully", "success");
  log("Enter a conference room name and your name, then click Connect", "info");
}

// Start the application
initializeApp();
