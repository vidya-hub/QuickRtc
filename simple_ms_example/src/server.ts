import express, { Express, Request, Response, NextFunction } from "express";
import https from "https";
import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";

import {
  SimpleServer,
  type SimpleServerConfig,
  type SimpleServerEvents,
} from "simple_ms_server";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "simple_ms_types";

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment configuration
interface ServerConfig {
  port: number;
  httpsPort: number;
  useHttps: boolean;
  sslCertPath: string;
  sslKeyPath: string;
  host: string;
}

// SSL Options interface
interface SSLOptions {
  key: Buffer;
  cert: Buffer;
}

// Custom error interface
interface ServerError extends Error {
  code?: string;
}

class MediaSoupExpressServer {
  private app: Express;
  private config: ServerConfig;
  private httpServer?: http.Server | https.Server;
  private socketServer?: SocketIOServer<
    ServerToClientEvents,
    ClientToServerEvents
  >;
  private mediaServer?: SimpleServer;

  constructor() {
    this.app = express();
    this.config = {
      port: parseInt(process.env.PORT || "3000"),
      httpsPort: parseInt(process.env.HTTPS_PORT || "3443"),
      useHttps: process.env.USE_HTTPS === "true",
      sslCertPath:
        process.env.SSL_CERT || join(__dirname, "..", "certs", "cert.pem"),
      sslKeyPath:
        process.env.SSL_KEY || join(__dirname, "..", "certs", "key.pem"),
      host: process.env.HOST || "0.0.0.0",
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS middleware
    this.app.use(
      cors({
        origin: "*",
        credentials: true,
      })
    );

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files middleware
    this.app.use(express.static(join(__dirname, "..", "public")));

    // Serve client library
    this.app.use(
      "/simple_ms_client",
      express.static(join(__dirname, "..", "..", "simple_ms_client"))
    );

    // Error handling middleware
    this.app.use(this.errorHandler.bind(this));
  }

  private setupRoutes(): void {
    // Main route
    this.app.get("/", (req: Request, res: Response) => {
      res.sendFile(join(__dirname, "..", "public", "index.html"));
    });

    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        server: this.config.useHttps ? "https" : "http",
      });
    });

    // API endpoints for monitoring
    this.app.get("/api/conferences", (req: Request, res: Response) => {
      if (!this.mediaServer) {
        return res
          .status(503)
          .json({ error: "MediaSoup server not initialized" });
      }
      const conferences = this.mediaServer.getConferences();
      return res.json(conferences);
    });

    this.app.get("/api/participants", (req: Request, res: Response) => {
      if (!this.mediaServer) {
        return res
          .status(503)
          .json({ error: "MediaSoup server not initialized" });
      }
      const participants = this.mediaServer.getParticipants();
      return res.json(participants);
    });

    this.app.get("/api/stats", (req: Request, res: Response) => {
      if (!this.mediaServer) {
        return res
          .status(503)
          .json({ error: "MediaSoup server not initialized" });
      }
      const stats = this.mediaServer.getStats();
      return res.json(stats);
    });

    this.app.get(
      "/api/conferences/:id/participants",
      (req: Request, res: Response) => {
        if (!this.mediaServer) {
          return res
            .status(503)
            .json({ error: "MediaSoup server not initialized" });
        }
        const conferenceId = req.params.id;
        const participants =
          this.mediaServer.getConferenceParticipants(conferenceId);
        return res.json(participants);
      }
    );

    // Admin endpoints
    this.app.post(
      "/api/conferences/:id/close",
      async (req: Request, res: Response) => {
        try {
          if (!this.mediaServer) {
            return res
              .status(503)
              .json({ error: "MediaSoup server not initialized" });
          }
          const conferenceId = req.params.id;
          const { reason } = req.body;
          await this.mediaServer.closeConference(conferenceId, reason);
          return res.json({ success: true, message: "Conference closed" });
        } catch (error) {
          return res.status(400).json({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    this.app.post(
      "/api/participants/:id/kick",
      async (req: Request, res: Response) => {
        try {
          if (!this.mediaServer) {
            return res
              .status(503)
              .json({ error: "MediaSoup server not initialized" });
          }
          const participantId = req.params.id;
          const { reason } = req.body;
          await this.mediaServer.kickParticipant(participantId, reason);
          return res.json({ success: true, message: "Participant kicked" });
        } catch (error) {
          return res.status(400).json({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );
  }

  private errorHandler(
    err: ServerError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    console.error("Express error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
      code: err.code,
    });
  }

  private loadSSLCertificates(): SSLOptions {
    try {
      const key = fs.readFileSync(this.config.sslKeyPath);
      const cert = fs.readFileSync(this.config.sslCertPath);
      console.log("✅ SSL certificates loaded successfully");
      return { key, cert };
    } catch (error) {
      console.error(
        "❌ Failed to load SSL certificates:",
        error instanceof Error ? error.message : error
      );
      console.error("📋 To generate certificates, run: npm run generate-certs");
      throw new Error("SSL certificate loading failed");
    }
  }

  private createHttpServer(): http.Server | https.Server {
    if (this.config.useHttps) {
      const sslOptions = this.loadSSLCertificates();
      return https.createServer(sslOptions, this.app);
    } else {
      return http.createServer(this.app);
    }
  }

  private createSocketServer(
    httpServer: http.Server | https.Server
  ): SocketIOServer<ServerToClientEvents, ClientToServerEvents> {
    return new SocketIOServer<ServerToClientEvents, ClientToServerEvents>(
      httpServer,
      {
        cors: {
          origin: "*",
          credentials: true,
        },
        transports: ["websocket", "polling"],
      }
    );
  }

  private createMediaServer(
    httpServer: http.Server | https.Server,
    socketServer: SocketIOServer<ServerToClientEvents, ClientToServerEvents>
  ): SimpleServer {
    const mediaServerConfig: SimpleServerConfig = {
      // Inject our servers instead of letting SimpleServer create them
      httpServer,
      socketServer,
      mediasoup: {
        workerSettings: {
          logLevel: "warn",
          logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
          rtcMinPort: 40000,
          rtcMaxPort: 49999,
        },
        routerOptions: {
          mediaCodecs: [
            {
              kind: "audio",
              mimeType: "audio/opus",
              clockRate: 48000,
              channels: 2,
            },
            {
              kind: "video",
              mimeType: "video/H264",
              clockRate: 90000,
              parameters: {
                "packetization-mode": 1,
                "profile-level-id": "42e01f",
                "level-asymmetry-allowed": 1,
              },
            },
            {
              kind: "video",
              mimeType: "video/VP8",
              clockRate: 90000,
              parameters: {},
            },
          ],
        },
        transportOptions: {
          listenIps: [
            {
              ip: "127.0.0.1",
              announcedIp: "157.50.159.179",
            },
          ],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
          enableSctp: false,
        },
      },
    };

    const mediaServer = new SimpleServer(mediaServerConfig);

    this.setupMediaServerEvents(mediaServer);
    return mediaServer;
  }

  private setupMediaServerEvents(mediaServer: SimpleServer): void {
    // Server events
    mediaServer.on(
      "serverStarted",
      (event: CustomEvent<SimpleServerEvents["serverStarted"]>) => {
        const timestamp = new Date().toISOString();
        console.log(
          `[${timestamp}] 🚀 MediaSoup server initialized successfully`
        );
        console.log(`[${timestamp}] 📊 Server ready to handle conferences`);
      }
    );

    mediaServer.on(
      "serverError",
      (event: CustomEvent<SimpleServerEvents["serverError"]>) => {
        const timestamp = new Date().toISOString();
        console.error(
          `[${timestamp}] ❌ MediaSoup server error:`,
          event.detail.error
        );
        console.error(
          `[${timestamp}] 🔍 Error details:`,
          event.detail.error.message
        );
      }
    );

    // Connection events
    mediaServer.on(
      "clientConnected",
      (event: CustomEvent<SimpleServerEvents["clientConnected"]>) => {
        const timestamp = new Date().toISOString();
        console.log(
          `[${timestamp}] 🔌 Client connected: ${event.detail.socketId}`
        );
        console.log(
          `[${timestamp}] 📈 Total active clients: ${
            this.socketServer?.engine.clientsCount || "Unknown"
          }`
        );
      }
    );

    mediaServer.on(
      "clientDisconnected",
      (event: CustomEvent<SimpleServerEvents["clientDisconnected"]>) => {
        const timestamp = new Date().toISOString();
        console.log(
          `[${timestamp}] 🔌 Client disconnected: ${event.detail.socketId}`
        );
        console.log(
          `[${timestamp}] 📉 Total active clients: ${
            this.socketServer?.engine.clientsCount || "Unknown"
          }`
        );
      }
    );

    // Conference events
    mediaServer.on(
      "participantJoined",
      (event: CustomEvent<SimpleServerEvents["participantJoined"]>) => {
        const timestamp = new Date().toISOString();
        const { participant } = event.detail;
        console.log(
          `[${timestamp}] 👋 Participant joined: ${participant.name} (ID: ${participant.id})`
        );
        console.log(
          `[${timestamp}] 🏠 Conference: ${participant.conferenceId}`
        );
        console.log(`[${timestamp}] 🔗 Socket: ${participant.socketId}`);

        // Log conference participant count
        const conferenceParticipants =
          this.mediaServer?.getConferenceParticipants(
            participant.conferenceId
          ) || [];
        console.log(
          `[${timestamp}] 👥 Conference ${participant.conferenceId} now has ${conferenceParticipants.length} participants`
        );
      }
    );

    mediaServer.on(
      "participantLeft",
      (event: CustomEvent<SimpleServerEvents["participantLeft"]>) => {
        const timestamp = new Date().toISOString();
        const { participant } = event.detail;
        console.log(
          `[${timestamp}] 👋 Participant left: ${participant.name} (ID: ${participant.id})`
        );
        console.log(
          `[${timestamp}] 🏠 Conference: ${participant.conferenceId}`
        );

        // Log remaining participant count
        const conferenceParticipants =
          this.mediaServer?.getConferenceParticipants(
            participant.conferenceId
          ) || [];
        console.log(
          `[${timestamp}] 👥 Conference ${participant.conferenceId} now has ${conferenceParticipants.length} participants`
        );
      }
    );

    mediaServer.on(
      "conferenceCreated",
      (event: CustomEvent<SimpleServerEvents["conferenceCreated"]>) => {
        const timestamp = new Date().toISOString();
        const { conference } = event.detail;
        console.log(`[${timestamp}] 🏠 Conference created: ${conference.id}`);
        console.log(
          `[${timestamp}] 📋 Conference name: ${conference.name || "Unnamed"}`
        );

        // Log total active conferences
        const totalConferences = this.mediaServer?.getConferences().length || 0;
        console.log(
          `[${timestamp}] 📊 Total active conferences: ${totalConferences}`
        );
      }
    );

    mediaServer.on(
      "conferenceDestroyed",
      (event: CustomEvent<SimpleServerEvents["conferenceDestroyed"]>) => {
        const timestamp = new Date().toISOString();
        console.log(
          `[${timestamp}] 🏠 Conference destroyed: ${event.detail.conferenceId}`
        );

        // Log total remaining conferences
        const totalConferences = this.mediaServer?.getConferences().length || 0;
        console.log(
          `[${timestamp}] 📊 Total active conferences: ${totalConferences}`
        );
      }
    );

    // Media events
    mediaServer.on(
      "producerCreated",
      (event: CustomEvent<SimpleServerEvents["producerCreated"]>) => {
        const timestamp = new Date().toISOString();
        const { producerId, participantId, kind } = event.detail;
        console.log(`[${timestamp}] 📹 Producer created: ${producerId}`);
        console.log(`[${timestamp}] 👤 Participant: ${participantId}`);
        console.log(`[${timestamp}] 🎭 Media kind: ${kind}`);
      }
    );

    mediaServer.on(
      "producerClosed",
      (event: CustomEvent<SimpleServerEvents["producerClosed"]>) => {
        const timestamp = new Date().toISOString();
        const { producerId, participantId } = event.detail;
        console.log(`[${timestamp}] 📹 Producer closed: ${producerId}`);
        console.log(`[${timestamp}] 👤 Participant: ${participantId}`);
      }
    );

    mediaServer.on(
      "consumerCreated",
      (event: CustomEvent<SimpleServerEvents["consumerCreated"]>) => {
        const timestamp = new Date().toISOString();
        const { consumerId, participantId, producerId } = event.detail;
        console.log(`[${timestamp}] 📺 Consumer created: ${consumerId}`);
        console.log(`[${timestamp}] 👤 For participant: ${participantId}`);
        console.log(`[${timestamp}] 🎬 Producer: ${producerId}`);
      }
    );

    mediaServer.on(
      "consumerClosed",
      (event: CustomEvent<SimpleServerEvents["consumerClosed"]>) => {
        const timestamp = new Date().toISOString();
        const { consumerId, participantId } = event.detail;
        console.log(`[${timestamp}] 📺 Consumer closed: ${consumerId}`);
        console.log(`[${timestamp}] 👤 For participant: ${participantId}`);
      }
    );

    // Media state events
    mediaServer.on(
      "audioMuted",
      (event: CustomEvent<SimpleServerEvents["audioMuted"]>) => {
        const timestamp = new Date().toISOString();
        const { participantId, conferenceId } = event.detail;
        console.log(`[${timestamp}] 🔇 Audio muted`);
        console.log(`[${timestamp}] 👤 Participant: ${participantId}`);
        console.log(`[${timestamp}] � Conference: ${conferenceId}`);
      }
    );

    mediaServer.on(
      "audioUnmuted",
      (event: CustomEvent<SimpleServerEvents["audioUnmuted"]>) => {
        const timestamp = new Date().toISOString();
        const { participantId, conferenceId } = event.detail;
        console.log(`[${timestamp}] 🔊 Audio unmuted`);
        console.log(`[${timestamp}] 👤 Participant: ${participantId}`);
        console.log(`[${timestamp}] � Conference: ${conferenceId}`);
      }
    );

    mediaServer.on(
      "videoMuted",
      (event: CustomEvent<SimpleServerEvents["videoMuted"]>) => {
        const timestamp = new Date().toISOString();
        const { participantId, conferenceId } = event.detail;
        console.log(`[${timestamp}] 📵 Video muted`);
        console.log(`[${timestamp}] 👤 Participant: ${participantId}`);
        console.log(`[${timestamp}] � Conference: ${conferenceId}`);
      }
    );

    mediaServer.on(
      "videoUnmuted",
      (event: CustomEvent<SimpleServerEvents["videoUnmuted"]>) => {
        const timestamp = new Date().toISOString();
        const { participantId, conferenceId } = event.detail;
        console.log(`[${timestamp}] 📹 Video unmuted`);
        console.log(`[${timestamp}] 👤 Participant: ${participantId}`);
        console.log(`[${timestamp}] � Conference: ${conferenceId}`);
      }
    );
  }

  async start(): Promise<void> {
    try {
      // Create HTTP/HTTPS server
      this.httpServer = this.createHttpServer();

      // Create Socket.IO server
      this.socketServer = this.createSocketServer(this.httpServer);

      // Create MediaSoup server with dependency injection
      this.mediaServer = this.createMediaServer(
        this.httpServer,
        this.socketServer
      );

      // Initialize MediaSoup server
      await this.mediaServer.start();

      // Start listening
      const port = this.config.useHttps
        ? this.config.httpsPort
        : this.config.port;
      const protocol = this.config.useHttps ? "https" : "http";

      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(port, this.config.host, () => {
          const timestamp = new Date().toISOString();
          console.log(
            `\n[${timestamp}] 🚀 ${protocol.toUpperCase()} Server started successfully!`
          );
          console.log(
            `[${timestamp}] 📡 Server: ${protocol}://${this.config.host}:${port}`
          );
          console.log(
            `[${timestamp}] 📱 Open ${protocol}://localhost:${port} in your browser`
          );
          console.log(
            `[${timestamp}] 🔧 Event logging: Comprehensive event tracking enabled`
          );
          console.log(
            `[${timestamp}] 📊 API endpoints: /api/conferences, /api/participants, /api/stats`
          );
          console.log(
            `[${timestamp}] 🛠️  Admin endpoints: /api/conferences/:id/close, /api/participants/:id/kick`
          );

          if (this.config.useHttps) {
            console.log(
              `[${timestamp}] ⚠️  You may need to accept the self-signed certificate warning`
            );
          } else {
            console.log(
              `[${timestamp}] 💡 For production with WebRTC, use HTTPS by setting USE_HTTPS=true`
            );
          }

          console.log(
            `[${timestamp}] 🎥 Ready for video conferences with comprehensive event logging!\n`
          );
          resolve();
        });

        this.httpServer!.on("error", (error: NodeJS.ErrnoException) => {
          if (error.code === "EADDRINUSE") {
            console.error(`❌ Port ${port} is already in use`);
          } else {
            console.error("❌ Server error:", error);
          }
          reject(error);
        });
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      console.log("\n🛑 Shutting down server...");

      // Stop MediaSoup server first
      if (this.mediaServer) {
        await this.mediaServer.stop();
      }

      // Close Socket.IO server
      if (this.socketServer) {
        this.socketServer.close();
      }

      // Close HTTP server
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => {
            console.log("✅ HTTP server closed");
            resolve();
          });
        });
      }

      console.log("✅ Server shutdown complete");
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      throw error;
    }
  }
}

// Initialize and start server
const server = new MediaSoupExpressServer();

// Graceful shutdown handling
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle unhandled errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
server.start().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
