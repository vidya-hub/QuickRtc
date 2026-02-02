#!/usr/bin/env node
/**
 * QuickRTC Load Testing CLI Monitor
 * 
 * Simple CLI dashboard for monitoring QuickRTC server during load tests.
 * 
 * Usage:
 *   node tui/monitor.js
 *   node tui/monitor.js --url=http://localhost:3000
 */

const http = require('http');
const https = require('https');
const chalk = require('chalk');

// Parse args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const SERVER_URL = args.url || process.env.QUICKRTC_URL || 'http://localhost:3000';
const POLL_INTERVAL = parseInt(args.interval) || 2000;

// State
let lastStats = null;
let startTime = Date.now();

// Formatting helpers
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Fetch stats from server
const fetchStats = (url) => {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    
    const req = lib.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

// Clear screen and move cursor to top
const clearScreen = () => {
  process.stdout.write('\x1B[2J\x1B[0f');
};

// Render dashboard
const render = (stats, error = null) => {
  clearScreen();
  
  const width = process.stdout.columns || 80;
  const line = '─'.repeat(width - 2);
  
  console.log(chalk.cyan.bold(`\n  ⚡ QuickRTC Load Test Monitor ⚡`));
  console.log(chalk.gray(`  ${line}`));
  
  if (error) {
    console.log(chalk.red(`\n  ❌ Server Offline: ${error.message}`));
    console.log(chalk.gray(`  URL: ${SERVER_URL}`));
    console.log(chalk.yellow(`\n  Retrying in ${POLL_INTERVAL/1000}s...`));
    return;
  }
  
  // Server Status
  console.log(chalk.green(`\n  🟢 Server Online`));
  console.log(chalk.gray(`  URL: `) + chalk.cyan(SERVER_URL));
  console.log(chalk.gray(`  Uptime: `) + chalk.white(formatDuration(stats.uptime || 0)));
  
  console.log(chalk.gray(`\n  ${line}`));
  
  // Main Stats
  console.log(chalk.yellow.bold(`\n  📊 Stats`));
  console.log(chalk.gray(`  Conferences: `) + chalk.cyan.bold(stats.conferenceCount || 0));
  console.log(chalk.gray(`  Participants: `) + chalk.green.bold(stats.participantCount || 0));
  console.log(chalk.gray(`  Connections: `) + chalk.white(stats.totalConnections || 0));
  
  // Conferences detail
  if (stats.conferences && stats.conferences.length > 0) {
    console.log(chalk.gray(`\n  ${line}`));
    console.log(chalk.blue.bold(`\n  🏠 Active Conferences`));
    
    stats.conferences.forEach((conf, i) => {
      const name = conf.name || conf.id;
      const users = conf.participantCount || 0;
      const bar = '█'.repeat(Math.min(users, 20)) + chalk.gray('░'.repeat(Math.max(0, 20 - users)));
      console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(name.substring(0, 20).padEnd(20)) + 
                  chalk.gray(' │ ') + bar + chalk.gray(' │ ') + chalk.cyan(users + ' users'));
    });
  }
  
  console.log(chalk.gray(`\n  ${line}`));
  
  // Monitor time
  const monitorTime = Math.floor((Date.now() - startTime) / 1000);
  console.log(chalk.gray(`\n  Monitor running: ${formatDuration(monitorTime)}`));
  console.log(chalk.gray(`  Press Ctrl+C to exit\n`));
};

// Main loop
const poll = async () => {
  try {
    const stats = await fetchStats(`${SERVER_URL}/stats`);
    lastStats = stats;
    render(stats);
  } catch (error) {
    render(null, error);
  }
};

// Start
console.log(chalk.cyan(`\nConnecting to ${SERVER_URL}...`));

poll();
const interval = setInterval(poll, POLL_INTERVAL);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log(chalk.yellow('\n\nMonitor stopped.\n'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(interval);
  process.exit(0);
});
