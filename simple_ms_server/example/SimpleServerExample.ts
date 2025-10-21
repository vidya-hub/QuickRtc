/**
 * SimpleServer Usage Examples
 *
 * This file demonstrates how to use the SimpleServer for easy WebRTC server setup
 */

import { SimpleServer, SimpleServerConfig } from "../src/index";

// Basic configuration
const config: SimpleServerConfig = {
  port: 3000,
  host: "0.0.0.0",
  cors: {
    origin: "*",
    credentials: true,
  },
  mediasoup: {
    workerSettings: {
      logLevel: "warn",
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    },
  },
};

// Create server instance
const server = new SimpleServer(config);

/**
 * Example 1: Basic Server Setup
 */
async function basicServerSetup() {
  try {
    // Start the server
    await server.start();

    console.log("🚀 Server is running!");
    console.log("📊 Server stats:", server.getStats());
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
}

/**
 * Example 2: Complete Event Handling Setup
 */
function setupEventHandlers() {
  // Server events
  server.on("serverStarted", (event) => {
    const { port, host } = event.detail;
    console.log(`✅ Server started successfully on ${host}:${port}`);
    console.log("🔗 WebSocket endpoint: ws://localhost:" + port);
  });

  server.on("serverError", (event) => {
    console.error("🚨 Server error:", event.detail.error.message);
  });

  // Connection events
  server.on("clientConnected", (event) => {
    console.log("🔌 New client connected:", event.detail.socketId);
    logServerStats();
  });

  server.on("clientDisconnected", (event) => {
    console.log("🔌 Client disconnected:", event.detail.socketId);
    logServerStats();
  });

  // Conference events
  server.on("conferenceCreated", (event) => {
    const conference = event.detail.conference;
    console.log(
      `🏠 Conference created: ${conference.id} (${
        conference.name || "Unnamed"
      })`
    );
    logConferences();
  });

  server.on("conferenceDestroyed", (event) => {
    console.log(`🏠 Conference ended: ${event.detail.conferenceId}`);
    logConferences();
  });

  // Participant events
  server.on("participantJoined", (event) => {
    const participant = event.detail.participant;
    console.log(
      `👋 ${participant.name} joined conference ${participant.conferenceId}`
    );
    logParticipants(participant.conferenceId);
  });

  server.on("participantLeft", (event) => {
    const participant = event.detail.participant;
    console.log(
      `👋 ${participant.name} left conference ${participant.conferenceId}`
    );
    logParticipants(participant.conferenceId);
  });

  // Media events
  server.on("producerCreated", (event) => {
    const { participantId, producerId, kind } = event.detail;
    console.log(
      `📹 ${kind} producer created: ${producerId} for participant ${participantId}`
    );
  });

  server.on("producerClosed", (event) => {
    const { participantId, producerId } = event.detail;
    console.log(
      `📹 Producer closed: ${producerId} for participant ${participantId}`
    );
  });

  server.on("consumerCreated", (event) => {
    const { participantId, consumerId, producerId } = event.detail;
    console.log(
      `📺 Consumer created: ${consumerId} (producer: ${producerId}) for participant ${participantId}`
    );
  });

  server.on("consumerClosed", (event) => {
    const { participantId, consumerId } = event.detail;
    console.log(
      `📺 Consumer closed: ${consumerId} for participant ${participantId}`
    );
  });

  // Media state events
  server.on("audioMuted", (event) => {
    const { participantId, conferenceId } = event.detail;
    console.log(
      `🔇 Audio muted: participant ${participantId} in conference ${conferenceId}`
    );
  });

  server.on("audioUnmuted", (event) => {
    const { participantId, conferenceId } = event.detail;
    console.log(
      `🔊 Audio unmuted: participant ${participantId} in conference ${conferenceId}`
    );
  });

  server.on("videoMuted", (event) => {
    const { participantId, conferenceId } = event.detail;
    console.log(
      `📵 Video muted: participant ${participantId} in conference ${conferenceId}`
    );
  });

  server.on("videoUnmuted", (event) => {
    const { participantId, conferenceId } = event.detail;
    console.log(
      `📹 Video unmuted: participant ${participantId} in conference ${conferenceId}`
    );
  });
}

/**
 * Example 3: Server Management Functions
 */

function logServerStats() {
  const stats = server.getStats();
  console.log("📊 Server Statistics:");
  console.log(`   Uptime: ${Math.round(stats.uptime)}s`);
  console.log(`   Active Conferences: ${stats.conferenceCount}`);
  console.log(`   Total Participants: ${stats.participantCount}`);
  console.log(`   WebSocket Connections: ${stats.totalConnections}`);
}

function logConferences() {
  const conferences = server.getConferences();
  console.log("🏠 Active Conferences:");
  conferences.forEach((conf) => {
    console.log(
      `   - ${conf.id}: ${
        conf.participantCount
      } participants (created: ${conf.createdAt.toLocaleTimeString()})`
    );
  });
}

function logParticipants(conferenceId?: string) {
  const participants = conferenceId
    ? server.getConferenceParticipants(conferenceId)
    : server.getParticipants();

  console.log(`👥 Participants${conferenceId ? ` in ${conferenceId}` : ""}:`);
  participants.forEach((p) => {
    const mediaState = `Audio: ${
      p.mediaState.audioEnabled ? "🔊" : "🔇"
    }, Video: ${p.mediaState.videoEnabled ? "📹" : "📵"}`;
    console.log(`   - ${p.name} (${p.id}) - ${mediaState}`);
  });
}

/**
 * Example 4: Admin Functions
 */

// Kick a participant
async function kickParticipant(participantId: string, reason?: string) {
  try {
    await server.kickParticipant(participantId, reason);
    console.log(`👢 Kicked participant ${participantId}`);
  } catch (error) {
    console.error(`❌ Failed to kick participant ${participantId}:`, error);
  }
}

// Close a conference
async function closeConference(conferenceId: string, reason?: string) {
  try {
    await server.closeConference(conferenceId, reason);
    console.log(`🏠 Closed conference ${conferenceId}`);
  } catch (error) {
    console.error(`❌ Failed to close conference ${conferenceId}:`, error);
  }
}

// Broadcast message to all participants in a conference
function announceToConference(conferenceId: string, message: string) {
  server.broadcastToConference(conferenceId, "announcement", {
    message,
    timestamp: new Date().toISOString(),
    type: "admin",
  });
  console.log(`📢 Announced to conference ${conferenceId}: ${message}`);
}

// Send private message to a participant
function messageParticipant(participantId: string, message: string) {
  server.sendToParticipant(participantId, "privateMessage", {
    message,
    timestamp: new Date().toISOString(),
    from: "admin",
  });
  console.log(`💬 Messaged participant ${participantId}: ${message}`);
}

/**
 * Example 5: Monitoring and Health Checks
 */

function startMonitoring() {
  // Log stats every 30 seconds
  setInterval(() => {
    console.log("\n📊 === Server Health Check ===");
    logServerStats();

    const conferences = server.getConferences();
    if (conferences.length > 0) {
      console.log("\n🏠 === Active Conferences ===");
      logConferences();
    }

    console.log("=".repeat(40) + "\n");
  }, 30000);
}

/**
 * Example 6: Graceful Shutdown
 */

async function gracefulShutdown() {
  console.log("🛑 Initiating graceful shutdown...");

  // Notify all participants
  const conferences = server.getConferences();
  for (const conference of conferences) {
    server.broadcastToConference(conference.id, "serverShutdown", {
      message: "Server is shutting down for maintenance",
      gracePeriod: 10000, // 10 seconds
    });
  }

  // Wait a bit for clients to handle the notification
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Stop the server
  await server.stop();
  console.log("✅ Server shutdown complete");
  process.exit(0);
}

// Handle process termination
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

/**
 * Example 7: Complete Server Application
 */

async function runServer() {
  try {
    console.log("🚀 Starting Simple MediaSoup Server...");

    // Setup event handlers
    setupEventHandlers();

    // Start the server
    await server.start();

    // Start monitoring
    startMonitoring();

    // Log initial state
    console.log("\n✅ Server is ready!");
    console.log("📋 Available endpoints:");
    console.log(`   - WebSocket: ws://localhost:${config.port || 3000}`);
    console.log(`   - Health check available via server.getStats()`);

    // Example of scheduled maintenance
    setTimeout(() => {
      console.log("🔧 Running scheduled maintenance...");

      // Clean up empty conferences (if any)
      const conferences = server.getConferences();
      conferences.forEach((conf) => {
        if (conf.participantCount === 0) {
          console.log(`🧹 Cleaning up empty conference: ${conf.id}`);
          // In a real application, you might want to clean up empty conferences
        }
      });

      console.log("✅ Maintenance complete");
    }, 60000); // Run after 1 minute
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Run the server if this file is executed directly
if (require.main === module) {
  runServer();
}

// Export functions for use in other modules
export {
  server,
  basicServerSetup,
  setupEventHandlers,
  logServerStats,
  logConferences,
  logParticipants,
  kickParticipant,
  closeConference,
  announceToConference,
  messageParticipant,
  startMonitoring,
  gracefulShutdown,
  runServer,
};
