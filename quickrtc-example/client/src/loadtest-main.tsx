import React from 'react';
import ReactDOM from 'react-dom/client';
import LoadTest from './LoadTest';

// Initialize global state for Puppeteer
window.loadTestReady = false;
window.loadTestSuccess = false;
window.loadTestError = null;
window.webrtcStats = {
  producers: 0,
  consumers: 0,
  producerStats: [],
  consumerStats: [],
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LoadTest />
  </React.StrictMode>
);
