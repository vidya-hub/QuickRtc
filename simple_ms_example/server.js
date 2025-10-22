import express from "express";
import https from "https";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";
import { createRequire } from "module";

// Use require for CommonJS modules in ES module context
const require = createRequire(import.meta.url);
const { SimpleServer } = require("simple_ms_server");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const USE_HTTPS = process.env.USE_HTTPS === "true";

// SSL Certificate paths
const SSL_CERT = process.env.SSL_CERT || join(__dirname, "certs", "cert.pem");
const SSL_KEY = process.env.SSL_KEY || join(__dirname, "certs", "key.pem");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// HTTPS Server options
let httpsOptions = null;
if (USE_HTTPS) {
  try {
    httpsOptions = {
      key: fs.readFileSync(SSL_KEY),
      cert: fs.readFileSync(SSL_CERT),
    };
    console.log("✅ SSL certificates loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load SSL certificates:", error.message);
    console.error("📋 To generate certificates, run: npm run generate-certs");
    process.exit(1);
  }
}

// We'll initialize MediaSoup server later after creating the HTTP/HTTPS server
let mediaServer;

// Event logging for development
mediaServer.on("serverStarted", (event) => {
  console.log(`🚀 MediaSoup server started on port ${event.detail.port}`);
});

mediaServer.on("participantJoined", (event) => {
  console.log(
    `👋 ${event.detail.participant.name} joined conference ${event.detail.participant.conferenceId}`
  );
});

mediaServer.on("participantLeft", (event) => {
  console.log(
    `👋 ${event.detail.participant.name} left conference ${event.detail.participant.conferenceId}`
  );
});

mediaServer.on("conferenceCreated", (event) => {
  console.log(`🏠 Conference created: ${event.detail.conference.id}`);
});

mediaServer.on("conferenceDestroyed", (event) => {
  console.log(`🏠 Conference destroyed: ${event.detail.conferenceId}`);
});

mediaServer.on("producerCreated", (event) => {
  console.log(
    `📹 Producer created: ${event.detail.producerId} for participant ${event.detail.participantId}`
  );
});

// Routes
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// API endpoints for monitoring
app.get("/api/conferences", (req, res) => {
  res.json(mediaServer.getConferences());
});

app.get("/api/participants", (req, res) => {
  res.json(mediaServer.getParticipants());
});

app.get("/api/stats", (req, res) => {
  res.json(mediaServer.getStats());
});

app.get("/api/conferences/:id/participants", (req, res) => {
  const conferenceId = req.params.id;
  const participants = mediaServer.getConferenceParticipants(conferenceId);
  res.json(participants);
});

// Admin endpoints
app.post("/api/conferences/:id/close", async (req, res) => {
  try {
    const conferenceId = req.params.id;
    const { reason } = req.body;
    await mediaServer.closeConference(conferenceId, reason);
    res.json({ success: true, message: "Conference closed" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/participants/:id/kick", async (req, res) => {
  try {
    const participantId = req.params.id;
    const { reason } = req.body;
    await mediaServer.kickParticipant(participantId, reason);
    res.json({ success: true, message: "Participant kicked" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the integrated server
async function startServer() {
  try {
    if (USE_HTTPS && httpsOptions) {
      // For HTTPS, we need to create the server manually and integrate with MediaSoup
      const httpsServer = https.createServer(httpsOptions, app);

      // Create Socket.IO server manually with HTTPS
      const { Server } = await import("socket.io");
      const io = new Server(httpsServer, {
        cors: {
          origin: "*",
          credentials: true,
        },
        transports: ["websocket", "polling"],
      });

      // Override MediaSoup server's HTTP server and Socket.IO instance
      mediaServer.httpServer = httpsServer;
      mediaServer.io = io;

      // Start the MediaSoup server (will use our HTTPS server)
      await mediaServer.start();

      console.log(
        `🔒 HTTPS server with MediaSoup integration running on https://localhost:${HTTPS_PORT}`
      );
      console.log(
        `📱 Open https://localhost:${HTTPS_PORT} in your browser to test the video conference`
      );
      console.log(
        `⚠️  You may need to accept the self-signed certificate warning in your browser`
      );
    } else {
      // Start the MediaSoup server (this also starts the HTTP server and Socket.IO)
      await mediaServer.start();

      console.log(
        `🌐 HTTP server with MediaSoup integration running on http://localhost:${PORT}`
      );
      console.log(
        `📱 Open http://localhost:${PORT} in your browser to test the video conference`
      );
      console.log(
        `💡 For production, use HTTPS by setting USE_HTTPS=true and providing SSL certificates`
      );
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  try {
    await mediaServer.stop();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down server...");
  try {
    await mediaServer.stop();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

startServer();
