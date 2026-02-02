#!/usr/bin/env node
/**
 * QuickRTC WebRTC Load Test
 * 
 * Uses Puppeteer to launch headless Chrome instances that produce
 * real WebRTC video/audio streams using mediasoup-client.
 * 
 * Usage:
 *   node scripts/webrtc-load-test.js --users=10 --duration=60
 *   node scripts/webrtc-load-test.js --users=5 --resolution=1080p --realMedia
 *   npm run test:webrtc:smoke
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
 *   --resolution    Video resolution: 720p, 1080p, 4k (default: 720p)
 *   --realMedia     Use real media files instead of synthetic (default: false)
 *   --verbose       Show browser console logs
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? 'true' : value;
  return acc;
}, {});

// Media file paths
const MEDIA_DIR = path.join(__dirname, '..', 'test-media');
const MEDIA_FILES = {
  '720p': {
    video: path.join(MEDIA_DIR, 'y4m', 'test-720p.y4m'),
    audio: path.join(MEDIA_DIR, 'audio', 'test-audio.wav'),
  },
  '1080p': {
    video: path.join(MEDIA_DIR, 'y4m', 'test-1080p.y4m'),
    audio: path.join(MEDIA_DIR, 'audio', 'test-audio.wav'),
  },
  '4k': {
    video: path.join(MEDIA_DIR, 'y4m', 'test-4k.y4m'),
    audio: path.join(MEDIA_DIR, 'audio', 'test-audio.wav'),
  },
};

const CONFIG = {
  serverUrl: args.url || 'http://localhost:3000',
  totalUsers: parseInt(args.users || '5'),
  duration: parseInt(args.duration || '60') * 1000,
  spawnRate: parseFloat(args.spawnRate || '1'),
  usersPerRoom: parseInt(args.usersPerRoom || '5'),
  headless: args.headless !== 'false',
  produceVideo: args.video !== 'false',
  produceAudio: args.audio !== 'false',
  resolution: args.resolution || '720p',
  realMedia: args.realMedia === 'true',
  verbose: args.verbose === 'true',
};

// Validate resolution
if (!MEDIA_FILES[CONFIG.resolution]) {
  console.error(`Invalid resolution: ${CONFIG.resolution}. Use 720p, 1080p, or 4k`);
  process.exit(1);
}

// Check if media files exist when using real media
if (CONFIG.realMedia) {
  const mediaFiles = MEDIA_FILES[CONFIG.resolution];
  if (!fs.existsSync(mediaFiles.video)) {
    console.error(`\nMedia file not found: ${mediaFiles.video}`);
    console.error('Run: cd test-media && ./download-test-media.sh all');
    process.exit(1);
  }
  if (!fs.existsSync(mediaFiles.audio)) {
    console.error(`\nAudio file not found: ${mediaFiles.audio}`);
    console.error('Run: cd test-media && ./download-test-media.sh all');
    process.exit(1);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  QuickRTC WebRTC Load Test');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Server:      ${CONFIG.serverUrl}`);
console.log(`  Users:       ${CONFIG.totalUsers}`);
console.log(`  Duration:    ${CONFIG.duration / 1000}s`);
console.log(`  Spawn Rate:  ${CONFIG.spawnRate}/s`);
console.log(`  Users/Room:  ${CONFIG.usersPerRoom}`);
console.log(`  Headless:    ${CONFIG.headless}`);
console.log(`  Video:       ${CONFIG.produceVideo}`);
console.log(`  Audio:       ${CONFIG.produceAudio}`);
console.log(`  Resolution:  ${CONFIG.resolution}`);
console.log(`  Media:       ${CONFIG.realMedia ? 'Real Y4M files' : 'Synthetic (bouncing ball)'}`);
if (CONFIG.realMedia) {
  console.log(`  Video File:  ${MEDIA_FILES[CONFIG.resolution].video}`);
  console.log(`  Audio File:  ${MEDIA_FILES[CONFIG.resolution].audio}`);
}
console.log('═══════════════════════════════════════════════════════════════\n');

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
  },
  startTime: Date.now(),
};

// Active browsers
const browsers = [];

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
  
  let browser, page;
  
  try {
    // Build Chrome args
    const chromeArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      // Fake media - these flags make Chrome use synthetic or file-based audio/video
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--autoplay-policy=no-user-gesture-required',
      // Reduce resource usage
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      // WebRTC specific
      '--enable-webrtc-hide-local-ips-with-mdns=false',
      // SSL - ignore self-signed cert errors
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
    ];
    
    // Add real media file paths if enabled
    if (CONFIG.realMedia) {
      const mediaFiles = MEDIA_FILES[CONFIG.resolution];
      chromeArgs.push(`--use-file-for-fake-video-capture=${mediaFiles.video}`);
      chromeArgs.push(`--use-file-for-fake-audio-capture=${mediaFiles.audio}`);
    }
    
    // Launch browser with fake media
    browser = await puppeteer.launch({
      headless: CONFIG.headless ? 'new' : false,
      args: chromeArgs,
    });
    
    browsers.push({ browser, userIndex, participantId });
    stats.launched++;
    
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 800, height: 600 });
    
    // Listen for console logs
    page.on('console', msg => {
      if (CONFIG.verbose) {
        console.log(`  [User ${userIndex}] ${msg.text()}`);
      }
    });
    
    // Listen for errors
    page.on('pageerror', error => {
      console.error(`  [User ${userIndex}] Page error: ${error.message}`);
    });
    
    // Build URL with params
    const url = new URL('/loadtest', CONFIG.serverUrl);
    url.searchParams.set('participantId', participantId);
    url.searchParams.set('participantName', participantName);
    url.searchParams.set('conferenceId', conferenceId);
    url.searchParams.set('video', CONFIG.produceVideo);
    url.searchParams.set('audio', CONFIG.produceAudio);
    
    // Navigate to load test page
    await page.goto(url.toString(), { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for load test to be ready
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
    
    return { browser, page, userIndex, participantId, conferenceId };
    
  } catch (error) {
    stats.failed++;
    stats.errors.push({ userIndex, error: error.message });
    console.error(`  ✗ User ${userIndex} failed: ${error.message}`);
    
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    
    return null;
  }
}

async function collectWebRTCStats() {
  let totalBytesSent = 0;
  let totalBytesReceived = 0;
  let producerCount = 0;
  let consumerCount = 0;
  
  for (const { browser } of browsers) {
    try {
      const pages = await browser.pages();
      for (const page of pages) {
        try {
          const webrtcStats = await page.evaluate(() => window.webrtcStats);
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
        } catch (e) {}
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
  
  for (const { browser, userIndex } of browsers) {
    try {
      await browser.close();
    } catch (e) {
      console.error(`  Failed to close browser ${userIndex}: ${e.message}`);
    }
  }
  
  browsers.length = 0;
}

async function runLoadTest() {
  console.log('Starting load test...\n');
  
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
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Load Test Complete');
  console.log('═══════════════════════════════════════════════════════════════');
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
  
  console.log('═══════════════════════════════════════════════════════════════\n');
  
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
