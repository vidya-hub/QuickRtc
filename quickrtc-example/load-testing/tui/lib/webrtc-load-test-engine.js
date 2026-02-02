/**
 * WebRTC Load Test Engine (with real media streams)
 * 
 * Uses Puppeteer to launch headless Chrome instances that produce
 * real WebRTC video/audio streams.
 */

const EventEmitter = require('events');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Media file paths
const MEDIA_DIR = path.join(__dirname, '..', '..', 'test-media');
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

class WebRTCLoadTestEngine extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      users: config.users || 5,
      duration: config.duration || 60,
      spawnRate: config.spawnRate || 1,
      usersPerRoom: config.usersPerRoom || 5,
      headless: config.headless !== false,
      produceVideo: config.produceVideo !== false,
      produceAudio: config.produceAudio !== false,
      resolution: config.resolution || '720p',
      realMedia: config.realMedia || false,
    };
    
    // Validate resolution
    if (!MEDIA_FILES[this.config.resolution]) {
      throw new Error(`Invalid resolution: ${this.config.resolution}. Use 720p, 1080p, or 4k`);
    }
    
    this.browsers = [];
    this.stats = {
      launched: 0,
      connected: 0,
      producing: 0,
      failed: 0,
      latencies: [],
      webrtc: {
        producers: 0,
        consumers: 0,
        bytesSent: 0,
        bytesReceived: 0,
      },
    };
    
    this.isRunning = false;
    this.startTime = null;
    this.spawnTimer = null;
    this.tickTimer = null;
    this.durationTimer = null;
  }
  
  // Check if real media files exist
  checkMediaFiles() {
    if (!this.config.realMedia) return true;
    
    const mediaFiles = MEDIA_FILES[this.config.resolution];
    if (!fs.existsSync(mediaFiles.video)) {
      return { error: `Media file not found: ${mediaFiles.video}. Run: cd test-media && ./download-test-media.sh all` };
    }
    if (!fs.existsSync(mediaFiles.audio)) {
      return { error: `Audio file not found: ${mediaFiles.audio}. Run: cd test-media && ./download-test-media.sh all` };
    }
    return true;
  }
  
  getMediaInfo() {
    return {
      resolution: this.config.resolution,
      realMedia: this.config.realMedia,
      videoFile: this.config.realMedia ? MEDIA_FILES[this.config.resolution].video : null,
      audioFile: this.config.realMedia ? MEDIA_FILES[this.config.resolution].audio : null,
    };
  }
  
  async start() {
    this.isRunning = true;
    this.startTime = Date.now();
    this.stats = {
      launched: 0,
      connected: 0,
      producing: 0,
      failed: 0,
      latencies: [],
      webrtc: {
        producers: 0,
        consumers: 0,
        bytesSent: 0,
        bytesReceived: 0,
      },
    };
    
    let userIndex = 0;
    const spawnInterval = 1000 / this.config.spawnRate;
    
    // Spawn users gradually
    this.spawnTimer = setInterval(async () => {
      if (!this.isRunning || userIndex >= this.config.users) {
        clearInterval(this.spawnTimer);
        return;
      }
      
      this.spawnUser(userIndex);
      userIndex++;
    }, spawnInterval);
    
    // Tick every second
    this.tickTimer = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      await this.collectStats();
      this.emit('tick', elapsed);
    }, 1000);
    
    // Stop after duration
    this.durationTimer = setTimeout(() => {
      this.stop();
    }, this.config.duration * 1000);
  }
  
  async stop() {
    this.isRunning = false;
    
    if (this.spawnTimer) clearInterval(this.spawnTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.durationTimer) clearTimeout(this.durationTimer);
    
    // Close all browsers
    for (const { browser } of this.browsers) {
      try {
        await browser.close();
      } catch (e) {}
    }
    
    this.browsers = [];
    
    const avgLatency = this.stats.latencies.length > 0
      ? this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length
      : 0;
    
    this.emit('complete', {
      connected: this.stats.connected,
      producing: this.stats.producing,
      failed: this.stats.failed,
      avgLatency: avgLatency.toFixed(0),
      webrtc: this.stats.webrtc,
    });
  }
  
  async spawnUser(userIndex) {
    const startTime = Date.now();
    const participantId = `loadtest-${userIndex}-${Date.now().toString(36)}`;
    const participantName = `LoadUser-${userIndex}`;
    const roomId = this.getRoomId(userIndex);
    
    let browser;
    
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
        '--disable-background-networking',
        '--disable-extensions',
        '--disable-sync',
        '--mute-audio',
        '--no-first-run',
        // WebRTC specific
        '--enable-webrtc-hide-local-ips-with-mdns=false',
        // SSL - ignore self-signed cert errors
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
      ];
      
      // Add real media file paths if enabled
      if (this.config.realMedia) {
        const mediaFiles = MEDIA_FILES[this.config.resolution];
        chromeArgs.push(`--use-file-for-fake-video-capture=${mediaFiles.video}`);
        chromeArgs.push(`--use-file-for-fake-audio-capture=${mediaFiles.audio}`);
      }
      
      browser = await puppeteer.launch({
        headless: this.config.headless ? 'new' : false,
        args: chromeArgs,
      });
      
      this.browsers.push({ browser, userIndex, participantId, roomId });
      this.stats.launched++;
      this.emit('launched', { total: this.stats.launched, userIndex });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 640, height: 480 });
      
      // Build URL
      const url = new URL('/loadtest', this.config.serverUrl);
      url.searchParams.set('participantId', participantId);
      url.searchParams.set('participantName', participantName);
      url.searchParams.set('conferenceId', roomId);
      url.searchParams.set('video', this.config.produceVideo);
      url.searchParams.set('audio', this.config.produceAudio);
      
      await page.goto(url.toString(), { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForFunction('window.loadTestReady === true', { timeout: 30000 });
      
      const success = await page.evaluate(() => window.loadTestSuccess);
      
      if (success) {
        const latency = Date.now() - startTime;
        this.stats.connected++;
        this.stats.latencies.push(latency);
        
        const webrtcStats = await page.evaluate(() => window.webrtcStats);
        if (webrtcStats && webrtcStats.producers > 0) {
          this.stats.producing++;
        }
        
        const avgLatency = this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length;
        
        this.emit('connected', {
          total: this.stats.connected,
          userIndex,
          latency,
          avgLatency,
          roomId,
        });
      } else {
        const error = await page.evaluate(() => window.loadTestError);
        throw new Error(error || 'Unknown error');
      }
      
    } catch (error) {
      this.stats.failed++;
      this.emit('failed', { userIndex, error: error.message });
      
      if (browser) {
        try { await browser.close(); } catch (e) {}
        this.browsers = this.browsers.filter(b => b.browser !== browser);
      }
    }
  }
  
  async collectStats() {
    let producers = 0;
    let consumers = 0;
    let bytesSent = 0;
    let bytesReceived = 0;
    
    for (const { browser } of this.browsers) {
      try {
        const pages = await browser.pages();
        for (const page of pages) {
          try {
            const webrtcStats = await page.evaluate(() => window.webrtcStats);
            if (webrtcStats) {
              producers += webrtcStats.producers || 0;
              consumers += webrtcStats.consumers || 0;
              for (const ps of webrtcStats.producerStats || []) {
                bytesSent += ps.bytesSent || 0;
              }
              for (const cs of webrtcStats.consumerStats || []) {
                bytesReceived += cs.bytesReceived || 0;
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
    
    this.stats.webrtc = { producers, consumers, bytesSent, bytesReceived };
  }
  
  getRoomId(userIndex) {
    const roomIndex = Math.floor(userIndex / this.config.usersPerRoom);
    return `loadtest-room-${roomIndex}`;
  }
}

module.exports = { WebRTCLoadTestEngine };
