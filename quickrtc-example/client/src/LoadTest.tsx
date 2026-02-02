/**
 * QuickRTC Load Test Client
 * 
 * Auto-joins a conference based on URL parameters and produces media.
 * Used by Puppeteer-based load testing with fake media streams.
 * 
 * URL Parameters:
 *   - participantId: Unique ID for this participant
 *   - participantName: Display name
 *   - conferenceId: Room to join
 *   - video: true/false to produce video
 *   - audio: true/false to produce audio
 *   - serverUrl: Override server URL
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

export default function LoadTest() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  const { rtc, isConnected, join, produce } = useQuickRTC({
    socket,
    debug: false,
  });

  // Update status and expose to Puppeteer
  const updateStatus = useCallback((msg: string, isError = false) => {
    console.log(msg);
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
          // Note: In a real implementation, we'd get stats from the RTCPeerConnection
          // For now, estimate based on stream state
          stats.producerStats.push({
            kind: stream.type === 'video' ? 'video' : 'audio',
            bytesSent: Date.now() - (window as any).loadTestStartTime || 0, // Placeholder
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
        // Get media (fake in headless Chrome)
        const constraints: MediaStreamConstraints = {
          video: PRODUCE_VIDEO ? { width: 640, height: 480, frameRate: 15 } : false,
          audio: PRODUCE_AUDIO,
        };

        updateStatus('Getting user media...');
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        updateStatus('Producing tracks...');
        const tracks = mediaStream.getTracks();
        const producedStreams: LocalStream[] = [];

        for (const track of tracks) {
          const [stream] = await produce(track);
          if (stream) {
            producedStreams.push(stream);
            updateStatus(`Producing ${track.kind}...`);
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
        updateStatus(`Media failed: ${err instanceof Error ? err.message : 'Unknown error'}`, true);
      }
    };

    produceMedia();
  }, [isConnected, localStreams.length, produce, updateStatus]);

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
