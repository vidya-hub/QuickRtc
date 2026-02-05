/**
 * Playwright Load Test Engine (with real media streams)
 * 
 * Uses Playwright to launch browsers that produce real WebRTC video/audio streams.
 * Benefits over Puppeteer:
 * - Multi-browser support (Chromium, Firefox, WebKit)
 * - Better context isolation per user
 * - Auto-wait features
 * - Faster execution with parallel contexts
 */

const EventEmitter = require('events');
const { chromium, firefox, webkit } = require('playwright');

const BROWSER_TYPES = { chromium, firefox, webkit };

class PlaywrightLoadTestEngine extends EventEmitter {
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
      produceAudio: false, // Audio disabled - video only
      resolution: config.resolution || '720p',
      browserType: config.browserType || 'chromium',
      trace: config.trace || false,
    };
    
    // Validate browser type
    if (!BROWSER_TYPES[this.config.browserType]) {
      throw new Error(`Invalid browser: ${this.config.browserType}. Use chromium, firefox, or webkit`);
    }
    
    this.browser = null;
    this.contexts = [];
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
  
  getEngineInfo() {
    return {
      engine: 'playwright',
      browserType: this.config.browserType,
      resolution: this.config.resolution,
      trace: this.config.trace,
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
    
    // Launch browser
    const browserType = BROWSER_TYPES[this.config.browserType];
    const launchOptions = {
      headless: this.config.headless,
    };
    
    // Add Chrome-specific args
    if (this.config.browserType === 'chromium') {
      launchOptions.args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--enable-webrtc-hide-local-ips-with-mdns=false',
      ];
    }
    
    try {
      this.browser = await browserType.launch(launchOptions);
      this.emit('browserLaunched', { browserType: this.config.browserType });
    } catch (error) {
      this.emit('error', { message: `Failed to launch browser: ${error.message}` });
      return;
    }
    
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
    
    // Close all contexts
    for (const { context } of this.contexts) {
      try {
        await context.close();
      } catch (e) {}
    }
    
    this.contexts = [];
    
    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {}
      this.browser = null;
    }
    
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
    
    let context, page;
    
    try {
      // Create isolated browser context for this user
      context = await this.browser.newContext({
        ignoreHTTPSErrors: true,
        permissions: ['camera', 'microphone'],
        viewport: { width: 640, height: 480 },
        userAgent: `QuickRTC-LoadTest/${userIndex}`,
      });
      
      // Enable trace recording if requested
      if (this.config.trace) {
        await context.tracing.start({ screenshots: true, snapshots: true });
      }
      
      page = await context.newPage();
      
      this.contexts.push({ context, page, userIndex, participantId, roomId });
      this.stats.launched++;
      this.emit('launched', { total: this.stats.launched, userIndex });
      
      // Build URL
      const url = new URL('/loadtest', this.config.serverUrl);
      url.searchParams.set('participantId', participantId);
      url.searchParams.set('participantName', participantName);
      url.searchParams.set('conferenceId', roomId);
      url.searchParams.set('video', this.config.produceVideo.toString());
      url.searchParams.set('audio', this.config.produceAudio.toString());
      
      await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 30000 });
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
      
      if (context) {
        try { await context.close(); } catch (e) {}
        this.contexts = this.contexts.filter(c => c.context !== context);
      }
    }
  }
  
  async collectStats() {
    let producers = 0;
    let consumers = 0;
    let bytesSent = 0;
    let bytesReceived = 0;
    
    for (const { page, context } of this.contexts) {
      try {
        if (context && !context._closed) {
          const webrtcStats = await page.evaluate(() => window.webrtcStats).catch(() => null);
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
        }
      } catch (e) {}
    }
    
    this.stats.webrtc = { producers, consumers, bytesSent, bytesReceived };
  }
  
  getRoomId(userIndex) {
    const roomIndex = Math.floor(userIndex / this.config.usersPerRoom);
    const prefix = this.config.roomPrefix || 'loadtest';
    return `${prefix}-room-${roomIndex}`;
  }
}

module.exports = { PlaywrightLoadTestEngine };
