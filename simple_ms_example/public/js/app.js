// Simple MediaSoup Client Application
// Video Conference Example JavaScript
//
// This example demonstrates comprehensive ConferenceClient usage with:
// - Complete event orchestration and logging
// - Real-time participant management
// - Media controls (audio/video toggle, screen share)
// - Transport and producer/consumer debugging events
// - Comprehensive error handling and user feedback

// Import the client library - in production, this would be from CDN or npm build
import { ConferenceClient } from "/simple_ms_client/dist/client.js";
console.log(
  "Simple MediaSoup client application started with ConferenceClient"
);

// Application state
let conferenceClient = null;
let socket = null;
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
  remoteStreams: document.getElementById("remoteVideos"), // Alias for compatibility

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
  if (!conferenceClient) return;

  const participants = conferenceClient.getParticipants();
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
  if (!conferenceClient) return;

  console.log("Setting up event listeners for ConferenceClient");

  // Connection events
  conferenceClient.addEventListener("joined", (event) => {
    const { conferenceId, participantId } = event.detail;
    console.log("Joined conference:", conferenceId, participantId);

    log(`Connected to conference: ${conferenceId}`, "success");
    updateStatus("connected", `Connected to ${conferenceId}`);
    isConnected = true;
    updateUI();
    updateParticipantsList();
  });

  conferenceClient.addEventListener("left", (event) => {
    log("Disconnected from conference", "warning");
    updateStatus("disconnected", "Disconnected");
    isConnected = false;
    updateUI();
    elements.participantsList.innerHTML = "";
    elements.remoteVideos.innerHTML = "";
    elements.localVideo.srcObject = null;
  });

  conferenceClient.addEventListener("error", (event) => {
    const { error, context } = event.detail;
    log(`Error (${context}): ${error.message}`, "error");
  });

  // Participant events
  conferenceClient.addEventListener("participantJoined", (event) => {
    const { participantId, participantName } = event.detail;
    log(`${participantName} joined the conference`, "success");
    updateParticipantsList();
  });

  conferenceClient.addEventListener("participantLeft", (event) => {
    const { participantId, participantName } = event.detail;
    log(`${participantName} left the conference`, "warning");
    updateParticipantsList();
  });

  // Media events
  conferenceClient.addEventListener("localStreamReady", (event) => {
    const { stream } = event.detail;
    elements.localVideo.srcObject = stream;
    log("Local video stream ready", "success");
  });

  conferenceClient.addEventListener("remoteStreamAdded", (event) => {
    const { stream, participantId, consumerId, kind } = event.detail;
    log(
      `Remote stream added: ${consumerId} (${kind}) from participant ${participantId}`,
      "success"
    );

    const video = document.createElement("video");
    video.id = `remote-${consumerId}`;
    video.className = "remote-video";
    video.srcObject = stream;
    video.autoplay = true;
    video.playsinline = true;

    elements.remoteVideos.appendChild(video);
  });

  conferenceClient.addEventListener("remoteStreamRemoved", (event) => {
    const { consumerId, participantId } = event.detail;
    log(
      `Remote stream removed: ${consumerId} from participant ${participantId}`,
      "warning"
    );

    const video = document.getElementById(`remote-${consumerId}`);
    if (video) {
      video.remove();
    }
  });

  // Audio/Video state events
  conferenceClient.addEventListener("audioMuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleAudioBtn.textContent = "Unmute Audio";
      isAudioMuted = true;
    }
    log(`Audio muted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  conferenceClient.addEventListener("audioUnmuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleAudioBtn.textContent = "Mute Audio";
      isAudioMuted = false;
    }
    log(`Audio unmuted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  conferenceClient.addEventListener("videoMuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleVideoBtn.textContent = "Unmute Video";
      isVideoMuted = true;
    }
    log(`Video muted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  conferenceClient.addEventListener("videoUnmuted", (event) => {
    const { participantId, isLocal } = event.detail;
    if (isLocal) {
      elements.toggleVideoBtn.textContent = "Mute Video";
      isVideoMuted = false;
    }
    log(`Video unmuted ${isLocal ? "(You)" : `by ${participantId}`}`, "info");
  });

  // Transport events for debugging
  conferenceClient.addEventListener("transportConnected", (event) => {
    const { transportId, direction } = event.detail;
    log(`Transport connected: ${transportId} (${direction})`, "info");
  });

  conferenceClient.addEventListener("transportFailed", (event) => {
    const { transportId, direction, error } = event.detail;
    log(
      `Transport failed: ${transportId} (${direction}) - ${error.message}`,
      "error"
    );
  });

  // Producer/Consumer events for debugging
  conferenceClient.addEventListener("producerCreated", (event) => {
    const { producerId, kind, participantId } = event.detail;
    log(
      `Producer created: ${producerId} (${kind}) for ${participantId}`,
      "info"
    );
  });

  conferenceClient.addEventListener("consumerCreated", (event) => {
    const { consumerId, producerId, kind, participantId } = event.detail;
    log(
      `Consumer created: ${consumerId} for producer ${producerId} (${kind}) from ${participantId}`,
      "info"
    );
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

    // Import socket.io-client dynamically
    const { io } = await import(
      "https://cdn.socket.io/4.7.4/socket.io.esm.min.js"
    );

    // Connect to server
    socket = io(window.location.origin);
    log(`Connecting to server: ${window.location.origin}`, "info");

    // Wait for socket connection
    await new Promise((resolve, reject) => {
      socket.on("connect", () => {
        log("Socket connected", "success");
        resolve();
      });

      socket.on("connect_error", (error) => {
        log(`Socket connection error: ${error.message}`, "error");
        reject(new Error(`Socket connection failed: ${error.message}`));
      });

      // Set timeout for connection
      setTimeout(() => {
        reject(new Error("Socket connection timeout"));
      }, 10000);
    });

    // Generate participant ID
    const participantId = `participant_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create ConferenceClient instance
    conferenceClient = new ConferenceClient({
      conferenceId,
      participantId,
      participantName,
      socket,
      conferenceName: conferenceId,
      enableAudio: true,
      enableVideo: true,
    });

    console.log("ConferenceClient created successfully");

    // Setup event listeners BEFORE joining
    setupEventListeners();

    // Join conference
    await conferenceClient.joinConference();
    console.log("Successfully joined conference");

    // Enable media
    await conferenceClient.enableMedia(true, true);
    console.log("Media enabled");

    // Consume existing producers
    await conferenceClient.consumeExistingProducers();
    console.log("Existing producers consumed");

    log("Successfully connected to conference", "success");
  } catch (error) {
    log(`Failed to connect: ${error.message}`, "error");
    updateStatus("disconnected", "Connection failed");
    conferenceClient = null;
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
}

// Disconnect from conference
async function disconnect() {
  if (!conferenceClient) return;

  try {
    log("Disconnecting from conference...", "info");
    await conferenceClient.leaveConference();
    conferenceClient = null;
  } catch (error) {
    log(`Error disconnecting: ${error.message}`, "error");
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Reset UI
  updateStatus("disconnected", "Disconnected");
  elements.remoteStreams.innerHTML = "";
  elements.participantsList.innerHTML = "";

  // Stop local video
  if (elements.localVideo.srcObject) {
    elements.localVideo.srcObject.getTracks().forEach((track) => track.stop());
    elements.localVideo.srcObject = null;
  }

  log("Disconnected from conference", "info");
}

// Toggle audio
async function toggleAudio() {
  if (!conferenceClient) return;

  try {
    const muted = await conferenceClient.toggleAudio();
    const btn = elements.toggleAudioBtn;
    btn.textContent = muted ? "Unmute Audio" : "Mute Audio";
    btn.classList.toggle("muted", muted);
    log(`Audio ${muted ? "muted" : "unmuted"}`, "info");
  } catch (error) {
    log(`Failed to toggle audio: ${error.message}`, "error");
  }
}

// Toggle video
async function toggleVideo() {
  if (!conferenceClient) return;

  try {
    const muted = await conferenceClient.toggleVideo();
    const btn = elements.toggleVideoBtn;
    btn.textContent = muted ? "Enable Video" : "Disable Video";
    btn.classList.toggle("muted", muted);
    log(`Video ${muted ? "muted" : "unmuted"}`, "info");
  } catch (error) {
    log(`Failed to toggle video: ${error.message}`, "error");
  }
}

// Start screen share
async function startScreenShare() {
  if (!conferenceClient) return;

  try {
    const stream = await conferenceClient.startScreenShare();
    if (stream) {
      log("Screen sharing started", "success");
      elements.screenShareBtn.textContent = "Stop Screen Share";
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
