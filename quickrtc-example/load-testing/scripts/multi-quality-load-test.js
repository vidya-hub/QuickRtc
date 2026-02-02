#!/usr/bin/env node
/**
 * QuickRTC Multi-Quality Load Test
 * 
 * Simulates 3000 users across 3 quality tiers:
 *   - HIGH (1080p):  500 users  -> Room: quickrtc-high-quality
 *   - MEDIUM (720p): 1000 users -> Room: quickrtc-medium-quality  
 *   - LOW (480p):    1500 users -> Room: quickrtc-low-quality
 * 
 * Usage:
 *   node scripts/multi-quality-load-test.js
 *   node scripts/multi-quality-load-test.js --url=http://localhost:3000
 *   node scripts/multi-quality-load-test.js --dry-run
 * 
 * Room URLs (for manual joining):
 *   High:   http://localhost:3000?room=quickrtc-high-quality
 *   Medium: http://localhost:3000?room=quickrtc-medium-quality
 *   Low:    http://localhost:3000?room=quickrtc-low-quality
 */

const { io } = require('socket.io-client');
const chalk = require('chalk');

// =============================================================================
// Configuration
// =============================================================================

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? true : value;
  return acc;
}, {});

const CONFIG = {
  serverUrl: args.url || process.env.QUICKRTC_URL || 'https://192.168.29.46:3000',
  dryRun: args['dry-run'] || false,
  
  // Quality tiers with room configurations
  tiers: [
    {
      name: 'HIGH',
      roomName: 'quickrtc-high-quality',
      users: parseInt(args.high) || 500,
      quality: '1080p',
      bitrate: 2500000,  // 2.5 Mbps
      color: chalk.green,
    },
    {
      name: 'MEDIUM', 
      roomName: 'quickrtc-medium-quality',
      users: parseInt(args.medium) || 1000,
      quality: '720p',
      bitrate: 1500000,  // 1.5 Mbps
      color: chalk.yellow,
    },
    {
      name: 'LOW',
      roomName: 'quickrtc-low-quality', 
      users: parseInt(args.low) || 1500,
      quality: '480p',
      bitrate: 800000,   // 800 Kbps
      color: chalk.cyan,
    },
  ],
  
  // Spawn rates (users per second)
  spawnRate: parseInt(args.rate) || 50,
  
  // Test duration in seconds
  duration: parseInt(args.duration) || 300,  // 5 minutes default
  
  // Connection settings
  reconnection: false,
  timeout: 10000,
};

// =============================================================================
// State
// =============================================================================

const state = {
  clients: [],
  stats: {
    total: { connected: 0, joined: 0, failed: 0, errors: [] },
    byTier: {},
  },
  startTime: null,
  isRunning: false,
};

// Initialize tier stats
CONFIG.tiers.forEach(tier => {
  state.stats.byTier[tier.name] = { connected: 0, joined: 0, failed: 0 };
});

// =============================================================================
// Utility Functions
// =============================================================================

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString().substr(11, 8);
  const icons = { info: 'ℹ️ ', success: '✅', error: '❌', warn: '⚠️ ', start: '🚀' };
  console.log(chalk.gray(`[${timestamp}]`), icons[type] || '', message);
};

const formatNumber = (n) => n.toLocaleString();

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    this.participantId = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONFIG.timeout);

      this.socket = io(CONFIG.serverUrl, {
        transports: ['websocket'],
        reconnection: CONFIG.reconnection,
        timeout: CONFIG.timeout,
        rejectUnauthorized: false,  // Allow self-signed certs
        query: {
          quality: this.tier.quality,
          bitrate: this.tier.bitrate,
        },
      });

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.connected = true;
        state.stats.total.connected++;
        state.stats.byTier[this.tier.name].connected++;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.joined = false;
      });
    });
  }

  async joinRoom() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join timeout'));
      }, CONFIG.timeout);

      // Generate unique participant ID
      const participantId = `load-${this.tier.name.toLowerCase()}-${this.index}-${Date.now()}`;

      // QuickRTC SDK format: { data: { ... } }
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
            bitrate: this.tier.bitrate,
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
        state.stats.total.joined++;
        state.stats.byTier[this.tier.name].joined++;
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

async function spawnUser(tier, index) {
  const client = new SimulatedClient(tier, index);
  state.clients.push(client);

  try {
    await client.connect();
    await client.joinRoom();
    return true;
  } catch (error) {
    state.stats.total.failed++;
    state.stats.byTier[tier.name].failed++;
    state.stats.total.errors.push({
      tier: tier.name,
      user: client.id,
      error: error.message,
    });
    client.disconnect();
    return false;
  }
}

async function spawnTierUsers(tier) {
  log(`Spawning ${formatNumber(tier.users)} users for ${tier.color(tier.name)} quality room...`, 'start');
  
  const batchSize = CONFIG.spawnRate;
  let spawned = 0;

  while (spawned < tier.users && state.isRunning) {
    const batch = Math.min(batchSize, tier.users - spawned);
    const promises = [];

    for (let i = 0; i < batch; i++) {
      promises.push(spawnUser(tier, spawned + i));
    }

    await Promise.all(promises);
    spawned += batch;

    // Progress update
    const percent = Math.round((spawned / tier.users) * 100);
    process.stdout.write(`\r  ${tier.color(tier.name)}: ${formatNumber(spawned)}/${formatNumber(tier.users)} (${percent}%) `);

    // Wait before next batch
    await sleep(1000);
  }

  console.log(); // New line after progress
}

function printStatus() {
  console.log();
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold.white('  📊 LOAD TEST STATUS'));
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
  
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  console.log(chalk.gray(`  Elapsed: ${formatDuration(elapsed)}`));
  console.log();

  // Per-tier stats
  CONFIG.tiers.forEach(tier => {
    const stats = state.stats.byTier[tier.name];
    const successRate = stats.joined > 0 ? Math.round((stats.joined / (stats.joined + stats.failed)) * 100) : 0;
    
    console.log(tier.color(`  ${tier.name} Quality (${tier.roomName})`));
    console.log(chalk.gray(`    Target: ${formatNumber(tier.users)} | Joined: ${formatNumber(stats.joined)} | Failed: ${formatNumber(stats.failed)} | Success: ${successRate}%`));
  });

  console.log();
  console.log(chalk.bold('  TOTALS'));
  console.log(chalk.gray(`    Connected: ${formatNumber(state.stats.total.connected)}`));
  console.log(chalk.gray(`    Joined:    ${formatNumber(state.stats.total.joined)}`));
  console.log(chalk.gray(`    Failed:    ${formatNumber(state.stats.total.failed)}`));
  
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
  console.log();
}

function printRoomUrls() {
  console.log();
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold.white('  🔗 JOIN THESE ROOMS TO TEST'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  
  CONFIG.tiers.forEach(tier => {
    const url = `${CONFIG.serverUrl}?room=${tier.roomName}`;
    console.log();
    console.log(tier.color(`  ${tier.name} Quality (${tier.quality}):`));
    console.log(chalk.white(`    ${url}`));
  });

  console.log();
  console.log(chalk.gray('  Open these URLs in a browser to join the test rooms'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  console.log();
}

async function runLoadTest() {
  state.isRunning = true;
  state.startTime = Date.now();

  console.log();
  console.log(chalk.bold.magenta('╔═══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║     QuickRTC Multi-Quality Load Test                         ║'));
  console.log(chalk.bold.magenta('╚═══════════════════════════════════════════════════════════════╝'));
  console.log();
  
  log(`Server: ${chalk.cyan(CONFIG.serverUrl)}`, 'info');
  log(`Duration: ${chalk.yellow(formatDuration(CONFIG.duration))}`, 'info');
  log(`Spawn Rate: ${chalk.yellow(CONFIG.spawnRate + '/sec')}`, 'info');
  
  const totalUsers = CONFIG.tiers.reduce((sum, t) => sum + t.users, 0);
  log(`Total Users: ${chalk.green(formatNumber(totalUsers))}`, 'info');

  // Print room URLs first
  printRoomUrls();

  if (CONFIG.dryRun) {
    log('Dry run mode - not spawning actual connections', 'warn');
    return;
  }

  // Check server health
  try {
    const response = await fetch(`${CONFIG.serverUrl}/health`);
    if (!response.ok) throw new Error('Server not healthy');
    log('Server health check passed', 'success');
  } catch (error) {
    log(`Server not reachable: ${error.message}`, 'error');
    process.exit(1);
  }

  console.log();
  log('Starting load test...', 'start');
  console.log();

  // Spawn users for each tier (can run in parallel or sequential)
  // Running sequentially for better control
  for (const tier of CONFIG.tiers) {
    await spawnTierUsers(tier);
  }

  log('All users spawned! Holding connections...', 'success');
  printStatus();

  // Hold connections for the duration
  const holdTime = CONFIG.duration * 1000 - (Date.now() - state.startTime);
  if (holdTime > 0) {
    log(`Holding for ${formatDuration(holdTime / 1000)}...`, 'info');
    
    // Status updates every 30 seconds
    const statusInterval = setInterval(() => {
      if (state.isRunning) printStatus();
    }, 30000);

    await sleep(holdTime);
    clearInterval(statusInterval);
  }

  // Cleanup
  await cleanup();
}

async function cleanup() {
  log('Cleaning up connections...', 'info');
  state.isRunning = false;

  // Disconnect all clients
  for (const client of state.clients) {
    client.disconnect();
  }

  state.clients = [];
  
  printStatus();
  log('Load test complete!', 'success');

  // Print errors if any
  if (state.stats.total.errors.length > 0) {
    console.log();
    log(`Errors (${state.stats.total.errors.length}):`, 'error');
    state.stats.total.errors.slice(0, 10).forEach(err => {
      console.log(chalk.red(`  - [${err.tier}] ${err.user}: ${err.error}`));
    });
    if (state.stats.total.errors.length > 10) {
      console.log(chalk.gray(`  ... and ${state.stats.total.errors.length - 10} more`));
    }
  }
}

// =============================================================================
// Main
// =============================================================================

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log();
  log('Received SIGINT, shutting down...', 'warn');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM, shutting down...', 'warn');
  await cleanup();
  process.exit(0);
});

// Run
runLoadTest().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
