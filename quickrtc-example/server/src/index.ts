import express from "express";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";
import os from "os";

const PORT = parseInt(process.env.PORT || "3000");
const USE_SSL = process.env.USE_SSL !== "false"; // Default to SSL for local dev

// Get local IP for announcedIp
const getLocalIp = (): string => {
  // First check for environment variable (Docker)
  if (process.env.ANNOUNCED_IP) {
    return process.env.ANNOUNCED_IP;
  }

  const ifaces = os.networkInterfaces();
  for (const ifname of Object.keys(ifaces)) {
    const ifaceList = ifaces[ifname];
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
};

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

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
  "index.js"
);
app.get("/quickrtc-client.js", (req, res) => {
  if (fs.existsSync(quickrtcClientBundle)) {
    res.type("application/javascript");
    res.sendFile(quickrtcClientBundle);
  } else {
    res
      .status(404)
      .send(
        "QuickRTC client not found. Run 'npm run build' in quickrtc_client first."
      );
  }
});

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Create HTTP or HTTPS server based on environment
let server: http.Server | https.Server;

if (USE_SSL) {
  // Load SSL certs for local development
  const certsDir = path.join(process.cwd(), "..", "certs");

  if (!fs.existsSync(path.join(certsDir, "key.pem"))) {
    console.error(
      "SSL certs not found. Run 'npm run generate-certs' first, or set USE_SSL=false"
    );
    process.exit(1);
  }

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
    "Starting with HTTP (SSL disabled - use nginx for SSL termination)"
  );
}

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: { origin: "*", credentials: true },
  transports: ["websocket", "polling"],
});

// Create QuickRTC server
const announcedIp = getLocalIp();
const quickrtc = new QuickRTCServer({
  httpServer: server,
  socketServer: io,
  quickrtcConfig: {
    webRtcServerOptions: {
      listenInfos: [{ ip: "0.0.0.0", announcedIp }],
    },
  },
});

// Event logging
quickrtc.on("conferenceCreated", (e) =>
  console.log(`Conference created: ${e.detail.conference.id}`)
);
quickrtc.on("participantJoined", (e) => {
  const info = e.detail.participant.info;
  console.log(
    `${e.detail.participant.name} joined`,
    info ? `(info: ${JSON.stringify(info)})` : ""
  );
});
quickrtc.on("participantLeft", (e) =>
  console.log(`${e.detail.participant.name} left`)
);

// Start server
quickrtc.start().then(() => {
  server.listen(PORT, () => {
    const protocol = USE_SSL ? "https" : "http";
    console.log(`\nServer running at ${protocol}://localhost:${PORT}`);
    console.log(`Announced IP: ${announcedIp}`);
    // if (fs.existsSync(vanillaDir)) {
    //   console.log(`Vanilla example: ${protocol}://localhost:${PORT}/`);
    // }
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
