#!/usr/bin/env node
/**
 * QuickRTC Load Testing TUI (Simplified)
 * 
 * Simple interface: Select quality tier, enter participant count, run test.
 * Uses Playwright with Chromium for real WebRTC video streams (no audio).
 * 
 * Usage:
 *   node tui/load-test-tui.js
 *   node tui/load-test-tui.js --url=https://192.168.29.46:3000
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

// Parse args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? true : value;
  return acc;
}, {});

const SERVER_URL = args.url || process.env.QUICKRTC_URL || 'https://192.168.29.46:3000';

// Colors
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
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Quality Tiers
const QUALITY_TIERS = {
  '1': { name: 'HIGH', resolution: '1080p', roomPrefix: 'high-quality', color: 'green' },
  '2': { name: 'MEDIUM', resolution: '720p', roomPrefix: 'medium-quality', color: 'yellow' },
  '3': { name: 'LOW', resolution: '480p', roomPrefix: 'low-quality', color: 'cyan' },
};

// State
const state = {
  engine: null,
  isRunning: false,
  serverOnline: false,
  stats: {
    connected: 0,
    failed: 0,
    producers: 0,
    consumers: 0,
  },
};

// Utility
const clearScreen = () => process.stdout.write('\x1B[2J\x1B[0f');

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 3000, rejectUnauthorized: false }, (res) => {
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

// Check server status
async function checkServer() {
  try {
    await fetchJson(`${SERVER_URL}/health`);
    state.serverOnline = true;
  } catch {
    state.serverOnline = false;
  }
}

// Run WebRTC Load Test
async function runLoadTest(tier, userCount, duration = 120) {
  const { PlaywrightLoadTestEngine } = require('./lib/playwright-load-test-engine');
  
  const config = {
    serverUrl: SERVER_URL,
    users: userCount,
    duration: duration,
    spawnRate: 2,
    usersPerRoom: 50,
    headless: true,
    produceVideo: true,
    produceAudio: false, // Video only
    resolution: tier.resolution,
    browserType: 'chromium',
    roomPrefix: tier.roomPrefix,
  };
  
  state.engine = new PlaywrightLoadTestEngine(config);
  state.isRunning = true;
  state.stats = { connected: 0, failed: 0, producers: 0, consumers: 0 };
  
  console.log();
  console.log(c('bold', `  Starting ${c(tier.color, tier.name)} quality test`));
  console.log(c('dim', `  Users: ${userCount} | Duration: ${duration}s | Resolution: ${tier.resolution}`));
  console.log(c('dim', `  Room: ${tier.roomPrefix}-room-0`));
  console.log();
  
  state.engine.on('browserLaunched', () => {
    console.log(c('green', '  Browser launched'));
  });
  
  state.engine.on('launched', ({ total }) => {
    process.stdout.write(`\r  Launching: ${total}/${userCount}                    `);
  });
  
  state.engine.on('connected', ({ total, latency }) => {
    state.stats.connected = total;
    process.stdout.write(`\r  Connected: ${total}/${userCount} (latency: ${latency}ms)                    `);
  });
  
  state.engine.on('failed', ({ userIndex, error }) => {
    state.stats.failed++;
  });
  
  state.engine.on('tick', (elapsed) => {
    const remaining = duration - elapsed;
    const webrtc = state.engine.stats.webrtc;
    state.stats.producers = webrtc.producers;
    state.stats.consumers = webrtc.consumers;
    process.stdout.write(`\r  Running: ${elapsed}s/${duration}s | Producers: ${webrtc.producers} | Consumers: ${webrtc.consumers} | Remaining: ${remaining}s          `);
  });
  
  state.engine.on('complete', (results) => {
    state.isRunning = false;
    console.log('\n');
    console.log(c('green', '  Test Complete!'));
    console.log(`  Connected: ${results.connected}/${userCount}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Avg Latency: ${results.avgLatency}ms`);
    console.log(`  Producers: ${results.webrtc.producers}`);
    console.log(`  Consumers: ${results.webrtc.consumers}`);
    console.log(`  Data Sent: ${(results.webrtc.bytesSent / 1024 / 1024).toFixed(2)} MB`);
    console.log();
  });
  
  state.engine.on('error', ({ message }) => {
    console.log(c('red', `  Error: ${message}`));
  });
  
  await state.engine.start();
  
  return new Promise((resolve) => {
    state.engine.on('complete', resolve);
  });
}

// Stop test
function stopTest() {
  if (state.engine) {
    state.engine.stop();
    state.engine = null;
  }
  state.isRunning = false;
}

// Render UI
function renderHeader() {
  console.log();
  console.log(c('bold', c('magenta', '  QuickRTC Load Testing')));
  console.log(c('dim', '  ─────────────────────────────────────'));
  console.log(c('dim', `  Server: ${c('cyan', SERVER_URL)}`));
  console.log(c('dim', `  Status: ${state.serverOnline ? c('green', 'Online') : c('red', 'Offline')}`));
  console.log();
}

function renderMenu() {
  console.log(c('bold', '  Select Quality Tier:'));
  console.log();
  console.log(`  ${c('bold', c('green', '[1]'))} HIGH   (1080p)`);
  console.log(`  ${c('bold', c('yellow', '[2]'))} MEDIUM (720p)`);
  console.log(`  ${c('bold', c('cyan', '[3]'))} LOW    (480p)`);
  console.log();
  console.log(c('dim', '  ─────────────────────────────────────'));
  console.log(`  ${c('bold', c('blue', '[M]'))} Monitor server stats`);
  console.log(`  ${c('bold', c('red', '[S]'))} Stop running test`);
  console.log(`  ${c('bold', c('yellow', '[Q]'))} Quit`);
  console.log(c('dim', '  ─────────────────────────────────────'));
  console.log();
}

async function renderMonitor() {
  try {
    const stats = await fetchJson(`${SERVER_URL}/stats`);
    clearScreen();
    renderHeader();
    console.log(c('bold', '  Server Stats (press any key to exit):'));
    console.log();
    console.log(`  Conferences:  ${stats.conferenceCount || 0}`);
    console.log(`  Participants: ${stats.participantCount || 0}`);
    console.log(`  Producers:    ${stats.producerCount || 0}`);
    console.log(`  Consumers:    ${stats.consumerCount || 0}`);
    console.log();
    
    if (stats.conferences && stats.conferences.length > 0) {
      console.log(c('dim', '  Active Rooms:'));
      stats.conferences.forEach((conf, i) => {
        console.log(`    ${conf.name || conf.id}: ${conf.participantCount || 0} users`);
      });
    }
  } catch (error) {
    console.log(c('red', `  Error: ${error.message}`));
  }
}

// Prompt for user count
function promptNumber(question, defaultValue) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Temporarily disable raw mode for readline
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    
    rl.question(c('cyan', question), (answer) => {
      rl.close();
      // Re-enable raw mode
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      resolve(parseInt(answer) || defaultValue);
    });
  });
}

// Main
async function main() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  await checkServer();

  let inMonitor = false;
  let monitorInterval = null;

  const render = () => {
    if (inMonitor || state.isRunning) return;
    clearScreen();
    renderHeader();
    renderMenu();
    process.stdout.write(c('cyan', '  Enter choice: '));
  };

  render();

  process.stdin.on('keypress', async (str, key) => {
    // Ctrl+C to exit
    if (key.ctrl && key.name === 'c') {
      stopTest();
      console.log('\n\n  Goodbye!\n');
      process.exit();
    }

    // Exit monitor mode
    if (inMonitor) {
      inMonitor = false;
      if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
      }
      render();
      return;
    }

    // Skip if test is running (except 's' to stop)
    if (state.isRunning && str?.toLowerCase() !== 's') {
      return;
    }

    const choice = str?.toLowerCase();

    switch (choice) {
      case '1':
      case '2':
      case '3':
        const tier = QUALITY_TIERS[choice];
        console.log();
        const users = await promptNumber(`  Number of participants (default 10): `, 10);
        const duration = await promptNumber(`  Duration in seconds (default 120): `, 120);
        await runLoadTest(tier, users, duration);
        setTimeout(render, 2000);
        break;

      case 'm':
        inMonitor = true;
        await renderMonitor();
        monitorInterval = setInterval(async () => {
          if (inMonitor) await renderMonitor();
        }, 2000);
        break;

      case 's':
        if (state.isRunning) {
          console.log(c('red', '\n\n  Stopping test...\n'));
          stopTest();
          setTimeout(render, 1000);
        }
        break;

      case 'q':
        stopTest();
        console.log('\n\n  Goodbye!\n');
        process.exit();
        break;
    }
  });
}

// Handle exit
process.on('SIGINT', () => {
  stopTest();
  console.log('\n\n  Goodbye!\n');
  process.exit();
});

process.on('SIGTERM', () => {
  stopTest();
  process.exit();
});

main().catch(console.error);
