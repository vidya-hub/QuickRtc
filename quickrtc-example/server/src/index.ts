import express from "express";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";
import os from "os";
import {
  Registry,
  Gauge,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from "prom-client";

const PORT = parseInt(process.env.PORT || "3000");
const USE_SSL = process.env.USE_SSL !== "false"; // Default to SSL for local dev

// RTC port range (must match Docker exposed ports)
const RTC_MIN_PORT = parseInt(process.env.RTC_MIN_PORT || "40000");
const RTC_MAX_PORT = parseInt(process.env.RTC_MAX_PORT || "40100");

// Get local IP for listenIp (internal)
const getListenIp = (): string => {
  // Use 0.0.0.0 to bind to all interfaces - this works for both local and remote connections
  return "0.0.0.0";
};

// Get announced IP for external access
const getAnnouncedIp = (): string | null => {
  if (process.env.ANNOUNCED_IP) {
    return process.env.ANNOUNCED_IP;
  }
  // For local network development, use the machine's local IP
  // This must match the IP that clients connect to
  return "192.168.29.46";
};

// =============================================================================
// Prometheus Metrics Setup
// =============================================================================
const register = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop lag)
collectDefaultMetrics({ register, prefix: "quickrtc_nodejs_" });

// Custom QuickRTC metrics
const conferenceGauge = new Gauge({
  name: "quickrtc_conferences_total",
  help: "Total number of active conferences",
  registers: [register],
});

const participantGauge = new Gauge({
  name: "quickrtc_participants_total",
  help: "Total number of connected participants",
  registers: [register],
});

const socketConnectionsGauge = new Gauge({
  name: "quickrtc_socket_connections_total",
  help: "Total number of active socket connections",
  registers: [register],
});

const participantsPerConferenceGauge = new Gauge({
  name: "quickrtc_participants_per_conference",
  help: "Number of participants per conference",
  labelNames: ["conference_id"],
  registers: [register],
});

const producersGauge = new Gauge({
  name: "quickrtc_producers_total",
  help: "Total number of active producers",
  registers: [register],
});

const consumersGauge = new Gauge({
  name: "quickrtc_consumers_total",
  help: "Total number of active consumers",
  registers: [register],
});

const workerCpuGauge = new Gauge({
  name: "quickrtc_worker_cpu_usage",
  help: "CPU usage per mediasoup worker",
  labelNames: ["worker_id"],
  registers: [register],
});

const workerRouterGauge = new Gauge({
  name: "quickrtc_worker_routers_total",
  help: "Number of routers per worker",
  labelNames: ["worker_id"],
  registers: [register],
});

const joinCounter = new Counter({
  name: "quickrtc_participant_joins_total",
  help: "Total number of participant joins",
  registers: [register],
});

const leaveCounter = new Counter({
  name: "quickrtc_participant_leaves_total",
  help: "Total number of participant leaves",
  registers: [register],
});

const joinLatencyHistogram = new Histogram({
  name: "quickrtc_join_latency_seconds",
  help: "Latency of participant joins",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const serverUptimeGauge = new Gauge({
  name: "quickrtc_server_uptime_seconds",
  help: "Server uptime in seconds",
  registers: [register],
});

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Serve React client dist for load testing
// Check multiple possible paths (local dev vs Docker)
const possibleClientDirs = [
  path.join(process.cwd(), "..", "client", "dist"),  // Local development
  path.join(process.cwd(), "client", "dist"),        // Docker production
];
const clientDistDir = possibleClientDirs.find(dir => fs.existsSync(dir));

if (clientDistDir) {
  console.log(`Serving client from: ${clientDistDir}`);
  // Serve static assets from client dist
  app.use("/assets", express.static(path.join(clientDistDir, "assets")));
  app.use("/loadtest-assets", express.static(path.join(clientDistDir, "assets")));
  
  // Serve index.html at root (main app)
  app.get("/", (req, res) => {
    const indexHtml = path.join(clientDistDir, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.type("text/html").sendFile(indexHtml);
    } else {
      res.status(404).send("Client not found. Run 'npm run build' in client first.");
    }
  });
  
  // Serve loadtest.html at /loadtest
  app.get("/loadtest", (req, res) => {
    const loadtestHtml = path.join(clientDistDir, "loadtest.html");
    if (fs.existsSync(loadtestHtml)) {
      // Read and rewrite asset paths to use /loadtest-assets
      let html = fs.readFileSync(loadtestHtml, "utf-8");
      html = html.replace(/\/assets\//g, "/loadtest-assets/");
      res.type("text/html").send(html);
    } else {
      res.status(404).send("Load test page not found. Run 'npm run build' in client first.");
    }
  });
} else {
  console.log("Client dist not found - client endpoints disabled");
}

// Serve static files for vanilla example
// const vanillaDir = path.join(process.cwd(), "..", "vanilla");
// if (fs.existsSync(vanillaDir)) {
//   app.use(express.static(vanillaDir));
// }

// Serve QuickRTC client bundle
const quickrtcClientBundle = path.join(
  process.cwd(),
  "..",
  "..",
  "quickrtc_client",
  "dist",
  "index.js",
);
app.get("/quickrtc-client.js", (req, res) => {
  if (fs.existsSync(quickrtcClientBundle)) {
    res.type("application/javascript");
    res.sendFile(quickrtcClientBundle);
  } else {
    res
      .status(404)
      .send(
        "QuickRTC client not found. Run 'npm run build' in quickrtc_client first.",
      );
  }
});

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Prometheus metrics endpoint
app.get("/metrics", async (_, res) => {
  try {
    // Update gauges with current server stats
    const stats = quickrtc.getStats();
    conferenceGauge.set(stats.conferenceCount);
    participantGauge.set(stats.participantCount);
    producersGauge.set(stats.producerCount);
    consumersGauge.set(stats.consumerCount);
    socketConnectionsGauge.set(stats.totalConnections);
    serverUptimeGauge.set(stats.uptime);

    // Update per-conference participant counts
    const conferences = quickrtc.getConferences();
    for (const conf of conferences) {
      participantsPerConferenceGauge.set(
        { conference_id: conf.id },
        conf.participantCount,
      );
    }

    // Expose metrics in Prometheus format
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error("Error generating metrics:", error);
    res.status(500).end(String(error));
  }
});

// Stats endpoint (JSON format for debugging)
app.get("/stats", (_, res) => {
  try {
    const stats = quickrtc.getStats();
    const conferences = quickrtc.getConferences();
    res.json({
      ...stats,
      conferences: conferences.map((c) => ({
        id: c.id,
        name: c.name,
        participantCount: c.participantCount,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create HTTP or HTTPS server based on environment
let server: http.Server | https.Server;

if (USE_SSL) {
  // Load SSL certs - check multiple paths (local dev vs Docker)
  const possibleCertsDirs = [
    path.join(process.cwd(), "..", "certs"),  // Local development
    path.join(process.cwd(), "certs"),        // Docker production
  ];
  const certsDir = possibleCertsDirs.find(dir => fs.existsSync(path.join(dir, "key.pem")));

  if (!certsDir) {
    console.error(
      "SSL certs not found. Run 'npm run generate-certs' first, or set USE_SSL=false",
    );
    process.exit(1);
  }

  console.log(`Loading SSL certs from: ${certsDir}`);

  const sslOptions = {
    key: fs.readFileSync(path.join(certsDir, "key.pem")),
    cert: fs.readFileSync(path.join(certsDir, "cert.pem")),
  };
  server = https.createServer(sslOptions, app);
  console.log("Starting with HTTPS (SSL enabled)");
} else {
  // HTTP for Docker (nginx handles SSL)
  server = http.createServer(app);
  console.log(
    "Starting with HTTP (SSL disabled - use nginx for SSL termination)",
  );
}

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: { origin: "*", credentials: true },
  transports: ["websocket", "polling"],
});

// Create QuickRTC server
const listenIp = getListenIp();
const announcedIp = getAnnouncedIp();
console.log("listenIp ", listenIp);
console.log("announcedIp ", announcedIp);

const quickrtc = new QuickRTCServer({
  httpServer: server,
  socketServer: io,
  quickrtcConfig: {
    workerSettings: {
      logLevel: "warn",
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
      rtcMinPort: RTC_MIN_PORT,
      rtcMaxPort: RTC_MAX_PORT,
    },
    webRtcServerOptions: {
      listenInfos: [
        {
          ip: listenIp,
          announcedIp,
        },
      ],
    },
  },
});

// Event logging
quickrtc.on("conferenceCreated", (e) =>
  console.log(`Conference created: ${e.detail.conference.id}`),
);
quickrtc.on("participantJoined", (e) => {
  const info = (
    e.detail.participant as { participantInfo?: Record<string, unknown> }
  ).participantInfo;
  console.log(
    `${e.detail.participant.name} joined`,
    info ? `(info: ${JSON.stringify(info)})` : "",
  );
  // Update metrics
  joinCounter.inc();
});
quickrtc.on("participantLeft", (e) => {
  console.log(`${e.detail.participant.name} left`);
  // Update metrics
  leaveCounter.inc();
});

// Start server
quickrtc.start().then(() => {
  server.listen(PORT, () => {
    const protocol = USE_SSL ? "https" : "http";
    console.log(`\nServer running at ${protocol}://localhost:${PORT}`);
    console.log(`Listen IP: ${listenIp}`);
    console.log(`Announced IP: ${announcedIp}`);
    console.log(`RTC Ports: ${RTC_MIN_PORT}-${RTC_MAX_PORT}`);
    console.log();
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await quickrtc.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down...");
  await quickrtc.stop();
  process.exit(0);
});
