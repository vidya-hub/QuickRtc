import express from "express";
import https from "https";
import fs from "fs";
import path from "path";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { QuickRTCServer } from "quickrtc-server";
import os from "os";

const PORT = 3000;

// Get local IP for announcedIp
const getLocalIp = (): string => {
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

// Load SSL certs from parent directory
const certsDir = path.join(process.cwd(), "..", "certs");
const sslOptions = {
  key: fs.readFileSync(path.join(certsDir, "key.pem")),
  cert: fs.readFileSync(path.join(certsDir, "cert.pem")),
};

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Serve static files for vanilla example
const vanillaDir = path.join(process.cwd(), "..", "vanilla");
app.use(express.static(vanillaDir));

// Serve QuickRTC client bundle
const quickrtcClientBundle = path.join(process.cwd(), "..", "..", "quickrtc_client", "dist", "index.js");
app.get("/quickrtc-client.js", (req, res) => {
  if (fs.existsSync(quickrtcClientBundle)) {
    res.type("application/javascript");
    res.sendFile(quickrtcClientBundle);
  } else {
    res.status(404).send("QuickRTC client not found. Run 'npm run build' in quickrtc_client first.");
  }
});

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Create HTTPS server
const httpsServer = https.createServer(sslOptions, app);

// Create Socket.IO server
const io = new SocketIOServer(httpsServer, {
  cors: { origin: "*", credentials: true },
  transports: ["websocket", "polling"],
});

// Create QuickRTC server
const quickrtc = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer: io,
  quickrtcConfig: {
    webRtcServerOptions: {
      listenInfos: [{ ip: "0.0.0.0", announcedIp: getLocalIp() }],
    },
  },
});

// Event logging
quickrtc.on("conferenceCreated", (e) =>
  console.log(`Conference created: ${e.detail.conference.id}`)
);
quickrtc.on("participantJoined", (e) => {
  const info = e.detail.participant.info;
  console.log(`${e.detail.participant.name} joined`, info ? `(info: ${JSON.stringify(info)})` : '');
});
quickrtc.on("participantLeft", (e) =>
  console.log(`${e.detail.participant.name} left`)
);

// Start server
quickrtc.start().then(() => {
  httpsServer.listen(PORT, () => {
    console.log(`\nServer running at https://localhost:${PORT}`);
    console.log(`Vanilla example: https://localhost:${PORT}/`);
    console.log(`Local IP: ${getLocalIp()}\n`);
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await quickrtc.stop();
  process.exit(0);
});
