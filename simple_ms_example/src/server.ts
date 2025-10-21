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
        console.log(`🚀 MediaSoup server initialized`);
      }
    );

    mediaServer.on(
      "serverError",
      (event: CustomEvent<SimpleServerEvents["serverError"]>) => {
        console.error("❌ MediaSoup server error:", event.detail.error);
      }
    );

    // Connection events
    mediaServer.on(
      "clientConnected",
      (event: CustomEvent<SimpleServerEvents["clientConnected"]>) => {
        console.log(`🔌 Client connected: ${event.detail.socketId}`);
      }
    );

    mediaServer.on(
      "clientDisconnected",
      (event: CustomEvent<SimpleServerEvents["clientDisconnected"]>) => {
        console.log(`🔌 Client disconnected: ${event.detail.socketId}`);
      }
    );

    // Conference events
    mediaServer.on(
      "participantJoined",
      (event: CustomEvent<SimpleServerEvents["participantJoined"]>) => {
        console.log(
          `👋 ${event.detail.participant.name} joined conference ${event.detail.participant.conferenceId}`
        );
      }
    );

    mediaServer.on(
      "participantLeft",
      (event: CustomEvent<SimpleServerEvents["participantLeft"]>) => {
        console.log(
          `👋 ${event.detail.participant.name} left conference ${event.detail.participant.conferenceId}`
        );
      }
    );

    mediaServer.on(
      "conferenceCreated",
      (event: CustomEvent<SimpleServerEvents["conferenceCreated"]>) => {
        console.log(`🏠 Conference created: ${event.detail.conference.id}`);
      }
    );

    mediaServer.on(
      "conferenceDestroyed",
      (event: CustomEvent<SimpleServerEvents["conferenceDestroyed"]>) => {
        console.log(`🏠 Conference destroyed: ${event.detail.conferenceId}`);
      }
    );

    // Media events
    mediaServer.on(
      "producerCreated",
      (event: CustomEvent<SimpleServerEvents["producerCreated"]>) => {
        console.log(
          `📹 Producer created: ${event.detail.producerId} for participant ${event.detail.participantId}`
        );
      }
    );

    mediaServer.on(
      "producerClosed",
      (event: CustomEvent<SimpleServerEvents["producerClosed"]>) => {
        console.log(
          `📹 Producer closed: ${event.detail.producerId} for participant ${event.detail.participantId}`
        );
      }
    );

    mediaServer.on(
      "consumerCreated",
      (event: CustomEvent<SimpleServerEvents["consumerCreated"]>) => {
        console.log(
          `📺 Consumer created: ${event.detail.consumerId} for participant ${event.detail.participantId}`
        );
      }
    );

    mediaServer.on(
      "consumerClosed",
      (event: CustomEvent<SimpleServerEvents["consumerClosed"]>) => {
        console.log(
          `📺 Consumer closed: ${event.detail.consumerId} for participant ${event.detail.participantId}`
        );
      }
    );

    // Media state events
    mediaServer.on(
      "audioMuted",
      (event: CustomEvent<SimpleServerEvents["audioMuted"]>) => {
        console.log(
          `🔇 Audio muted for participant ${event.detail.participantId}`
        );
      }
    );

    mediaServer.on(
      "audioUnmuted",
      (event: CustomEvent<SimpleServerEvents["audioUnmuted"]>) => {
        console.log(
          `🔊 Audio unmuted for participant ${event.detail.participantId}`
        );
      }
    );

    mediaServer.on(
      "videoMuted",
      (event: CustomEvent<SimpleServerEvents["videoMuted"]>) => {
        console.log(
          `📵 Video muted for participant ${event.detail.participantId}`
        );
      }
    );

    mediaServer.on(
      "videoUnmuted",
      (event: CustomEvent<SimpleServerEvents["videoUnmuted"]>) => {
        console.log(
          `📹 Video unmuted for participant ${event.detail.participantId}`
        );
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
          console.log(
            `\n🚀 ${protocol.toUpperCase()} Server started successfully!`
          );
          console.log(`📡 Server: ${protocol}://${this.config.host}:${port}`);
          console.log(
            `📱 Open ${protocol}://localhost:${port} in your browser`
          );

          if (this.config.useHttps) {
            console.log(
              `⚠️  You may need to accept the self-signed certificate warning`
            );
          } else {
            console.log(
              `💡 For production with WebRTC, use HTTPS by setting USE_HTTPS=true`
            );
          }

          console.log(`🎥 Ready for video conferences!\n`);
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
