#!/usr/bin/env node
/**
 * QuickRTC WebRTC Load Test - Playwright Version
 * 
 * Uses Playwright to launch headless browsers that produce
 * real WebRTC video/audio streams using mediasoup-client.
 * 
 * Benefits over Puppeteer:
 * - Multi-browser support (Chromium, Firefox, WebKit)
 * - Better context isolation per user
 * - Auto-wait features
 * - Faster execution with parallel contexts
 * - Better debugging (trace viewer, video recording)
 * 
 * Usage:
 *   node scripts/playwright-load-test.js --users=10 --duration=60
 *   node scripts/playwright-load-test.js --users=5 --browser=firefox
 *   npm run test:playwright:smoke
 * 
 * Options:
 *   --url           Server URL (default: http://localhost:3000)
 *   --users         Number of users (default: 5)
 *   --duration      Test duration in seconds (default: 60)
 *   --spawnRate     Users per second (default: 1)
 *   --usersPerRoom  Max users per room (default: 5)
 *   --headless      Run headless (default: true)
 *   --video         Enable video (default: true)
 *   --audio         Enable audio (default: true)
 *   --browser       Browser: chromium, firefox, webkit (default: chromium)
 *   --verbose       Show browser console logs
 *   --trace         Enable trace recording for debugging
 */

const { chromium, firefox, webkit } = require('playwright');
const path = require('path');
const fs = require('fs');

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? 'true' : value;
  return acc;
}, {});

const CONFIG = {
  serverUrl: args.url || 'http://localhost:3000',
  totalUsers: parseInt(args.users || '5'),
  duration: parseInt(args.duration || '60') * 1000,
  spawnRate: parseFloat(args.spawnRate || '1'),
  usersPerRoom: parseInt(args.usersPerRoom || '5'),
  headless: args.headless !== 'false',
  produceVideo: args.video !== 'false',
  produceAudio: args.audio !== 'false',
  browserType: args.browser || 'chromium',
  verbose: args.verbose === 'true',
  trace: args.trace === 'true',
};

// Validate browser type
const browserTypes = { chromium, firefox, webkit };
if (!browserTypes[CONFIG.browserType]) {
  console.error(`Invalid browser: ${CONFIG.browserType}. Use chromium, firefox, or webkit`);
  process.exit(1);
}

console.log('\n' + '='.repeat(65));
console.log('  QuickRTC WebRTC Load Test (Playwright)');
console.log('='.repeat(65));
console.log(`  Server:      ${CONFIG.serverUrl}`);
console.log(`  Users:       ${CONFIG.totalUsers}`);
console.log(`  Duration:    ${CONFIG.duration / 1000}s`);
console.log(`  Spawn Rate:  ${CONFIG.spawnRate}/s`);
console.log(`  Users/Room:  ${CONFIG.usersPerRoom}`);
console.log(`  Headless:    ${CONFIG.headless}`);
console.log(`  Video:       ${CONFIG.produceVideo}`);
console.log(`  Audio:       ${CONFIG.produceAudio}`);
console.log(`  Browser:     ${CONFIG.browserType}`);
console.log(`  Trace:       ${CONFIG.trace}`);
console.log('='.repeat(65) + '\n');

// Stats tracking
const stats = {
  launched: 0,
  connected: 0,
  producing: 0,
  failed: 0,
  errors: [],
  webrtcStats: {
    totalBytesSent: 0,
    totalBytesReceived: 0,
    avgBitrateSent: 0,
    avgBitrateReceived: 0,
    producerCount: 0,
    consumerCount: 0,
  },
  startTime: Date.now(),
};

// Active browser contexts
const contexts = [];
let browser = null;

function getRoomId(userIndex) {
  const roomIndex = Math.floor(userIndex / CONFIG.usersPerRoom);
  return `loadtest-room-${roomIndex}`;
}

function printStats() {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log(
    `[${elapsed}s] Launched: ${stats.launched}/${CONFIG.totalUsers} | ` +
    `Connected: ${stats.connected} | Producing: ${stats.producing} | ` +
    `Failed: ${stats.failed}`
  );
}

async function launchUser(userIndex) {
  const participantId = `loadtest-${userIndex}-${Date.now().toString(36)}`;
  const participantName = `LoadUser-${userIndex}`;
  const conferenceId = getRoomId(userIndex);
  
  let context, page;
  
  try {
    // Create isolated browser context for this user
    context = await browser.newContext({
      ignoreHTTPSErrors: true, // Accept self-signed certs
      permissions: ['camera', 'microphone'], // Grant media permissions
      viewport: { width: 800, height: 600 },
      // Fake media streams
      userAgent: `QuickRTC-LoadTest/${userIndex}`,
    });
    
    // Enable trace recording if requested
    if (CONFIG.trace) {
      await context.tracing.start({ screenshots: true, snapshots: true });
    }
    
    page = await context.newPage();
    
    contexts.push({ context, page, userIndex, participantId, conferenceId });
    stats.launched++;
    
    // Listen for console logs
    if (CONFIG.verbose) {
      page.on('console', msg => {
        console.log(`  [User ${userIndex}] ${msg.text()}`);
      });
    }
    
    // Listen for errors
    page.on('pageerror', error => {
      console.error(`  [User ${userIndex}] Page error: ${error.message}`);
    });
    
    // Build URL with params
    const url = new URL('/loadtest', CONFIG.serverUrl);
    url.searchParams.set('participantId', participantId);
    url.searchParams.set('participantName', participantName);
    url.searchParams.set('conferenceId', conferenceId);
    url.searchParams.set('video', CONFIG.produceVideo.toString());
    url.searchParams.set('audio', CONFIG.produceAudio.toString());
    
    // Navigate to load test page with auto-wait
    await page.goto(url.toString(), { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for load test to be ready using Playwright's auto-retry
    await page.waitForFunction('window.loadTestReady === true', { timeout: 30000 });
    
    // Check if successful
    const success = await page.evaluate(() => window.loadTestSuccess);
    
    if (success) {
      stats.connected++;
      
      // Check if producing
      const webrtcStats = await page.evaluate(() => window.webrtcStats);
      if (webrtcStats && webrtcStats.producers > 0) {
        stats.producing++;
      }
      
      console.log(`  ✓ User ${userIndex} joined ${conferenceId} as ${participantName}`);
    } else {
      const error = await page.evaluate(() => window.loadTestError);
      throw new Error(error || 'Unknown error');
    }
    
    return { context, page, userIndex, participantId, conferenceId };
    
  } catch (error) {
    stats.failed++;
    stats.errors.push({ userIndex, error: error.message });
    console.error(`  ✗ User ${userIndex} failed: ${error.message}`);
    
    if (context) {
      try { 
        if (CONFIG.trace) {
          // Save trace for failed users
          const tracePath = path.join(__dirname, '..', 'traces', `user-${userIndex}-trace.zip`);
          fs.mkdirSync(path.dirname(tracePath), { recursive: true });
          await context.tracing.stop({ path: tracePath });
          console.log(`  Trace saved to: ${tracePath}`);
        }
        await context.close(); 
      } catch (e) {}
    }
    
    return null;
  }
}

async function collectWebRTCStats() {
  let totalBytesSent = 0;
  let totalBytesReceived = 0;
  let producerCount = 0;
  let consumerCount = 0;
  
  for (const { page, context } of contexts) {
    try {
      if (context && !context._closed) {
        const webrtcStats = await page.evaluate(() => window.webrtcStats).catch(() => null);
        if (webrtcStats) {
          for (const ps of webrtcStats.producerStats || []) {
            totalBytesSent += ps.bytesSent || 0;
            producerCount++;
          }
          for (const cs of webrtcStats.consumerStats || []) {
            totalBytesReceived += cs.bytesReceived || 0;
            consumerCount++;
          }
        }
      }
    } catch (e) {}
  }
  
  const elapsed = (Date.now() - stats.startTime) / 1000;
  stats.webrtcStats = {
    totalBytesSent,
    totalBytesReceived,
    avgBitrateSent: producerCount > 0 ? Math.round((totalBytesSent * 8 / elapsed) / producerCount / 1000) : 0,
    avgBitrateReceived: consumerCount > 0 ? Math.round((totalBytesReceived * 8 / elapsed) / consumerCount / 1000) : 0,
    producerCount,
    consumerCount,
  };
}

async function cleanup() {
  console.log('\nCleaning up...');
  
  for (const { context, userIndex } of contexts) {
    try {
      if (CONFIG.trace && !context._closed) {
        const tracePath = path.join(__dirname, '..', 'traces', `user-${userIndex}-trace.zip`);
        fs.mkdirSync(path.dirname(tracePath), { recursive: true });
        await context.tracing.stop({ path: tracePath });
      }
      await context.close();
    } catch (e) {
      console.error(`  Failed to close context ${userIndex}: ${e.message}`);
    }
  }
  
  contexts.length = 0;
  
  if (browser) {
    try {
      await browser.close();
    } catch (e) {}
  }
}

async function runLoadTest() {
  console.log('Starting load test...\n');
  
  // Launch browser (single instance, multiple contexts)
  const browserType = browserTypes[CONFIG.browserType];
  
  const launchOptions = {
    headless: CONFIG.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      // Fake media for WebRTC
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      // SSL - ignore self-signed cert errors
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      // WebRTC specific
      '--enable-webrtc-hide-local-ips-with-mdns=false',
    ],
  };
  
  // Firefox and WebKit don't support all Chrome args
  if (CONFIG.browserType !== 'chromium') {
    launchOptions.args = [];
  }
  
  console.log(`Launching ${CONFIG.browserType} browser...`);
  browser = await browserType.launch(launchOptions);
  console.log('Browser launched!\n');
  
  // Spawn users gradually
  const spawnInterval = 1000 / CONFIG.spawnRate;
  let userIndex = 0;
  
  const spawnPromise = new Promise((resolve) => {
    const spawnTimer = setInterval(() => {
      if (userIndex >= CONFIG.totalUsers) {
        clearInterval(spawnTimer);
        resolve();
        return;
      }
      
      launchUser(userIndex);
      userIndex++;
    }, spawnInterval);
  });
  
  // Print stats every 5 seconds
  const statsTimer = setInterval(async () => {
    await collectWebRTCStats();
    printStats();
    
    if (stats.webrtcStats.producerCount > 0) {
      console.log(
        `         WebRTC: ${stats.webrtcStats.producerCount} producers, ` +
        `${stats.webrtcStats.consumerCount} consumers | ` +
        `Sent: ${stats.webrtcStats.avgBitrateSent} kbps/user | ` +
        `Recv: ${stats.webrtcStats.avgBitrateReceived} kbps/user`
      );
    }
  }, 5000);
  
  // Wait for test duration
  await new Promise((resolve) => setTimeout(resolve, CONFIG.duration));
  
  clearInterval(statsTimer);
  
  // Final stats collection
  await collectWebRTCStats();
  
  console.log('\n' + '='.repeat(65));
  console.log('  Load Test Complete');
  console.log('='.repeat(65));
  console.log(`  Total Users:     ${CONFIG.totalUsers}`);
  console.log(`  Connected:       ${stats.connected}`);
  console.log(`  Producing Media: ${stats.producing}`);
  console.log(`  Failed:          ${stats.failed}`);
  console.log(`  Success Rate:    ${((stats.connected / CONFIG.totalUsers) * 100).toFixed(1)}%`);
  console.log('');
  console.log('  WebRTC Stats:');
  console.log(`    Producers:     ${stats.webrtcStats.producerCount}`);
  console.log(`    Consumers:     ${stats.webrtcStats.consumerCount}`);
  console.log(`    Avg Send:      ${stats.webrtcStats.avgBitrateSent} kbps/user`);
  console.log(`    Avg Recv:      ${stats.webrtcStats.avgBitrateReceived} kbps/user`);
  console.log(`    Total Sent:    ${(stats.webrtcStats.totalBytesSent / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    Total Recv:    ${(stats.webrtcStats.totalBytesReceived / 1024 / 1024).toFixed(2)} MB`);
  
  if (stats.errors.length > 0) {
    console.log('\n  Errors:');
    stats.errors.slice(0, 5).forEach(e => {
      console.log(`    - User ${e.userIndex}: ${e.error}`);
    });
    if (stats.errors.length > 5) {
      console.log(`    ... and ${stats.errors.length - 5} more`);
    }
  }
  
  console.log('='.repeat(65) + '\n');
  
  // Cleanup
  await cleanup();
  
  // Fetch server stats
  try {
    const response = await fetch(`${CONFIG.serverUrl}/stats`);
    const serverStats = await response.json();
    console.log('Server Stats:', JSON.stringify(serverStats, null, 2));
  } catch (e) {
    console.log('Could not fetch server stats');
  }
  
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\nInterrupted! Cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

// Run
runLoadTest().catch(async (err) => {
  console.error('Fatal error:', err);
  await cleanup();
  process.exit(1);
});
