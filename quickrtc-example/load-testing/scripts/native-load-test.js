#!/usr/bin/env node
/**
 * Native QuickRTC Load Test (No Browser Required)
 * 
 * This script directly connects via Socket.IO to simulate participants
 * without needing Chrome/webrtcperf.
 * 
 * Usage:
 *   node native-load-test.js                    # 10 users, 60s
 *   node native-load-test.js --users=100        # 100 users
 *   node native-load-test.js --users=50 --duration=120
 */

const { io } = require('socket.io-client');

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const CONFIG = {
  serverUrl: args.url || 'http://localhost:3000',
  totalUsers: parseInt(args.users || '10'),
  duration: parseInt(args.duration || '60') * 1000,
  spawnRate: parseInt(args.spawnRate || '2'),
  usersPerRoom: parseInt(args.usersPerRoom || '10'),
};

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  QuickRTC Native Load Test');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Server:      ${CONFIG.serverUrl}`);
console.log(`  Users:       ${CONFIG.totalUsers}`);
console.log(`  Duration:    ${CONFIG.duration / 1000}s`);
console.log(`  Spawn Rate:  ${CONFIG.spawnRate}/s`);
console.log(`  Users/Room:  ${CONFIG.usersPerRoom}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Stats tracking
const stats = {
  connected: 0,
  joined: 0,
  failed: 0,
  errors: [],
  joinLatencies: [],
  startTime: Date.now(),
};

// Active connections
const connections = [];

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getRoomId(userIndex) {
  const roomIndex = Math.floor(userIndex / CONFIG.usersPerRoom);
  return `loadtest-room-${roomIndex}`;
}

async function createParticipant(userIndex) {
  const participantId = `loadtest-${userIndex}-${uuidv4().slice(0, 8)}`;
  const participantName = `LoadUser-${userIndex}`;
  const conferenceId = getRoomId(userIndex);

  return new Promise((resolve) => {
    const socket = io(CONFIG.serverUrl, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000,
    });

    const participant = {
      socket,
      participantId,
      participantName,
      conferenceId,
      joined: false,
      joinLatency: 0,
    };

    socket.on('connect', () => {
      stats.connected++;
      const joinStart = Date.now();

      socket.emit('joinConference', {
        data: {
          conferenceId,
          participantId,
          participantName,
          participantInfo: { type: 'loadtest', index: userIndex },
        },
      }, (response) => {
        if (response.status === 'ok') {
          participant.joined = true;
          participant.joinLatency = Date.now() - joinStart;
          stats.joined++;
          stats.joinLatencies.push(participant.joinLatency);
          
          // Create transports (simulated)
          socket.emit('createTransport', {
            conferenceId,
            participantId,
            direction: 'producer',
          }, () => {});

          socket.emit('createTransport', {
            conferenceId,
            participantId,
            direction: 'consumer',
          }, () => {});

        } else {
          stats.failed++;
          stats.errors.push({ userIndex, error: response.error });
        }
        resolve(participant);
      });
    });

    socket.on('connect_error', (err) => {
      stats.failed++;
      stats.errors.push({ userIndex, error: err.message });
      resolve(participant);
    });

    connections.push(participant);
  });
}

function printStats() {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const avgLatency = stats.joinLatencies.length > 0
    ? (stats.joinLatencies.reduce((a, b) => a + b, 0) / stats.joinLatencies.length).toFixed(0)
    : 0;
  const maxLatency = stats.joinLatencies.length > 0
    ? Math.max(...stats.joinLatencies)
    : 0;

  console.log(`[${elapsed}s] Connected: ${stats.connected}/${CONFIG.totalUsers} | Joined: ${stats.joined} | Failed: ${stats.failed} | Avg Latency: ${avgLatency}ms | Max: ${maxLatency}ms`);
}

async function runLoadTest() {
  console.log('Starting load test...\n');

  // Spawn users gradually
  const spawnInterval = 1000 / CONFIG.spawnRate;
  let userIndex = 0;

  const spawnTimer = setInterval(async () => {
    if (userIndex >= CONFIG.totalUsers) {
      clearInterval(spawnTimer);
      return;
    }

    createParticipant(userIndex);
    userIndex++;
  }, spawnInterval);

  // Print stats every 5 seconds
  const statsTimer = setInterval(printStats, 5000);

  // Wait for test duration
  await new Promise((resolve) => setTimeout(resolve, CONFIG.duration));

  // Cleanup
  clearInterval(spawnTimer);
  clearInterval(statsTimer);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Load Test Complete');
  console.log('═══════════════════════════════════════════════════════════════');
  printStats();

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.slice(0, 5).forEach((e) => console.log(`  - User ${e.userIndex}: ${e.error}`));
    if (stats.errors.length > 5) {
      console.log(`  ... and ${stats.errors.length - 5} more`);
    }
  }

  // Disconnect all
  console.log('\nDisconnecting all participants...');
  for (const conn of connections) {
    if (conn.socket.connected) {
      conn.socket.emit('leaveConference', {
        conferenceId: conn.conferenceId,
        participantId: conn.participantId,
      });
      conn.socket.disconnect();
    }
  }

  console.log('Done!\n');

  // Fetch final server stats
  try {
    const response = await fetch(`${CONFIG.serverUrl}/stats`);
    const serverStats = await response.json();
    console.log('Server Stats:', JSON.stringify(serverStats, null, 2));
  } catch (e) {
    console.log('Could not fetch server stats');
  }

  process.exit(0);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nInterrupted! Cleaning up...');
  for (const conn of connections) {
    conn.socket.disconnect();
  }
  process.exit(0);
});

runLoadTest();
