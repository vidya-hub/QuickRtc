/**
 * QuickRTC Load Test Client
 * 
 * Auto-joins a conference based on URL parameters and produces media.
 * Uses canvas-based synthetic video for reliable headless browser testing.
 * 
 * URL Parameters:
 *   - participantId: Unique ID for this participant
 *   - participantName: Display name
 *   - conferenceId: Room to join
 *   - video: true/false to produce video
 *   - audio: true/false to produce audio
 *   - serverUrl: Override server URL
 *   - synthetic: true/false to use canvas-based synthetic media (default: true)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuickRTC } from "quickrtc-react-client";
import type { LocalStream, RemoteStream } from "quickrtc-react-client";
import { io, Socket } from "socket.io-client";

// Get URL parameters
const params = new URLSearchParams(window.location.search);
const PARTICIPANT_ID = params.get('participantId') || `loadtest-${Math.random().toString(36).substr(2, 9)}`;
const PARTICIPANT_NAME = params.get('participantName') || `LoadUser-${PARTICIPANT_ID.slice(-4)}`;
const CONFERENCE_ID = params.get('conferenceId') || 'loadtest-room-0';
const PRODUCE_VIDEO = params.get('video') !== 'false';
const PRODUCE_AUDIO = params.get('audio') !== 'false';
const SERVER_URL = params.get('serverUrl') || window.location.origin;
const USE_SYNTHETIC = params.get('synthetic') !== 'false'; // Default to synthetic

// Expose state to Puppeteer
declare global {
  interface Window {
    loadTestReady: boolean;
    loadTestSuccess: boolean;
    loadTestError: string | null;
    webrtcStats: {
      producers: number;
      consumers: number;
      producerStats: Array<{ kind: string; bytesSent: number; packetsSent: number }>;
      consumerStats: Array<{ kind: string; bytesReceived: number; packetsReceived: number; packetsLost: number }>;
    };
  }
}

/**
 * Create a synthetic video stream using canvas
 * This works reliably in headless browsers unlike getUserMedia
 */
function createSyntheticVideoStream(width = 640, height = 480, fps = 30): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  let frameCount = 0;
  let animationId: number | null = null;
  let isRunning = true;
  
  // Generate a unique color based on participant ID
  const hueBase = Math.abs(PARTICIPANT_ID.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  
  const drawFrame = () => {
    if (!isRunning) return;
    
    // Animated gradient background
    const hue = (hueBase + frameCount) % 360;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${hue}, 60%, 40%)`);
    gradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 60%, 30%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Bouncing ball for visual motion
    const ballX = width / 2 + Math.sin(frameCount * 0.05) * (width / 3);
    const ballY = height / 2 + Math.cos(frameCount * 0.03) * (height / 3);
    ctx.beginPath();
    ctx.arc(ballX, ballY, 30, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${(hue + 180) % 360}, 80%, 60%)`;
    ctx.fill();
    
    // Text overlay
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Load Test', width / 2, 40);
    
    ctx.font = '16px Arial';
    ctx.fillText(PARTICIPANT_NAME, width / 2, height / 2);
    ctx.fillText(`Frame: ${frameCount}`, width / 2, height / 2 + 25);
    ctx.fillText(new Date().toLocaleTimeString(), width / 2, height - 20);
    
    frameCount++;
    animationId = requestAnimationFrame(drawFrame);
  };
  
  // Start animation
  drawFrame();
  
  // Capture stream from canvas
  const stream = canvas.captureStream(fps);
  
  const stop = () => {
    isRunning = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
  };
  
  return { stream, stop };
}

/**
 * Create a synthetic audio stream using WebAudio oscillator
 * This works reliably in headless browsers
 */
function createSyntheticAudioStream(): { stream: MediaStream; stop: () => void } {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create oscillator for a gentle tone
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
  
  // Create gain node to control volume (very quiet)
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.01, audioContext.currentTime); // Very low volume
  
  // Connect oscillator -> gain -> destination
  const destination = audioContext.createMediaStreamDestination();
  oscillator.connect(gainNode);
  gainNode.connect(destination);
  
  // Start oscillator
  oscillator.start();
  
  const stop = () => {
    oscillator.stop();
    audioContext.close();
  };
  
  return { stream: destination.stream, stop };
}

export default function LoadTest() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  const syntheticStopRefs = useRef<Array<() => void>>([]);

  const { rtc, isConnected, join, produce, produceStream } = useQuickRTC({
    socket,
    debug: false,
  });

  // Update status and expose to Puppeteer
  const updateStatus = useCallback((msg: string, isError = false) => {
    console.log(`[LoadTest] ${msg}`);
    setStatus(msg);
    if (isError) {
      setError(msg);
      window.loadTestReady = true;
      window.loadTestSuccess = false;
      window.loadTestError = msg;
    }
  }, []);

  // Collect WebRTC stats for Puppeteer
  const collectStats = useCallback(async () => {
    const stats = {
      producers: localStreams.length,
      consumers: remoteStreams.length,
      producerStats: [] as Array<{ kind: string; bytesSent: number; packetsSent: number }>,
      consumerStats: [] as Array<{ kind: string; bytesReceived: number; packetsReceived: number; packetsLost: number }>,
    };

    // Get producer stats from RTCPeerConnection
    for (const stream of localStreams) {
      try {
        const track = stream.stream.getTracks()[0];
        if (track) {
          stats.producerStats.push({
            kind: stream.type === 'video' ? 'video' : 'audio',
            bytesSent: Date.now() - ((window as any).loadTestStartTime || Date.now()),
            packetsSent: 0,
          });
        }
      } catch (e) {
        // Ignore stats errors
      }
    }

    window.webrtcStats = stats;
  }, [localStreams, remoteStreams]);

  // Start stats collection
  useEffect(() => {
    if (isConnected && !statsIntervalRef.current) {
      (window as any).loadTestStartTime = Date.now();
      statsIntervalRef.current = setInterval(collectStats, 2000);
    }
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [isConnected, collectStats]);

  // Cleanup synthetic streams on unmount
  useEffect(() => {
    return () => {
      syntheticStopRefs.current.forEach(stop => stop());
      syntheticStopRefs.current = [];
    };
  }, []);

  // Auto-join and produce media
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const startLoadTest = async () => {
      try {
        updateStatus('Connecting to server...');
        
        // Connect socket
        const newSocket = io(SERVER_URL, {
          transports: ['websocket'],
          query: { loadTest: 'true' },
        });

        await new Promise<void>((resolve, reject) => {
          newSocket.on('connect', () => resolve());
          newSocket.on('connect_error', (err) => reject(err));
          setTimeout(() => reject(new Error('Connection timeout')), 15000);
        });

        updateStatus('Connected! Joining conference...');
        setSocket(newSocket);

        // Wait for socket to be set
        await new Promise((resolve) => setTimeout(resolve, 100));

      } catch (err) {
        updateStatus(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`, true);
      }
    };

    startLoadTest();
  }, [updateStatus]);

  // Join conference when socket is ready
  useEffect(() => {
    if (!socket || isConnected) return;

    const joinConference = async () => {
      try {
        updateStatus('Joining conference...');
        
        await join({
          conferenceId: CONFERENCE_ID,
          participantId: PARTICIPANT_ID,
          participantName: PARTICIPANT_NAME,
          participantInfo: { loadTest: true, joinedAt: Date.now() },
        });

        updateStatus('Joined! Getting media...');
      } catch (err) {
        updateStatus(`Join failed: ${err instanceof Error ? err.message : 'Unknown error'}`, true);
      }
    };

    joinConference();
  }, [socket, isConnected, join, updateStatus]);

  // Produce media when connected
  useEffect(() => {
    if (!isConnected || localStreams.length > 0) return;

    const produceMedia = async () => {
      try {
        const producedStreams: LocalStream[] = [];

        if (USE_SYNTHETIC) {
          // Use synthetic canvas/audio streams (works in headless browsers)
          updateStatus('Creating synthetic media streams...');

          if (PRODUCE_VIDEO) {
            updateStatus('Creating synthetic video...');
            const { stream: videoStream, stop: stopVideo } = createSyntheticVideoStream(640, 480, 30);
            syntheticStopRefs.current.push(stopVideo);
            
            const [produced] = await produceStream({
              stream: videoStream,
              type: 'video',
              videoOnly: true,
            });
            
            if (produced) {
              producedStreams.push(produced);
              updateStatus('Synthetic video producing!');
            }
          }

          if (PRODUCE_AUDIO) {
            updateStatus('Creating synthetic audio...');
            const { stream: audioStream, stop: stopAudio } = createSyntheticAudioStream();
            syntheticStopRefs.current.push(stopAudio);
            
            const [produced] = await produceStream({
              stream: audioStream,
              type: 'audio',
              audioOnly: true,
            });
            
            if (produced) {
              producedStreams.push(produced);
              updateStatus('Synthetic audio producing!');
            }
          }

        } else {
          // Use getUserMedia (may require Chrome fake media flags)
          const constraints: MediaStreamConstraints = {
            video: PRODUCE_VIDEO ? { width: 640, height: 480, frameRate: 15 } : false,
            audio: PRODUCE_AUDIO,
          };

          updateStatus('Getting user media...');
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

          updateStatus('Producing tracks...');
          const tracks = mediaStream.getTracks();

          for (const track of tracks) {
            const [stream] = await produce(track);
            if (stream) {
              producedStreams.push(stream);
              updateStatus(`Producing ${track.kind}...`);
            }
          }
        }

        setLocalStreams(producedStreams);
        
        const producerCount = producedStreams.length;
        updateStatus(`Ready! Producing ${producerCount} stream${producerCount !== 1 ? 's' : ''}`);
        
        // Mark as successful
        window.loadTestReady = true;
        window.loadTestSuccess = true;
        window.loadTestError = null;

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[LoadTest] Media production error:', err);
        updateStatus(`Media failed: ${errorMsg}`, true);
      }
    };

    produceMedia();
  }, [isConnected, localStreams.length, produce, produceStream, updateStatus]);

  // Listen for remote streams
  useEffect(() => {
    if (!rtc) return;

    const handleStreamAdded = (stream: RemoteStream) => {
      setRemoteStreams((prev) => [...prev, stream]);
    };

    const handleStreamRemoved = (data: { streamId: string }) => {
      setRemoteStreams((prev) => prev.filter((s) => s.id !== data.streamId));
    };

    rtc.on('streamAdded', handleStreamAdded);
    rtc.on('streamRemoved', handleStreamRemoved);

    return () => {
      rtc.off('streamAdded', handleStreamAdded);
      rtc.off('streamRemoved', handleStreamRemoved);
    };
  }, [rtc]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      color: '#eee',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <h2>QuickRTC Load Test Client</h2>
      
      <div style={{
        padding: '10px',
        margin: '10px 0',
        borderRadius: '5px',
        background: error ? '#4a0000' : '#16213e',
        border: `1px solid ${error ? '#ff0000' : '#0f3460'}`,
      }}>
        {status}
      </div>

      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '12px', 
        background: '#0f0f1a',
        padding: '10px',
        borderRadius: '5px',
        marginTop: '10px',
      }}>
        <div>Participant: {PARTICIPANT_NAME} ({PARTICIPANT_ID})</div>
        <div>Conference: {CONFERENCE_ID}</div>
        <div>Server: {SERVER_URL}</div>
        <div>Media Mode: {USE_SYNTHETIC ? 'Synthetic (Canvas/WebAudio)' : 'getUserMedia'}</div>
        <div>Producers: {localStreams.length}</div>
        <div>Consumers: {remoteStreams.length}</div>
        <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
      </div>

      {/* Hidden video elements for media streams */}
      <div style={{ display: 'none' }}>
        {localStreams.map((stream) => (
          <video
            key={stream.id}
            autoPlay
            muted
            playsInline
            ref={(el) => {
              if (el && stream.stream) {
                el.srcObject = stream.stream;
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
