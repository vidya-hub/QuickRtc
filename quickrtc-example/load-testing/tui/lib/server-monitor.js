/**
 * Server Monitor
 * 
 * Polls the QuickRTC server for stats and health status.
 */

const EventEmitter = require('events');
const http = require('http');
const https = require('https');

class ServerMonitor extends EventEmitter {
  constructor(serverUrl) {
    super();
    this.serverUrl = serverUrl;
    this.isRunning = false;
    this.pollInterval = null;
    this.pollRate = 2000; // 2 seconds
  }
  
  start() {
    this.isRunning = true;
    this.poll();
    
    this.pollInterval = setInterval(() => {
      if (this.isRunning) {
        this.poll();
      }
    }, this.pollRate);
  }
  
  stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
  
  poll() {
    const statsUrl = `${this.serverUrl}/stats`;
    
    this.fetch(statsUrl)
      .then((data) => {
        this.emit('status', {
          online: true,
          conferenceCount: data.conferenceCount || 0,
          participantCount: data.participantCount || 0,
          totalConnections: data.totalConnections || 0,
          uptime: data.uptime || 0,
          conferences: data.conferences || [],
        });
      })
      .catch((err) => {
        this.emit('error', err);
        this.emit('status', {
          online: false,
          conferenceCount: 0,
          participantCount: 0,
          totalConnections: 0,
          uptime: 0,
          conferences: [],
        });
      });
  }
  
  fetch(url) {
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
  }
}

module.exports = { ServerMonitor };
