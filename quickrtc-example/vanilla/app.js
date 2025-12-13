/**
 * QuickRTC Vanilla JS Example
 * 
 * This demonstrates how to use QuickRTC without any framework.
 */

const SERVER_URL = 'https://localhost:3000';

// DOM Elements
const joinScreen = document.getElementById('join-screen');
const conferenceScreen = document.getElementById('conference-screen');
const nameInput = document.getElementById('name-input');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const errorDiv = document.getElementById('error');
const statusDiv = document.getElementById('status');
const audioBtn = document.getElementById('audio-btn');
const videoBtn = document.getElementById('video-btn');
const screenBtn = document.getElementById('screen-btn');
const leaveBtn = document.getElementById('leave-btn');
const videoGrid = document.getElementById('video-grid');
const emptyState = document.getElementById('empty-state');

// State
let socket = null;
let rtc = null;
let localStreams = []; // Track local streams ourselves
let remoteParticipants = []; // Track participants (even without streams)
let remoteStreams = []; // Track remote streams ourselves

// ============================================================================
// UI HELPERS
// ============================================================================

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.add('active');
  setTimeout(() => errorDiv.classList.remove('active'), 5000);
}

function updateStatus(message) {
  statusDiv.textContent = message;
}

function updateEmptyState() {
  const hasRemote = remoteParticipants.length > 0;
  emptyState.style.display = hasRemote ? 'none' : 'block';
}

function updateButtons() {
  const hasAudio = localStreams.some(s => s.type === 'audio');
  const hasVideo = localStreams.some(s => s.type === 'video');
  const hasScreen = localStreams.some(s => s.type === 'screenshare');

  audioBtn.textContent = hasAudio ? 'Mute' : 'Unmute';
  audioBtn.classList.toggle('active', hasAudio);
  
  videoBtn.textContent = hasVideo ? 'Stop Video' : 'Start Video';
  videoBtn.classList.toggle('active', hasVideo);
  
  screenBtn.textContent = hasScreen ? 'Stop Share' : 'Share Screen';
  screenBtn.classList.toggle('active', hasScreen);
}

// ============================================================================
// VIDEO RENDERING
// ============================================================================

function createVideoTile(id, name, isLocal = false) {
  const tile = document.createElement('div');
  tile.className = `video-tile ${isLocal ? 'local' : ''}`;
  tile.id = `tile-${id}`;
  tile.innerHTML = `
    <span class="name-tag">${name}${isLocal ? ' (You)' : ''}</span>
    <div class="avatar">${name.charAt(0).toUpperCase()}</div>
  `;
  videoGrid.appendChild(tile);
  return tile;
}

function getOrCreateTile(id, name, isLocal = false) {
  let tile = document.getElementById(`tile-${id}`);
  if (!tile) {
    tile = createVideoTile(id, name, isLocal);
  }
  return tile;
}

function removeTile(id) {
  const tile = document.getElementById(`tile-${id}`);
  if (tile) {
    tile.remove();
  }
}

function setTileVideo(tile, stream, isScreen = false) {
  // Remove avatar if present
  const avatar = tile.querySelector('.avatar');
  if (avatar) avatar.remove();
  
  // Remove existing video (but keep PIP)
  const existingVideo = tile.querySelector(':scope > video');
  if (existingVideo) existingVideo.remove();
  
  // Add new video
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = tile.classList.contains('local');
  
  if (isScreen) {
    tile.classList.add('screen');
  } else {
    tile.classList.remove('screen');
  }
  
  tile.insertBefore(video, tile.querySelector('.name-tag').nextSibling);
}

function setTilePIP(tile, stream) {
  // Remove existing PIP
  const existingPip = tile.querySelector('.pip');
  if (existingPip) existingPip.remove();
  
  // Add PIP
  const pip = document.createElement('div');
  pip.className = 'pip';
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  pip.appendChild(video);
  tile.appendChild(pip);
}

function removeTilePIP(tile) {
  const pip = tile.querySelector('.pip');
  if (pip) pip.remove();
}

function setTileAvatar(tile, name) {
  // Remove existing video
  const existingVideo = tile.querySelector(':scope > video');
  if (existingVideo) existingVideo.remove();
  
  // Remove screen class
  tile.classList.remove('screen');
  
  // Add avatar if not present
  if (!tile.querySelector('.avatar')) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = name.charAt(0).toUpperCase();
    tile.appendChild(avatar);
  }
}

function renderLocalStreams() {
  const videoStream = localStreams.find(s => s.type === 'video');
  const screenStream = localStreams.find(s => s.type === 'screenshare');
  
  updateButtons();
  
  // Always show local tile (with avatar if no video)
  const tile = getOrCreateTile('local', nameInput.value, true);
  
  if (screenStream) {
    // Screen share as main, video as PIP
    setTileVideo(tile, screenStream.stream, true);
    tile.querySelector('.name-tag').textContent = `${nameInput.value} (You - sharing)`;
    
    if (videoStream) {
      setTilePIP(tile, videoStream.stream);
    } else {
      removeTilePIP(tile);
    }
  } else if (videoStream) {
    // Just video
    setTileVideo(tile, videoStream.stream, false);
    tile.querySelector('.name-tag').textContent = `${nameInput.value} (You)`;
    removeTilePIP(tile);
  } else {
    // No video - show avatar
    setTileAvatar(tile, nameInput.value);
    tile.querySelector('.name-tag').textContent = `${nameInput.value} (You)`;
    removeTilePIP(tile);
  }
}

function renderRemoteStreams() {
  // Build a map of streams by participant
  const streamsByParticipant = new Map();
  
  for (const stream of remoteStreams) {
    if (!streamsByParticipant.has(stream.participantId)) {
      streamsByParticipant.set(stream.participantId, []);
    }
    streamsByParticipant.get(stream.participantId).push(stream);
  }
  
  // Render each participant (even without streams)
  for (const participant of remoteParticipants) {
    const { id: participantId, name } = participant;
    const streams = streamsByParticipant.get(participantId) || [];
    
    const videoStream = streams.find(s => s.type === 'video');
    const screenStream = streams.find(s => s.type === 'screenshare');
    const audioStream = streams.find(s => s.type === 'audio');
    
    const tile = getOrCreateTile(participantId, name);
    
    if (screenStream) {
      // Screen share as main
      setTileVideo(tile, screenStream.stream, true);
      tile.querySelector('.name-tag').textContent = `${name} (sharing)`;
      
      if (videoStream) {
        setTilePIP(tile, videoStream.stream);
      } else {
        removeTilePIP(tile);
      }
    } else if (videoStream) {
      // Just video
      setTileVideo(tile, videoStream.stream, false);
      tile.querySelector('.name-tag').textContent = name;
      removeTilePIP(tile);
    } else {
      // No video - show avatar
      setTileAvatar(tile, name);
      tile.querySelector('.name-tag').textContent = name;
      removeTilePIP(tile);
    }
    
    // Handle audio (hidden element)
    if (audioStream) {
      let audioEl = document.getElementById(`audio-${participantId}`);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `audio-${participantId}`;
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = audioStream.stream;
    }
  }
  
  // Remove tiles for participants who left
  const currentParticipantIds = new Set(remoteParticipants.map(p => p.id));
  for (const tile of videoGrid.querySelectorAll('.video-tile:not(.local)')) {
    const participantId = tile.id.replace('tile-', '');
    if (!currentParticipantIds.has(participantId)) {
      tile.remove();
      const audioEl = document.getElementById(`audio-${participantId}`);
      if (audioEl) audioEl.remove();
    }
  }
  
  updateEmptyState();
}

// ============================================================================
// QUICKRTC SETUP
// ============================================================================

function setupQuickRTC() {
  // Event handlers
  rtc.on('connected', ({ conferenceId, participantId }) => {
    console.log('Connected:', conferenceId, participantId);
    updateStatus(`Connected to ${conferenceId}`);
  });
  
  rtc.on('disconnected', ({ reason }) => {
    console.log('Disconnected:', reason);
    updateStatus('Disconnected');
  });
  
  rtc.on('error', ({ message }) => {
    console.error('Error:', message);
    showError(message);
  });
  
  // NEW: Single event for new participants (may have streams or not)
  rtc.on('newParticipant', ({ participantId, participantName, streams }) => {
    console.log(`New participant: ${participantName} with ${streams.length} streams`);
    updateStatus(`${participantName} joined`);
    
    // Add participant if not already tracked
    if (!remoteParticipants.some(p => p.id === participantId)) {
      remoteParticipants.push({ id: participantId, name: participantName });
    }
    
    // Add any streams they have (for existing participants when you join)
    for (const stream of streams) {
      if (!remoteStreams.some(s => s.id === stream.id)) {
        remoteStreams.push(stream);
      }
    }
    renderRemoteStreams();
  });
  
  // NEW: Stream added - existing participant started sharing media
  rtc.on('streamAdded', (stream) => {
    console.log(`Stream added: ${stream.type} from ${stream.participantName}`);
    
    // Add stream if not already tracked
    if (!remoteStreams.some(s => s.id === stream.id)) {
      remoteStreams.push(stream);
    }
    renderRemoteStreams();
  });
  
  rtc.on('participantLeft', ({ participantId }) => {
    console.log('Participant left:', participantId);
    remoteParticipants = remoteParticipants.filter(p => p.id !== participantId);
    remoteStreams = remoteStreams.filter(s => s.participantId !== participantId);
    renderRemoteStreams();
    updateEmptyState();
  });
  
  rtc.on('streamRemoved', ({ participantId, streamId, type }) => {
    console.log('Stream removed:', type, participantId);
    remoteStreams = remoteStreams.filter(s => s.id !== streamId);
    renderRemoteStreams();
  });
  
  // NEW: Handle local stream ended (e.g., native browser "Stop sharing" button)
  rtc.on('localStreamEnded', ({ streamId, type }) => {
    console.log('Local stream ended:', type, streamId);
    localStreams = localStreams.filter(s => s.id !== streamId);
    renderLocalStreams();
  });
}

// ============================================================================
// ACTIONS
// ============================================================================

async function handleJoin() {
  const name = nameInput.value.trim();
  const roomId = roomInput.value.trim();
  
  if (!name) {
    showError('Please enter your name');
    return;
  }
  
  if (!roomId) {
    showError('Please enter a room ID');
    return;
  }
  
  try {
    joinBtn.disabled = true;
    joinBtn.textContent = 'Connecting...';
    
    // Connect socket
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });
    
    // Wait for socket connection
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
    
    // Create QuickRTC instance
    rtc = new QuickRTC({
      socket,
      debug: true
    });
    
    setupQuickRTC();
    
    // Join conference
    await rtc.join({
      conferenceId: roomId,
      participantName: name
    });
    
    // Switch to conference screen (no auto-produce - user clicks buttons)
    joinScreen.style.display = 'none';
    conferenceScreen.classList.add('active');
    
    // Show local tile with avatar (user will click buttons to start audio/video)
    renderLocalStreams();
    
  } catch (err) {
    console.error('Join failed:', err);
    showError(err.message || 'Failed to join room');
    socket?.disconnect();
    socket = null;
    rtc = null;
  } finally {
    joinBtn.disabled = false;
    joinBtn.textContent = 'Join Room';
  }
}

async function handleLeave() {
  if (rtc) {
    await rtc.leave();
    rtc = null;
  }
  
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  // Clear video grid
  videoGrid.innerHTML = '';
  
  // Remove any audio elements
  document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove());
  
  // Reset state
  localStreams = [];
  remoteParticipants = [];
  remoteStreams = [];
  updateButtons();
  updateEmptyState();
  
  // Switch to join screen
  conferenceScreen.classList.remove('active');
  joinScreen.style.display = 'flex';
}

async function toggleAudio() {
  if (!rtc) return;
  
  const hasAudio = localStreams.some(s => s.type === 'audio');
  
  try {
    if (hasAudio) {
      // Stop audio
      const audioStream = localStreams.find(s => s.type === 'audio');
      if (audioStream) {
        await audioStream.stop();
        localStreams = localStreams.filter(s => s.id !== audioStream.id);
      }
    } else {
      // Start audio
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const [stream] = await rtc.produce(mediaStream.getAudioTracks());
      if (stream) {
        localStreams.push(stream);
      }
    }
    renderLocalStreams();
  } catch (err) {
    console.error('Toggle audio failed:', err);
    showError('Failed to toggle audio');
  }
}

async function toggleVideo() {
  if (!rtc) return;
  
  const hasVideo = localStreams.some(s => s.type === 'video');
  
  try {
    if (hasVideo) {
      // Stop video
      const videoStream = localStreams.find(s => s.type === 'video');
      if (videoStream) {
        await videoStream.stop();
        localStreams = localStreams.filter(s => s.id !== videoStream.id);
      }
    } else {
      // Start video
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const [stream] = await rtc.produce(mediaStream.getVideoTracks());
      if (stream) {
        localStreams.push(stream);
      }
    }
    renderLocalStreams();
  } catch (err) {
    console.error('Toggle video failed:', err);
    showError('Failed to toggle video');
  }
}

async function toggleScreen() {
  if (!rtc) return;
  
  const hasScreen = localStreams.some(s => s.type === 'screenshare');
  
  try {
    if (hasScreen) {
      // Stop screen share
      const screenStream = localStreams.find(s => s.type === 'screenshare');
      if (screenStream) {
        await screenStream.stop();
        localStreams = localStreams.filter(s => s.id !== screenStream.id);
      }
    } else {
      // Start screen share
      const screenMedia = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      const track = screenMedia.getVideoTracks()[0];
      const [stream] = await rtc.produce({ track, type: 'screenshare' });
      
      if (stream) {
        localStreams.push(stream);
        // Note: No need for track.onended - the library handles it and emits 'localStreamEnded'
      }
    }
    renderLocalStreams();
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      console.error('Toggle screen failed:', err);
      showError('Failed to share screen');
    }
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

joinBtn.addEventListener('click', handleJoin);
nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleJoin());
roomInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleJoin());

leaveBtn.addEventListener('click', handleLeave);
audioBtn.addEventListener('click', toggleAudio);
videoBtn.addEventListener('click', toggleVideo);
screenBtn.addEventListener('click', toggleScreen);

// Initial state
updateButtons();
