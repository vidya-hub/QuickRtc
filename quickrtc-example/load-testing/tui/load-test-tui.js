#!/usr/bin/env node
/**
 * QuickRTC Load Testing Interactive TUI
 * 
 * Interactive terminal UI for running load tests with different quality tiers.
 * 
 * Usage:
 *   node tui/load-test-tui.js
 *   node tui/load-test-tui.js --url=http://localhost:3000
 */

const readline = require('readline');
const { io } = require('socket.io-client');
const http = require('http');
const https = require('https');

// Parse args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? true : value;
  return acc;
}, {});

const SERVER_URL = args.url || process.env.QUICKRTC_URL || 'https://192.168.29.46:3000';

// =============================================================================
// Colors (ANSI escape codes - no dependencies)
// =============================================================================
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// =============================================================================
// Configuration
// =============================================================================
const QUALITY_TIERS = {
  high: {
    name: 'HIGH',
    roomName: 'quickrtc-high-quality',
    quality: '1080p',
    bitrate: 2500000,
    defaultUsers: 500,
    color: 'green',
    emoji: '🟢',
  },
  medium: {
    name: 'MEDIUM',
    roomName: 'quickrtc-medium-quality',
    quality: '720p',
    bitrate: 1500000,
    defaultUsers: 1000,
    color: 'yellow',
    emoji: '🟡',
  },
  low: {
    name: 'LOW',
    roomName: 'quickrtc-low-quality',
    quality: '480p',
    bitrate: 800000,
    defaultUsers: 1500,
    color: 'cyan',
    emoji: '🔵',
  },
};

// =============================================================================
// State
// =============================================================================
const state = {
  clients: [],
  stats: {
    connected: 0,
    joined: 0,
    failed: 0,
    byRoom: {},
  },
  isRunning: false,
  selectedTier: null,
  serverOnline: false,
};

// =============================================================================
// Utility Functions
// =============================================================================
const clearScreen = () => process.stdout.write('\x1B[2J\x1B[0f');
const moveCursor = (row, col) => process.stdout.write(`\x1b[${row};${col}H`);

const formatNumber = (n) => n.toLocaleString();

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = { 
      timeout: 3000,
      rejectUnauthorized: false  // Allow self-signed certs
    };
    const req = lib.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
};

// =============================================================================
// Client Simulation
// =============================================================================
class SimulatedClient {
  constructor(tier, index) {
    this.tier = tier;
    this.index = index;
    this.id = `${tier.name.toLowerCase()}-user-${index}`;
    this.socket = null;
    this.connected = false;
    this.joined = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000,
        rejectUnauthorized: false,  // Allow self-signed certs
        query: { quality: this.tier.quality, bitrate: this.tier.bitrate },
      });

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.connected = true;
        state.stats.connected++;
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.joined = false;
      });
    });
  }

  async joinRoom() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Join timeout')), 10000);

      // Generate unique participant ID
      const participantId = `load-${this.tier.name.toLowerCase()}-${this.index}-${Date.now()}`;

      // QuickRTC SDK format: { data: { ... } } with emitWithAck style callback
      // Response format: { status: "ok"|"error", data?: {...}, error?: string }
      this.socket.emit('joinConference', {
        data: {
          conferenceId: this.tier.roomName,
          conferenceName: this.tier.roomName,
          participantId: participantId,
          participantName: this.id,
          participantInfo: { 
            quality: this.tier.quality, 
            tier: this.tier.name, 
            simulated: true,
            bitrate: this.tier.bitrate 
          },
        }
      }, (response) => {
        clearTimeout(timeout);
        
        // Handle both error formats
        if (!response || response.status === 'error' || response.error) {
          reject(new Error(response?.error || 'Join failed'));
          return;
        }
        
        this.joined = true;
        this.participantId = participantId;
        state.stats.joined++;
        if (!state.stats.byRoom[this.tier.roomName]) {
          state.stats.byRoom[this.tier.roomName] = 0;
        }
        state.stats.byRoom[this.tier.roomName]++;
        resolve(response);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.joined = false;
  }
}

// =============================================================================
// Load Test Runner
// =============================================================================
async function spawnUsers(tier, count, ratePerSecond = 20) {
  state.isRunning = true;
  let spawned = 0;
  let failed = 0;

  while (spawned < count && state.isRunning) {
    const batch = Math.min(ratePerSecond, count - spawned);
    const promises = [];

    for (let i = 0; i < batch; i++) {
      const client = new SimulatedClient(tier, spawned + i);
      state.clients.push(client);
      
      promises.push(
        client.connect()
          .then(() => client.joinRoom())
          .catch(() => {
            state.stats.failed++;
            failed++;
            client.disconnect();
          })
      );
    }

    await Promise.all(promises);
    spawned += batch;

    // Update display
    renderStatus(`Spawning ${tier.name}: ${spawned}/${count} (${failed} failed)`);
    
    if (spawned < count) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { spawned, failed };
}

function stopAllClients() {
  state.isRunning = false;
  for (const client of state.clients) {
    client.disconnect();
  }
  state.clients = [];
  state.stats = { connected: 0, joined: 0, failed: 0, byRoom: {} };
}

// =============================================================================
// UI Rendering
// =============================================================================
function renderHeader() {
  console.log();
  console.log(c('bold', c('magenta', '  ╔═══════════════════════════════════════════════════════════╗')));
  console.log(c('bold', c('magenta', '  ║') + c('white', '     QuickRTC Load Testing TUI                           ') + c('magenta', '║')));
  console.log(c('bold', c('magenta', '  ╚═══════════════════════════════════════════════════════════╝')));
  console.log();
  console.log(c('dim', `  Server: ${c('cyan', SERVER_URL)}`));
  console.log(c('dim', `  Status: ${state.serverOnline ? c('green', '● Online') : c('red', '● Offline')}`));
  console.log();
}

function renderMenu() {
  console.log(c('bold', '  ─────────────────────────────────────────────────────────────'));
  console.log(c('bold', c('white', '  SELECT LOAD TEST:')));
  console.log(c('bold', '  ─────────────────────────────────────────────────────────────'));
  console.log();
  
  Object.entries(QUALITY_TIERS).forEach(([key, tier], index) => {
    const num = index + 1;
    const url = `${SERVER_URL}?room=${tier.roomName}`;
    console.log(`  ${c('bold', c(tier.color, `[${num}]`))} ${tier.emoji} ${c('bold', tier.name)} Quality (${tier.quality})`);
    console.log(c('dim', `      Room: ${tier.roomName}`));
    console.log(c('dim', `      URL:  ${url}`));
    console.log(c('dim', `      Default Users: ${tier.defaultUsers}`));
    console.log();
  });

  console.log(`  ${c('bold', c('white', '[4]'))} 🚀 Run ALL (3000 users: 500 high + 1000 med + 1500 low)`);
  console.log();
  console.log(`  ${c('bold', c('red', '[S]'))} Stop all running tests`);
  console.log(`  ${c('bold', c('cyan', '[M]'))} Monitor server stats`);
  console.log(`  ${c('bold', c('yellow', '[Q]'))} Quit`);
  console.log();
  console.log(c('bold', '  ─────────────────────────────────────────────────────────────'));
}

function renderStats() {
  console.log();
  console.log(c('bold', '  ─────────────────────────────────────────────────────────────'));
  console.log(c('bold', c('white', '  CURRENT STATS:')));
  console.log(c('bold', '  ─────────────────────────────────────────────────────────────'));
  console.log();
  console.log(`  ${c('green', 'Connected:')} ${formatNumber(state.stats.connected)}`);
  console.log(`  ${c('cyan', 'Joined:')}    ${formatNumber(state.stats.joined)}`);
  console.log(`  ${c('red', 'Failed:')}    ${formatNumber(state.stats.failed)}`);
  console.log(`  ${c('yellow', 'Active:')}    ${formatNumber(state.clients.length)}`);
  console.log();
  
  if (Object.keys(state.stats.byRoom).length > 0) {
    console.log(c('dim', '  Per Room:'));
    Object.entries(state.stats.byRoom).forEach(([room, count]) => {
      console.log(c('dim', `    ${room}: ${count}`));
    });
    console.log();
  }
}

function renderStatus(message) {
  // Simple status update
  process.stdout.write(`\r  ${c('yellow', '⏳')} ${message}                    `);
}

async function renderMonitor() {
  clearScreen();
  renderHeader();
  
  try {
    const stats = await fetchJson(`${SERVER_URL}/stats`);
    state.serverOnline = true;
    
    console.log(c('bold', '  ─────────────────────────────────────────────────────────────'));
    console.log(c('bold', c('white', '  SERVER MONITOR (refreshing every 2s, press any key to exit)')));
    console.log(c('bold', '  ─────────────────────────────────────────────────────────────'));
    console.log();
    console.log(`  ${c('cyan', 'Conferences:')}  ${stats.conferenceCount || 0}`);
    console.log(`  ${c('green', 'Participants:')} ${stats.participantCount || 0}`);
    console.log(`  ${c('yellow', 'Connections:')}  ${stats.totalConnections || 0}`);
    console.log();
    
    if (stats.conferences && stats.conferences.length > 0) {
      console.log(c('bold', '  Active Rooms:'));
      stats.conferences.forEach((conf, i) => {
        const name = conf.name || conf.id;
        const users = conf.participantCount || 0;
        const bar = '█'.repeat(Math.min(Math.ceil(users / 50), 20));
        const emptyBar = '░'.repeat(20 - bar.length);
        console.log(`  ${i + 1}. ${name.padEnd(25)} │${c('green', bar)}${c('dim', emptyBar)}│ ${users} users`);
      });
    } else {
      console.log(c('dim', '  No active conferences'));
    }
    
  } catch (error) {
    state.serverOnline = false;
    console.log(c('red', `  Error: ${error.message}`));
  }
}

// =============================================================================
// Main TUI Loop
// =============================================================================
async function checkServer() {
  try {
    await fetchJson(`${SERVER_URL}/health`);
    state.serverOnline = true;
  } catch {
    state.serverOnline = false;
  }
}

async function promptUsers(tier) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(c('cyan', `  Enter number of users (default: ${tier.defaultUsers}): `), (answer) => {
      rl.close();
      const num = parseInt(answer) || tier.defaultUsers;
      resolve(num);
    });
  });
}

async function main() {
  // Set up raw mode for key detection
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  await checkServer();

  let inMonitor = false;
  let monitorInterval = null;

  const render = () => {
    if (inMonitor) return;
    clearScreen();
    renderHeader();
    renderStats();
    renderMenu();
    process.stdout.write(c('cyan', '  Enter choice: '));
  };

  render();

  process.stdin.on('keypress', async (str, key) => {
    if (key.ctrl && key.name === 'c') {
      stopAllClients();
      console.log('\n\n  Goodbye!\n');
      process.exit();
    }

    // Exit monitor mode on any key
    if (inMonitor) {
      inMonitor = false;
      if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
      }
      render();
      return;
    }

    const choice = str?.toLowerCase();

    switch (choice) {
      case '1': // High quality
        console.log();
        const highUsers = await promptUsers(QUALITY_TIERS.high);
        console.log(c('green', `\n  Starting HIGH quality test with ${highUsers} users...\n`));
        await spawnUsers(QUALITY_TIERS.high, highUsers);
        console.log(c('green', '\n  ✅ Done!\n'));
        setTimeout(render, 1500);
        break;

      case '2': // Medium quality
        console.log();
        const medUsers = await promptUsers(QUALITY_TIERS.medium);
        console.log(c('yellow', `\n  Starting MEDIUM quality test with ${medUsers} users...\n`));
        await spawnUsers(QUALITY_TIERS.medium, medUsers);
        console.log(c('green', '\n  ✅ Done!\n'));
        setTimeout(render, 1500);
        break;

      case '3': // Low quality
        console.log();
        const lowUsers = await promptUsers(QUALITY_TIERS.low);
        console.log(c('cyan', `\n  Starting LOW quality test with ${lowUsers} users...\n`));
        await spawnUsers(QUALITY_TIERS.low, lowUsers);
        console.log(c('green', '\n  ✅ Done!\n'));
        setTimeout(render, 1500);
        break;

      case '4': // All tiers
        console.log(c('magenta', '\n  Starting FULL load test (3000 users)...\n'));
        console.log(c('green', '  Phase 1: HIGH quality (500 users)'));
        await spawnUsers(QUALITY_TIERS.high, 500);
        console.log(c('yellow', '\n  Phase 2: MEDIUM quality (1000 users)'));
        await spawnUsers(QUALITY_TIERS.medium, 1000);
        console.log(c('cyan', '\n  Phase 3: LOW quality (1500 users)'));
        await spawnUsers(QUALITY_TIERS.low, 1500);
        console.log(c('green', '\n  ✅ Full load test complete!\n'));
        setTimeout(render, 2000);
        break;

      case 's': // Stop
        console.log(c('red', '\n  Stopping all tests...\n'));
        stopAllClients();
        setTimeout(render, 1000);
        break;

      case 'm': // Monitor
        inMonitor = true;
        await renderMonitor();
        monitorInterval = setInterval(async () => {
          if (inMonitor) await renderMonitor();
        }, 2000);
        break;

      case 'q': // Quit
        stopAllClients();
        console.log('\n\n  Goodbye!\n');
        process.exit();
        break;

      default:
        // Ignore other keys
        break;
    }
  });
}

// Handle exit
process.on('SIGINT', () => {
  stopAllClients();
  console.log('\n\n  Goodbye!\n');
  process.exit();
});

process.on('SIGTERM', () => {
  stopAllClients();
  process.exit();
});

// Start
main().catch(console.error);
