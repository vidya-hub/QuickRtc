const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--ignore-certificate-errors',
      '--autoplay-policy=no-user-gesture-required',
    ]
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['camera', 'microphone'],
  });
  
  const page = await context.newPage();
  
  // Listen for console logs
  page.on('console', msg => console.log('[Browser]', msg.text()));
  page.on('pageerror', err => console.log('[Page Error]', err.message));
  
  console.log('Navigating to app...');
  await page.goto('https://192.168.29.46:3000', { waitUntil: 'networkidle' });
  
  console.log('Filling form...');
  await page.fill('input[placeholder="Your Name"]', 'TestUser');
  await page.fill('input[placeholder="Room ID"]', 'test-debug-room');
  
  console.log('Clicking Join...');
  await page.click('button:has-text("Join Room")');
  
  // Wait for room to load
  await page.waitForTimeout(2000);
  
  console.log('Clicking Start Video...');
  await page.click('button:has-text("Start Video")');
  
  // Wait for video to start
  await page.waitForTimeout(3000);
  
  // Check video elements
  const videoCount = await page.evaluate(() => document.querySelectorAll('video').length);
  console.log('Found video elements:', videoCount);
  
  const videoInfo = await page.evaluate(() => {
    const videos = document.querySelectorAll('video');
    const results = [];
    videos.forEach((el, i) => {
      results.push({
        index: i,
        srcObject: el.srcObject ? 'MediaStream' : null,
        readyState: el.readyState,
        paused: el.paused,
        muted: el.muted,
        videoWidth: el.videoWidth,
        videoHeight: el.videoHeight,
        currentTime: el.currentTime,
        className: el.className,
        hasVideoTracks: el.srcObject ? el.srcObject.getVideoTracks().length : 0,
        hasAudioTracks: el.srcObject ? el.srcObject.getAudioTracks().length : 0,
        trackEnabled: el.srcObject && el.srcObject.getVideoTracks().length > 0 
          ? el.srcObject.getVideoTracks()[0].enabled : null,
        trackReadyState: el.srcObject && el.srcObject.getVideoTracks().length > 0 
          ? el.srcObject.getVideoTracks()[0].readyState : null,
      });
    });
    return results;
  });
  
  console.log('Video info:', JSON.stringify(videoInfo, null, 2));
  
  // Check for any errors in local streams state
  const localStreamsInfo = await page.evaluate(() => {
    // Try to access React state - this might not work depending on how React is set up
    return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? 'React DevTools available' : 'React DevTools not available';
  });
  console.log('React DevTools:', localStreamsInfo);
  
  // Take a screenshot
  await page.screenshot({ path: '/tmp/video-debug.png' });
  console.log('Screenshot saved to /tmp/video-debug.png');
  
  // Keep browser open for 10 seconds
  console.log('Keeping browser open for 10 seconds...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('Done');
})();
