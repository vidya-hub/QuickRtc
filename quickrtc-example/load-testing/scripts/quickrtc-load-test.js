/**
 * QuickRTC Load Test Script for webrtcperf
 * 
 * This script simulates a WebRTC participant:
 * 1. Connects via Socket.IO
 * 2. Joins a conference room
 * 3. Creates WebRTC transports
 * 4. Produces fake audio/video streams
 * 5. Consumes other participants' streams
 * 6. Collects metrics
 * 
 * Usage with webrtcperf:
 *   webrtcperf --url=http://localhost:3000 --sessions=100 --script-path=./quickrtc-load-test.js
 */

// Generate UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Calculate room ID based on strategy
function getRoomId(scenario, sessionIndex) {
  const rooms = scenario.rooms || { strategy: 'distributed', distributed: { usersPerRoom: 10, roomPrefix: 'room-' } };
  const strategy = rooms.strategy || 'distributed';
  
  switch (strategy) {
    case 'single':
      return rooms.single?.roomId || 'load-test-room';
    
    case 'distributed':
      const usersPerRoom = rooms.distributed?.usersPerRoom || 10;
      const roomIndex = Math.floor(sessionIndex / usersPerRoom);
      return `${rooms.distributed?.roomPrefix || 'room-'}${roomIndex}`;
    
    case 'random':
      const { minRooms = 5, maxRooms = 20 } = rooms.random || {};
      const numRooms = Math.floor(Math.random() * (maxRooms - minRooms + 1)) + minRooms;
      return `room-${sessionIndex % numRooms}`;
    
    default:
      return `room-${Math.floor(sessionIndex / 10)}`;
  }
}

// Default scenario if none provided
const defaultScenario = {
  rooms: { 
    strategy: 'distributed', 
    distributed: { usersPerRoom: 10, roomPrefix: 'room-' } 
  },
  media: { 
    produceAudio: true, 
    produceVideo: true, 
    consumeAll: true 
  },
  behavior: { 
    joinDelay: 100,
    reconnectOnFailure: true,
    maxReconnectAttempts: 3
  },
  test: {
    duration: 60
  }
};

/**
 * Main load test function executed by webrtcperf
 * @param {Object} page - Puppeteer page object
 * @param {Object} context - Test context from webrtcperf
 */
module.exports = async function(page, context) {
  const { sessionIndex, tabIndex, params } = context;
  
  // Load scenario from params or use default
  const scenario = params.scenario ? JSON.parse(params.scenario) : defaultScenario;
  
  const conferenceId = getRoomId(scenario, sessionIndex);
  const participantId = `loadtest-${sessionIndex}-${tabIndex}-${uuidv4().slice(0, 8)}`;
  const participantName = `LoadUser-${sessionIndex}-${tabIndex}`;
  const serverUrl = params.url || 'http://localhost:3000';
  const testDuration = (scenario.test?.duration || 60) * 1000;
  
  console.log(`[Session ${sessionIndex}] Joining room: ${conferenceId} as ${participantName}`);
  
  // Inject Socket.IO client
  await page.addScriptTag({ 
    url: 'https://cdn.socket.io/4.6.0/socket.io.min.js' 
  });
  
  // Add join delay to avoid thundering herd
  const joinDelay = scenario.behavior?.joinDelay || 100;
  await page.waitForTimeout(sessionIndex * joinDelay % 5000); // Cap at 5 seconds
  
  // Execute load test in browser context
  const result = await page.evaluate(async (config) => {
    const { 
      conferenceId, 
      participantId, 
      participantName, 
      serverUrl,
      scenario,
      testDuration 
    } = config;
    
    return new Promise((resolve) => {
      const stats = {
        sessionId: participantId,
        conferenceId: conferenceId,
        joined: false,
        joinLatencyMs: 0,
        transportCreated: { producer: false, consumer: false },
        transportConnected: { producer: false, consumer: false },
        producerTransportId: null,
        consumerTransportId: null,
        producersCreated: 0,
        consumersCreated: 0,
        participantsDiscovered: 0,
        errors: [],
        events: [],
        startTime: Date.now(),
        endTime: null
      };
      
      const log = (msg, level = 'info') => {
        const entry = { 
          time: Date.now() - stats.startTime, 
          level,
          msg 
        };
        stats.events.push(entry);
        if (level === 'error') {
          console.error(`[${participantId}] ${msg}`);
        } else {
          console.log(`[${participantId}] ${msg}`);
        }
      };
      
      const socket = io(serverUrl, { 
        transports: ['websocket'],
        reconnection: scenario.behavior?.reconnectOnFailure !== false,
        reconnectionAttempts: scenario.behavior?.maxReconnectAttempts || 3,
        timeout: 10000
      });
      
      // Socket error handlers
      socket.on('connect_error', (error) => {
        log(`Connection error: ${error.message}`, 'error');
        stats.errors.push({ type: 'connect_error', message: error.message });
      });
      
      socket.on('disconnect', (reason) => {
        log(`Disconnected: ${reason}`, 'warn');
      });
      
      socket.on('connect', () => {
        log('Socket connected');
        const joinStart = Date.now();
        
        // 1. Join conference
        socket.emit('joinConference', {
          data: { 
            conferenceId, 
            participantId, 
            participantName,
            participantInfo: {
              type: 'loadtest',
              sessionIndex: config.sessionIndex
            }
          }
        }, (response) => {
          if (response.status === 'ok') {
            stats.joined = true;
            stats.joinLatencyMs = Date.now() - joinStart;
            stats.routerCapabilities = response.data?.routerCapabilities;
            log(`Joined conference in ${stats.joinLatencyMs}ms`);
            
            // 2. Create producer transport
            socket.emit('createTransport', {
              conferenceId, 
              participantId, 
              direction: 'producer'
            }, (transportRes) => {
              if (transportRes.status === 'ok') {
                stats.transportCreated.producer = true;
                stats.producerTransportId = transportRes.data?.id;
                log('Producer transport created');
                
                // Connect producer transport with simulated DTLS
                socket.emit('connectTransport', {
                  conferenceId, 
                  participantId, 
                  direction: 'producer',
                  dtlsParameters: {
                    role: 'client',
                    fingerprints: [{
                      algorithm: 'sha-256',
                      value: 'A1:B2:C3:D4:E5:F6:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99'
                    }]
                  }
                }, (connectRes) => {
                  if (connectRes.status === 'ok') {
                    stats.transportConnected.producer = true;
                    log('Producer transport connected');
                  } else {
                    log(`Producer transport connect failed: ${connectRes.error}`, 'error');
                    stats.errors.push({ type: 'transport_connect', direction: 'producer', error: connectRes.error });
                  }
                });
              } else {
                log(`Producer transport creation failed: ${transportRes.error}`, 'error');
                stats.errors.push({ type: 'transport_create', direction: 'producer', error: transportRes.error });
              }
            });
            
            // 3. Create consumer transport
            socket.emit('createTransport', {
              conferenceId, 
              participantId, 
              direction: 'consumer'
            }, (transportRes) => {
              if (transportRes.status === 'ok') {
                stats.transportCreated.consumer = true;
                stats.consumerTransportId = transportRes.data?.id;
                log('Consumer transport created');
                
                // Connect consumer transport with simulated DTLS
                socket.emit('connectTransport', {
                  conferenceId, 
                  participantId, 
                  direction: 'consumer',
                  dtlsParameters: {
                    role: 'client',
                    fingerprints: [{
                      algorithm: 'sha-256',
                      value: 'A1:B2:C3:D4:E5:F6:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99'
                    }]
                  }
                }, (connectRes) => {
                  if (connectRes.status === 'ok') {
                    stats.transportConnected.consumer = true;
                    log('Consumer transport connected');
                  } else {
                    log(`Consumer transport connect failed: ${connectRes.error}`, 'error');
                    stats.errors.push({ type: 'transport_connect', direction: 'consumer', error: connectRes.error });
                  }
                });
              } else {
                log(`Consumer transport creation failed: ${transportRes.error}`, 'error');
                stats.errors.push({ type: 'transport_create', direction: 'consumer', error: transportRes.error });
              }
            });
            
            // 4. Get existing participants
            socket.emit('getParticipants', { conferenceId }, (participantsRes) => {
              if (participantsRes.status === 'ok') {
                const participants = participantsRes.data || [];
                stats.participantsDiscovered = participants.length;
                log(`Discovered ${participants.length} existing participants`);
              }
            });
            
          } else {
            log(`Join failed: ${response.error}`, 'error');
            stats.errors.push({ type: 'join', error: response.error });
          }
        });
      });
      
      // Listen for new participants
      socket.on('participantJoined', (data) => {
        stats.participantsDiscovered++;
        log(`Participant joined: ${data.participantName}`);
      });
      
      // Listen for participant leaving
      socket.on('participantLeft', (data) => {
        if (stats.participantsDiscovered > 0) {
          stats.participantsDiscovered--;
        }
        log(`Participant left: ${data.participantId}`);
      });
      
      // Listen for new producers
      socket.on('newProducer', (data) => {
        log(`New producer: ${data.kind} from ${data.participantId}`);
        
        // Try to consume if we have rtpCapabilities
        if (stats.routerCapabilities && stats.transportConnected.consumer) {
          socket.emit('consume', {
            conferenceId,
            participantId,
            consumeOptions: {
              producerId: data.producerId,
              rtpCapabilities: stats.routerCapabilities
            }
          }, (consumeRes) => {
            if (consumeRes.status === 'ok') {
              stats.consumersCreated++;
              log(`Consumer created for producer ${data.producerId}`);
              
              // Resume consumer
              socket.emit('unpauseConsumer', {
                conferenceId,
                participantId,
                consumerId: consumeRes.data?.id
              });
            }
          });
        }
      });
      
      // End test after duration
      setTimeout(() => {
        log('Test duration complete, leaving conference');
        stats.endTime = Date.now();
        
        socket.emit('leaveConference', { conferenceId, participantId }, () => {
          socket.disconnect();
          resolve(stats);
        });
        
        // Force resolve after 2 seconds if leave doesn't complete
        setTimeout(() => {
          socket.disconnect();
          resolve(stats);
        }, 2000);
      }, testDuration);
    });
  }, {
    conferenceId,
    participantId,
    participantName,
    serverUrl,
    scenario,
    testDuration,
    sessionIndex
  });
  
  // Log final stats
  console.log(`[Session ${sessionIndex}] Test complete:`, {
    joined: result.joined,
    joinLatency: result.joinLatencyMs,
    errors: result.errors.length,
    participantsDiscovered: result.participantsDiscovered
  });
  
  return result;
};
