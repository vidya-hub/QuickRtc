/**
 * Load Test Engine
 * 
 * Handles the actual load testing logic with Socket.IO connections.
 */

const EventEmitter = require('events');
const { io } = require('socket.io-client');

class LoadTestEngine extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      users: config.users || 10,
      duration: config.duration || 60,
      spawnRate: config.spawnRate || 2,
      usersPerRoom: config.usersPerRoom || 10,
    };
    
    this.connections = [];
    this.stats = {
      connected: 0,
      joined: 0,
      failed: 0,
      latencies: [],
    };
    
    this.isRunning = false;
    this.startTime = null;
    this.spawnTimer = null;
    this.tickTimer = null;
    this.durationTimer = null;
  }
  
  start() {
    this.isRunning = true;
    this.startTime = Date.now();
    this.stats = {
      connected: 0,
      joined: 0,
      failed: 0,
      latencies: [],
    };
    
    let userIndex = 0;
    const spawnInterval = 1000 / this.config.spawnRate;
    
    // Spawn users gradually
    this.spawnTimer = setInterval(() => {
      if (!this.isRunning || userIndex >= this.config.users) {
        clearInterval(this.spawnTimer);
        return;
      }
      
      this.spawnUser(userIndex);
      userIndex++;
    }, spawnInterval);
    
    // Tick every second
    this.tickTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.emit('tick', elapsed);
    }, 1000);
    
    // Stop after duration
    this.durationTimer = setTimeout(() => {
      this.stop();
    }, this.config.duration * 1000);
  }
  
  stop() {
    this.isRunning = false;
    
    if (this.spawnTimer) clearInterval(this.spawnTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.durationTimer) clearTimeout(this.durationTimer);
    
    // Disconnect all
    for (const conn of this.connections) {
      if (conn.socket && conn.socket.connected) {
        conn.socket.emit('leaveConference', {
          conferenceId: conn.conferenceId,
          participantId: conn.participantId,
        });
        conn.socket.disconnect();
      }
    }
    
    this.connections = [];
    
    const avgLatency = this.stats.latencies.length > 0
      ? this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length
      : 0;
    
    this.emit('complete', {
      joined: this.stats.joined,
      failed: this.stats.failed,
      avgLatency: avgLatency.toFixed(0),
    });
  }
  
  spawnUser(userIndex) {
    const participantId = `loadtest-${userIndex}-${this.uuid().slice(0, 8)}`;
    const participantName = `LoadUser-${userIndex}`;
    const roomId = this.getRoomId(userIndex);
    
    const socket = io(this.config.serverUrl, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000,
    });
    
    const conn = {
      socket,
      participantId,
      participantName,
      conferenceId: roomId,
    };
    
    this.connections.push(conn);
    
    socket.on('connect', () => {
      this.stats.connected++;
      this.emit('connected', { total: this.stats.connected, userIndex });
      
      const joinStart = Date.now();
      
      socket.emit('joinConference', {
        data: {
          conferenceId: roomId,
          participantId,
          participantName,
          participantInfo: { type: 'loadtest', index: userIndex },
        },
      }, (response) => {
        if (response && response.status === 'ok') {
          const latency = Date.now() - joinStart;
          this.stats.joined++;
          this.stats.latencies.push(latency);
          
          const avgLatency = this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length;
          
          this.emit('joined', {
            total: this.stats.joined,
            userIndex,
            latency,
            avgLatency,
            roomId,
          });
          
          // Create transports (fire and forget)
          socket.emit('createTransport', {
            conferenceId: roomId,
            participantId,
            direction: 'producer',
          }, () => {});
          
          socket.emit('createTransport', {
            conferenceId: roomId,
            participantId,
            direction: 'consumer',
          }, () => {});
          
        } else {
          this.stats.failed++;
          this.emit('failed', {
            userIndex,
            error: response ? response.error : 'No response',
          });
        }
      });
    });
    
    socket.on('connect_error', (err) => {
      this.stats.failed++;
      this.emit('failed', {
        userIndex,
        error: err.message,
      });
    });
    
    socket.on('disconnect', () => {
      if (this.stats.connected > 0) {
        this.stats.connected--;
      }
    });
  }
  
  getRoomId(userIndex) {
    const roomIndex = Math.floor(userIndex / this.config.usersPerRoom);
    return `loadtest-room-${roomIndex}`;
  }
  
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = { LoadTestEngine };
