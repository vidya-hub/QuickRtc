#!/usr/bin/env node
/**
 * QuickRTC Load Testing TUI
 * 
 * A comprehensive terminal user interface for load testing QuickRTC servers.
 * Supports two modes:
 *   - Socket.IO mode: Fast, tests signaling only (1000+ users)
 *   - WebRTC mode: Real media streams via headless Chrome (limited by CPU)
 * 
 * Usage:
 *   npm run tui
 *   node tui/index.js
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const { LoadTestEngine } = require('./lib/load-test-engine');
const { ServerMonitor } = require('./lib/server-monitor');
const { formatDuration } = require('./lib/utils');

// Try to load WebRTC engine (requires puppeteer)
let WebRTCLoadTestEngine;
try {
  WebRTCLoadTestEngine = require('./lib/webrtc-load-test-engine').WebRTCLoadTestEngine;
} catch (e) {
  console.log('Note: WebRTC mode unavailable (puppeteer not installed)');
}

// Configuration
const CONFIG = {
  serverUrl: process.env.QUICKRTC_URL || 'http://localhost:3000',
  defaultUsers: 10,
  defaultDuration: 60,
  defaultSpawnRate: 2,
  defaultUsersPerRoom: 10,
};

// Create blessed screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'QuickRTC Load Testing',
  fullUnicode: false,
  forceUnicode: false,
});

// Create grid layout
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// ═══════════════════════════════════════════════════════════════════════════════
// UI Components
// ═══════════════════════════════════════════════════════════════════════════════

// Title bar
const titleBox = grid.set(0, 0, 1, 12, blessed.box, {
  tags: true,
  style: { fg: 'white', bg: 'blue' },
});

// Server Status Panel
const serverStatus = grid.set(1, 0, 2, 3, blessed.box, {
  label: ' 🖥  Server ',
  tags: true,
  border: { type: 'line' },
  style: { border: { fg: 'cyan' }, label: { fg: 'cyan', bold: true } },
});

// Test Configuration Panel
const configPanel = grid.set(1, 3, 2, 3, blessed.box, {
  label: ' ⚙  Config ',
  tags: true,
  border: { type: 'line' },
  style: { border: { fg: 'yellow' }, label: { fg: 'yellow', bold: true } },
});

// Current Test Status
const testStatus = grid.set(1, 6, 2, 3, blessed.box, {
  label: ' 🧪 Test ',
  tags: true,
  border: { type: 'line' },
  style: { border: { fg: 'green' }, label: { fg: 'green', bold: true } },
});

// Quick Stats
const quickStats = grid.set(1, 9, 2, 3, blessed.box, {
  label: ' 📊 Stats ',
  tags: true,
  border: { type: 'line' },
  style: { border: { fg: 'magenta' }, label: { fg: 'magenta', bold: true } },
});

// Connections Sparkline
const connectionsSparkline = grid.set(3, 0, 3, 6, contrib.sparkline, {
  label: ' 📈 Connections ',
  tags: true,
  style: { fg: 'cyan', titleFg: 'white', border: { fg: 'cyan' } },
});

// Latency/Bitrate Sparkline
const latencySparkline = grid.set(3, 6, 3, 6, contrib.sparkline, {
  label: ' ⏱  Latency (ms) ',
  tags: true,
  style: { fg: 'yellow', titleFg: 'white', border: { fg: 'yellow' } },
});

// Participants Gauge (replaced donut for better compatibility)
const participantsGauge = grid.set(6, 0, 3, 4, contrib.gauge, {
  label: ' 👥 Progress ',
  stroke: 'green',
  fill: 'white',
  border: { type: 'line', fg: 'green' },
});

// Errors Gauge (replaced donut for better compatibility)
const errorsGauge = grid.set(6, 4, 3, 4, contrib.gauge, {
  label: ' ❌ Errors ',
  stroke: 'red',
  fill: 'white',
  border: { type: 'line', fg: 'red' },
});

// Rooms Table
const roomsTable = grid.set(6, 8, 3, 4, contrib.table, {
  label: ' 🏠 Rooms ',
  keys: true,
  fg: 'white',
  selectedFg: 'white',
  selectedBg: 'blue',
  interactive: false,
  columnSpacing: 2,
  columnWidth: [12, 8],
  border: { type: 'line', fg: 'blue' },
});

// Log Panel
const logPanel = grid.set(9, 0, 2, 8, contrib.log, {
  label: ' 📝 Log ',
  tags: true,
  border: { type: 'line' },
  style: { fg: 'white', border: { fg: 'gray' } },
  bufferLength: 50,
});

// Help Panel
const helpPanel = grid.set(9, 8, 2, 4, blessed.box, {
  label: ' ⌨  Keys ',
  tags: true,
  border: { type: 'line' },
  style: { border: { fg: 'gray' }, label: { fg: 'white' } },
  content: ` {cyan-fg}S{/} Start  {red-fg}X{/} Stop
 {yellow-fg}C{/} Config {magenta-fg}R{/} Reset
 {blue-fg}W{/} Toggle WebRTC
 {green-fg}1-4{/} Presets {gray-fg}Q{/} Quit`,
});

// Menu Bar
const menuBar = grid.set(11, 0, 1, 12, blessed.box, {
  tags: true,
  style: { fg: 'white', bg: 'black' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// State Management
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  useWebRTC: false, // Toggle between Socket.IO and WebRTC mode
  config: {
    users: CONFIG.defaultUsers,
    duration: CONFIG.defaultDuration,
    spawnRate: CONFIG.defaultSpawnRate,
    usersPerRoom: CONFIG.defaultUsersPerRoom,
    serverUrl: CONFIG.serverUrl,
    resolution: '720p',   // Video resolution: 720p, 1080p, 4k
    realMedia: false,     // Use real Y4M files vs synthetic
  },
  stats: {
    connected: 0,
    joined: 0,
    producing: 0,
    failed: 0,
    avgLatency: 0,
    maxLatency: 0,
    elapsed: 0,
    rooms: {},
    webrtc: {
      producers: 0,
      consumers: 0,
      bytesSent: 0,
      bytesReceived: 0,
    },
  },
  chartData: {
    connections: [],
    latency: [],
  },
  server: {
    status: 'unknown',
    conferences: 0,
    participants: 0,
    uptime: 0,
  },
};

let loadTestEngine = null;
let serverMonitor = null;

// ═══════════════════════════════════════════════════════════════════════════════
// UI Update Functions
// ═══════════════════════════════════════════════════════════════════════════════

function updateTitle() {
  const mode = state.useWebRTC ? '{red-fg}WebRTC{/}' : '{cyan-fg}Socket.IO{/}';
  titleBox.setContent(`{center}{bold} ⚡ QuickRTC Load Test - ${mode} Mode ⚡ {/bold}{/center}`);
}

function updateMenuBar() {
  const mode = state.useWebRTC ? '{red-fg}WebRTC{/}' : '{cyan-fg}Socket{/}';
  menuBar.setContent(` {cyan-fg}[S]{/}tart {red-fg}[X]{/}Stop {yellow-fg}[C]{/}fg {blue-fg}[W]{/}:${mode} {green-fg}[1]{/}Smoke {green-fg}[2]{/}Med {green-fg}[3]{/}High {green-fg}[4]{/}Stress {magenta-fg}[R]{/}eset {gray-fg}[Q]{/}uit`);
}

function updateServerStatus() {
  const s = state.server;
  const statusIcon = s.status === 'online' ? '🟢' : s.status === 'offline' ? '🔴' : '🟡';
  const statusColor = s.status === 'online' ? 'green' : s.status === 'offline' ? 'red' : 'yellow';
  
  serverStatus.setContent(
` ${statusIcon} {${statusColor}-fg}${s.status.toUpperCase()}{/}
 {gray-fg}URL:{/} {cyan-fg}${state.config.serverUrl.replace('http://', '')}{/}
 {gray-fg}Conf:{/} ${s.conferences} {gray-fg}Users:{/} ${s.participants}
 {gray-fg}Up:{/} ${formatDuration(s.uptime)}`
  );
}

function updateConfigPanel() {
  const c = state.config;
  const mode = state.useWebRTC ? '{red-fg}WebRTC{/}' : '{cyan-fg}Socket{/}';
  const media = c.realMedia ? `{green-fg}${c.resolution}{/}` : '{gray-fg}synth{/}';
  configPanel.setContent(
` {gray-fg}Mode:{/}  ${mode}
 {gray-fg}Users:{/} {yellow-fg}${c.users}{/} {gray-fg}Dur:{/} {yellow-fg}${c.duration}s{/}
 {gray-fg}Rate:{/}  {yellow-fg}${c.spawnRate}/s{/}
 {gray-fg}Media:{/} ${media}`
  );
}

function updateTestStatus() {
  const s = state.stats;
  const statusIcon = state.isRunning ? '🟢' : '⚪';
  const statusText = state.isRunning ? '{green-fg}RUNNING{/}' : '{gray-fg}STOPPED{/}';
  const connected = state.useWebRTC ? s.connected : s.joined;
  const progress = state.config.users > 0 ? Math.round((connected / state.config.users) * 100) : 0;
  
  let extra = '';
  if (state.useWebRTC && s.producing > 0) {
    extra = `\n {gray-fg}Media:{/} {green-fg}${s.producing}{/} producing`;
  }
  
  testStatus.setContent(
` ${statusIcon} ${statusText}
 {gray-fg}Progress:{/} {cyan-fg}${connected}/${state.config.users}{/} (${progress}%)
 {gray-fg}Elapsed:{/} ${formatDuration(s.elapsed)}${extra}`
  );
}

function updateQuickStats() {
  const s = state.stats;
  let content;
  
  if (state.useWebRTC) {
    const kbSent = s.webrtc.bytesSent > 0 ? (s.webrtc.bytesSent / 1024).toFixed(0) : 0;
    const kbRecv = s.webrtc.bytesReceived > 0 ? (s.webrtc.bytesReceived / 1024).toFixed(0) : 0;
    content = 
` {gray-fg}Producers:{/} {green-fg}${s.webrtc.producers}{/}
 {gray-fg}Consumers:{/} {cyan-fg}${s.webrtc.consumers}{/}
 {gray-fg}Sent:{/} {yellow-fg}${kbSent} KB{/}
 {gray-fg}Recv:{/} {yellow-fg}${kbRecv} KB{/}`;
  } else {
    content = 
` {gray-fg}Connected:{/} {green-fg}${s.connected}{/}
 {gray-fg}Joined:{/}    {cyan-fg}${s.joined}{/}
 {gray-fg}Failed:{/}    {red-fg}${s.failed}{/}
 {gray-fg}Latency:{/}   {yellow-fg}${s.avgLatency.toFixed(0)}ms{/}`;
  }
  
  quickStats.setContent(content);
}

function updateCharts() {
  const maxPoints = 50;
  
  if (state.chartData.connections.length > maxPoints) {
    state.chartData.connections = state.chartData.connections.slice(-maxPoints);
  }
  if (state.chartData.latency.length > maxPoints) {
    state.chartData.latency = state.chartData.latency.slice(-maxPoints);
  }
  
  if (state.chartData.connections.length > 0) {
    connectionsSparkline.setData(['Connections'], [state.chartData.connections]);
  }
  
  if (state.chartData.latency.length > 0) {
    const label = state.useWebRTC ? 'Bitrate' : 'Latency';
    latencySparkline.setLabel(` ⏱  ${label} `);
    latencySparkline.setData([label], [state.chartData.latency]);
  }
}

function updateDonuts() {
  const connected = state.useWebRTC ? state.stats.connected : state.stats.joined;
  const participantPercent = state.config.users > 0 
    ? Math.round((connected / state.config.users) * 100) 
    : 0;
  
  participantsGauge.setPercent(participantPercent);
  
  const totalAttempts = connected + state.stats.failed;
  const errorPercent = totalAttempts > 0 
    ? Math.round((state.stats.failed / totalAttempts) * 100) 
    : 0;
  
  errorsGauge.setPercent(errorPercent);
}

function updateRoomsTable() {
  const rooms = state.stats.rooms;
  const roomData = Object.entries(rooms)
    .map(([id, count]) => [id.replace('loadtest-room-', 'Room '), String(count)])
    .slice(0, 8);
  
  if (roomData.length > 0) {
    roomsTable.setData({ headers: ['Room', 'Users'], data: roomData });
  } else {
    roomsTable.setData({ headers: ['Room', 'Users'], data: [['--', '0']] });
  }
}

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = { info: 'ℹ️ ', success: '✅', error: '❌', warn: '⚠️ ' };
  const colors = { info: 'cyan', success: 'green', error: 'red', warn: 'yellow' };
  logPanel.log(`{gray-fg}${timestamp}{/} ${icons[type] || 'ℹ️ '} {${colors[type] || 'white'}-fg}${message}{/}`);
}

function updateAll() {
  updateTitle();
  updateMenuBar();
  updateServerStatus();
  updateConfigPanel();
  updateTestStatus();
  updateQuickStats();
  updateCharts();
  updateDonuts();
  updateRoomsTable();
  screen.render();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Load Test Engine Integration
// ═══════════════════════════════════════════════════════════════════════════════

function startTest() {
  if (state.isRunning) {
    log('Test already running!', 'warn');
    return;
  }
  
  if (state.server.status !== 'online') {
    log('Server is not online!', 'error');
    return;
  }
  
  if (state.useWebRTC && !WebRTCLoadTestEngine) {
    log('WebRTC mode unavailable. Run: npm install puppeteer', 'error');
    return;
  }
  
  state.isRunning = true;
  state.stats = {
    connected: 0,
    joined: 0,
    producing: 0,
    failed: 0,
    avgLatency: 0,
    maxLatency: 0,
    elapsed: 0,
    rooms: {},
    webrtc: { producers: 0, consumers: 0, bytesSent: 0, bytesReceived: 0 },
  };
  state.chartData = { connections: [], latency: [] };
  
  const modeStr = state.useWebRTC ? 'WebRTC' : 'Socket.IO';
  const mediaStr = state.useWebRTC && state.config.realMedia ? ` (${state.config.resolution} real media)` : '';
  log(`Starting ${modeStr}${mediaStr}: ${state.config.users} users, ${state.config.duration}s`, 'success');
  
  // Create appropriate engine
  if (state.useWebRTC) {
    loadTestEngine = new WebRTCLoadTestEngine({
      ...state.config,
      resolution: state.config.resolution,
      realMedia: state.config.realMedia,
    });
    
    // Check media files if using real media
    const mediaCheck = loadTestEngine.checkMediaFiles();
    if (mediaCheck !== true) {
      log(mediaCheck.error, 'error');
      state.isRunning = false;
      updateAll();
      return;
    }
    
    loadTestEngine.on('launched', (data) => {
      // Browser launched
    });
    
    loadTestEngine.on('connected', (data) => {
      state.stats.connected = data.total;
      state.stats.avgLatency = data.avgLatency || 0;
      state.stats.maxLatency = Math.max(state.stats.maxLatency, data.latency || 0);
      
      if (!state.stats.rooms[data.roomId]) state.stats.rooms[data.roomId] = 0;
      state.stats.rooms[data.roomId]++;
    });
    
    loadTestEngine.on('failed', (data) => {
      state.stats.failed++;
      log(`Failed: ${data.error}`, 'error');
    });
    
    loadTestEngine.on('tick', (elapsed) => {
      state.stats.elapsed = elapsed;
      state.stats.producing = loadTestEngine.stats.producing;
      state.stats.webrtc = loadTestEngine.stats.webrtc;
      
      state.chartData.connections.push(state.stats.connected);
      // For WebRTC mode, show bytes sent as bitrate indication
      const kbps = state.stats.webrtc.bytesSent > 0 
        ? Math.round((state.stats.webrtc.bytesSent * 8 / 1000) / Math.max(1, elapsed))
        : 0;
      state.chartData.latency.push(kbps);
      
      updateAll();
    });
    
  } else {
    loadTestEngine = new LoadTestEngine(state.config);
    
    loadTestEngine.on('connected', (data) => {
      state.stats.connected = data.total;
    });
    
    loadTestEngine.on('joined', (data) => {
      state.stats.joined = data.total;
      state.stats.avgLatency = data.avgLatency || 0;
      state.stats.maxLatency = Math.max(state.stats.maxLatency, data.latency || 0);
      
      if (!state.stats.rooms[data.roomId]) state.stats.rooms[data.roomId] = 0;
      state.stats.rooms[data.roomId]++;
    });
    
    loadTestEngine.on('failed', (data) => {
      state.stats.failed++;
      log(`Failed: ${data.error}`, 'error');
    });
    
    loadTestEngine.on('tick', (elapsed) => {
      state.stats.elapsed = elapsed;
      
      state.chartData.connections.push(state.stats.connected);
      state.chartData.latency.push(Math.round(state.stats.avgLatency) || 0);
      
      updateAll();
    });
  }
  
  loadTestEngine.on('complete', (finalStats) => {
    state.isRunning = false;
    const connected = state.useWebRTC ? finalStats.connected : finalStats.joined;
    log(`Complete! Connected: ${connected}, Failed: ${finalStats.failed}`, 'success');
    updateAll();
  });
  
  loadTestEngine.start();
}

function stopTest() {
  if (!state.isRunning) {
    log('No test running', 'warn');
    return;
  }
  
  log('Stopping test...', 'warn');
  if (loadTestEngine) {
    loadTestEngine.stop();
  }
  state.isRunning = false;
  updateAll();
}

function toggleWebRTC() {
  if (state.isRunning) {
    log('Stop test first before switching modes', 'warn');
    return;
  }
  
  state.useWebRTC = !state.useWebRTC;
  
  if (state.useWebRTC) {
    // WebRTC mode has lower limits
    if (state.config.users > 20) {
      state.config.users = 10;
      state.config.spawnRate = 1;
    }
    log('Switched to WebRTC mode (real media streams)', 'info');
  } else {
    log('Switched to Socket.IO mode (signaling only)', 'info');
  }
  
  updateAll();
}

function resetStats() {
  state.stats = {
    connected: 0,
    joined: 0,
    producing: 0,
    failed: 0,
    avgLatency: 0,
    maxLatency: 0,
    elapsed: 0,
    rooms: {},
    webrtc: { producers: 0, consumers: 0, bytesSent: 0, bytesReceived: 0 },
  };
  state.chartData = { connections: [], latency: [] };
  log('Stats reset', 'info');
  updateAll();
}

function applyPreset(preset) {
  if (state.isRunning) {
    log('Stop test first', 'warn');
    return;
  }
  
  const presets = state.useWebRTC ? {
    1: { name: 'Smoke', users: 5, duration: 60, spawnRate: 1 },
    2: { name: 'Medium', users: 10, duration: 120, spawnRate: 1 },
    3: { name: 'High', users: 20, duration: 180, spawnRate: 2 },
    4: { name: 'Stress', users: 50, duration: 300, spawnRate: 2 },
  } : {
    1: { name: 'Smoke', users: 10, duration: 60, spawnRate: 2 },
    2: { name: 'Medium', users: 100, duration: 120, spawnRate: 5 },
    3: { name: 'High', users: 500, duration: 300, spawnRate: 10 },
    4: { name: 'Stress', users: 1000, duration: 600, spawnRate: 20 },
  };
  
  const p = presets[preset];
  if (p) {
    state.config.users = p.users;
    state.config.duration = p.duration;
    state.config.spawnRate = p.spawnRate;
    log(`Preset: ${p.name} (${p.users} users, ${p.duration}s)`, 'info');
    updateAll();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Dialog
// ═══════════════════════════════════════════════════════════════════════════════

function showConfigDialog() {
  const form = blessed.form({
    parent: screen,
    keys: true,
    left: 'center',
    top: 'center',
    width: 50,
    height: 22,
    border: { type: 'line' },
    style: { border: { fg: 'yellow' }, bg: 'black' },
    label: ' ⚙  Configuration ',
  });
  
  blessed.text({ parent: form, top: 1, left: 2, content: 'Server URL:', style: { fg: 'gray' } });
  const urlInput = blessed.textbox({
    parent: form, name: 'serverUrl', top: 1, left: 14, width: 32, height: 1,
    inputOnFocus: true, value: state.config.serverUrl,
    style: { fg: 'white', bg: 'blue', focus: { bg: 'cyan' } },
  });
  
  blessed.text({ parent: form, top: 3, left: 2, content: 'Users:', style: { fg: 'gray' } });
  const usersInput = blessed.textbox({
    parent: form, name: 'users', top: 3, left: 14, width: 10, height: 1,
    inputOnFocus: true, value: String(state.config.users),
    style: { fg: 'white', bg: 'blue', focus: { bg: 'cyan' } },
  });
  
  blessed.text({ parent: form, top: 5, left: 2, content: 'Duration (s):', style: { fg: 'gray' } });
  const durationInput = blessed.textbox({
    parent: form, name: 'duration', top: 5, left: 14, width: 10, height: 1,
    inputOnFocus: true, value: String(state.config.duration),
    style: { fg: 'white', bg: 'blue', focus: { bg: 'cyan' } },
  });
  
  blessed.text({ parent: form, top: 7, left: 2, content: 'Spawn Rate:', style: { fg: 'gray' } });
  const spawnInput = blessed.textbox({
    parent: form, name: 'spawnRate', top: 7, left: 14, width: 10, height: 1,
    inputOnFocus: true, value: String(state.config.spawnRate),
    style: { fg: 'white', bg: 'blue', focus: { bg: 'cyan' } },
  });
  
  blessed.text({ parent: form, top: 9, left: 2, content: 'Users/Room:', style: { fg: 'gray' } });
  const roomInput = blessed.textbox({
    parent: form, name: 'usersPerRoom', top: 9, left: 14, width: 10, height: 1,
    inputOnFocus: true, value: String(state.config.usersPerRoom),
    style: { fg: 'white', bg: 'blue', focus: { bg: 'cyan' } },
  });
  
  // Mode toggle
  blessed.text({ parent: form, top: 11, left: 2, content: 'Mode:', style: { fg: 'gray' } });
  blessed.text({ 
    parent: form, top: 11, left: 14, 
    content: state.useWebRTC ? '{red-fg}WebRTC (real media){/}' : '{cyan-fg}Socket.IO (signaling){/}',
    tags: true,
  });
  blessed.text({ parent: form, top: 12, left: 14, content: 'Press [W] to toggle mode', style: { fg: 'gray' } });
  
  // Resolution (WebRTC only)
  blessed.text({ parent: form, top: 14, left: 2, content: 'Resolution:', style: { fg: state.useWebRTC ? 'gray' : 'black' } });
  const resInput = blessed.textbox({
    parent: form, name: 'resolution', top: 14, left: 14, width: 10, height: 1,
    inputOnFocus: true, value: state.config.resolution,
    style: { fg: state.useWebRTC ? 'white' : 'gray', bg: state.useWebRTC ? 'blue' : 'black', focus: { bg: 'cyan' } },
  });
  blessed.text({ parent: form, top: 14, left: 26, content: '(720p/1080p/4k)', style: { fg: 'gray' } });
  
  // Real Media toggle (WebRTC only)
  blessed.text({ parent: form, top: 16, left: 2, content: 'Real Media:', style: { fg: state.useWebRTC ? 'gray' : 'black' } });
  const realMediaText = blessed.text({ 
    parent: form, top: 16, left: 14, 
    content: state.config.realMedia ? '{green-fg}YES (Y4M files){/}' : '{gray-fg}NO (synthetic){/}',
    tags: true,
  });
  blessed.text({ parent: form, top: 16, left: 34, content: 'Press [M]', style: { fg: 'gray' } });
  
  const saveBtn = blessed.button({
    parent: form, top: 18, left: 10, width: 12, height: 1, content: '  Save  ',
    style: { fg: 'black', bg: 'green', focus: { bg: 'cyan' } },
  });
  
  const cancelBtn = blessed.button({
    parent: form, top: 18, left: 26, width: 12, height: 1, content: ' Cancel ',
    style: { fg: 'black', bg: 'red', focus: { bg: 'magenta' } },
  });
  
  saveBtn.on('press', () => {
    state.config.serverUrl = urlInput.value || state.config.serverUrl;
    state.config.users = parseInt(usersInput.value) || state.config.users;
    state.config.duration = parseInt(durationInput.value) || state.config.duration;
    state.config.spawnRate = parseInt(spawnInput.value) || state.config.spawnRate;
    state.config.usersPerRoom = parseInt(roomInput.value) || state.config.usersPerRoom;
    
    // Validate resolution
    const res = resInput.value.toLowerCase();
    if (['720p', '1080p', '4k'].includes(res)) {
      state.config.resolution = res;
    }
    
    if (serverMonitor) serverMonitor.stop();
    serverMonitor = new ServerMonitor(state.config.serverUrl);
    startServerMonitor();
    
    log('Configuration saved', 'success');
    form.destroy();
    updateAll();
  });
  
  cancelBtn.on('press', () => { form.destroy(); screen.render(); });
  form.key(['escape'], () => { form.destroy(); screen.render(); });
  form.key(['tab'], () => { form.focusNext(); });
  form.key(['w'], () => { toggleWebRTC(); form.destroy(); showConfigDialog(); });
  form.key(['m'], () => { 
    state.config.realMedia = !state.config.realMedia;
    form.destroy(); 
    showConfigDialog(); 
  });
  
  urlInput.focus();
  screen.render();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Server Monitor
// ═══════════════════════════════════════════════════════════════════════════════

function startServerMonitor() {
  serverMonitor = new ServerMonitor(state.config.serverUrl);
  
  serverMonitor.on('status', (data) => {
    state.server = {
      status: data.online ? 'online' : 'offline',
      conferences: data.conferenceCount || 0,
      participants: data.participantCount || 0,
      uptime: data.uptime || 0,
    };
    updateServerStatus();
    screen.render();
  });
  
  serverMonitor.on('error', () => {
    state.server.status = 'offline';
    updateServerStatus();
    screen.render();
  });
  
  serverMonitor.start();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Keyboard Handlers
// ═══════════════════════════════════════════════════════════════════════════════

screen.key(['q', 'C-c'], async () => {
  if (loadTestEngine) await loadTestEngine.stop();
  if (serverMonitor) serverMonitor.stop();
  process.exit(0);
});

screen.key(['s'], () => startTest());
screen.key(['x'], () => stopTest());
screen.key(['c'], () => showConfigDialog());
screen.key(['r'], () => resetStats());
screen.key(['w'], () => toggleWebRTC());
screen.key(['1'], () => applyPreset(1));
screen.key(['2'], () => applyPreset(2));
screen.key(['3'], () => applyPreset(3));
screen.key(['4'], () => applyPreset(4));

// ═══════════════════════════════════════════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════════════════════════════════════════

log('QuickRTC Load Testing TUI started', 'success');
log(`Server: ${state.config.serverUrl}`, 'info');
log('Press [W] to toggle WebRTC mode, [S] to start', 'info');

participantsGauge.setPercent(0);
errorsGauge.setPercent(0);
roomsTable.setData({ headers: ['Room', 'Users'], data: [['--', '0']] });

startServerMonitor();
updateAll();

setInterval(() => { screen.render(); }, 1000);
