# Simple MediaSoup Example

This is a complete working example demonstrating how to use both the Simple MediaSoup server and client libraries together.

## Features

✨ **Complete Video Conferencing Solution**

- 🎥 Multi-participant video calls
- 🎤 Audio/video controls (mute/unmute)
- 👥 Real-time participant list
- 📱 Responsive web interface
- 🖥️ Screen sharing support
- 📊 Real-time statistics and monitoring
- 🛡️ Admin controls (kick participants, close conferences)

## Quick Start

### Option 1: One-Command Setup

```bash
npm run setup && npm run start:https
```

Then open `https://localhost:3443` in your browser and accept the certificate warning.

### Option 2: Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Required Packages

```bash
npm run build
```

### 3. Generate SSL Certificates (for HTTPS)

```bash
npm run generate-certs
```

### 4. Test HTTPS Setup (Optional)

```bash
npm run test-https
```

### 5. Start the Server

**HTTP (Development only - limited WebRTC features):**

```bash
npm start
```

**HTTPS (Recommended for full WebRTC features):**

```bash
npm run start:https
```

### 6. Open Your Browser

**HTTP:** Navigate to `http://localhost:3000`  
**HTTPS:** Navigate to `https://localhost:3443`

**Note:** For HTTPS with self-signed certificates, you'll need to accept the browser security warning.

## How It Works

### Server Side (`server.js`)

The Express server integrates Simple MediaSoup Server with a web interface:

```javascript
import { SimpleServer } from "simple_ms_server";

const mediaServer = new SimpleServer({
  port: 3000,
  cors: { origin: "*" },
});

await mediaServer.start();
```

### Client Side (`public/index.html`)

The web interface uses Simple MediaSoup Client:

```javascript
import { SimpleClient } from "simple_ms_client";

const client = new SimpleClient({
  serverUrl: window.location.origin,
  enableAudio: true,
  enableVideo: true,
});

await client.connect("my-room", "John Doe");
```

## API Endpoints

The server exposes REST API endpoints for monitoring and administration:

### Monitoring

- `GET /api/conferences` - List all active conferences
- `GET /api/participants` - List all participants
- `GET /api/stats` - Get server statistics
- `GET /api/conferences/:id/participants` - Get participants in a conference

### Administration

- `POST /api/conferences/:id/close` - Close a conference
- `POST /api/participants/:id/kick` - Kick a participant

## Project Structure

```
simple_ms_example/
├── server.js              # Express server with MediaSoup integration
├── package.json           # Dependencies and scripts
├── public/
│   └── index.html         # Web client interface
└── README.md             # This file
```

## Development

### Start in Development Mode

**HTTP:**

```bash
npm run dev
```

**HTTPS:**

```bash
npm run dev:https
```

This uses nodemon for automatic server restarts when files change.

### SSL Certificate Generation

The server supports both HTTP and HTTPS. For production and optimal WebRTC performance, HTTPS is strongly recommended.

**Generate Self-Signed Certificates (Development):**

```bash
npm run generate-certs
```

This creates:

- `certs/key.pem` - Private key
- `certs/cert.pem` - Self-signed certificate

### MediaSoup Worker Binary Setup

**Important:** This example uses npm instead of pnpm for MediaSoup compatibility. MediaSoup requires native binary compilation during installation, and npm handles this more reliably than pnpm.

If you encounter `mediasoup-worker ENOENT` errors:

1. **Switch to npm** (recommended):

   ```bash
   rm -rf node_modules pnpm-lock.yaml
   npm install
   ```

2. **Or rebuild MediaSoup manually**:
   ```bash
   cd node_modules/mediasoup
   npm run worker:build
   ```

**Manual Certificate Generation:**

```bash
# Create certificates directory
mkdir -p certs

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -sha256 -days 365 -nodes \
  -subj '/C=US/ST=CA/L=San Francisco/O=Simple MediaSoup/OU=Development/CN=localhost'

# Or with interactive prompts
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -sha256 -days 365 -nodes
```

**Production Certificates:**
For production, use certificates from a trusted CA like Let's Encrypt:

```bash
# Example with certbot (Let's Encrypt)
sudo certbot certonly --standalone -d yourdomain.com
# Then copy the certificates to the certs/ directory
```

### Environment Variables

```bash
# Server Configuration
PORT=3000                    # HTTP port
HTTPS_PORT=3443             # HTTPS port
USE_HTTPS=true              # Enable HTTPS
SSL_KEY=certs/key.pem       # Path to private key
SSL_CERT=certs/cert.pem     # Path to certificate

# MediaSoup Configuration
MEDIASOUP_MIN_PORT=10000    # Min RTC port
MEDIASOUP_MAX_PORT=10100    # Max RTC port
```

### Build Packages Individually

```bash
npm run build:types    # Build type definitions
npm run build:server   # Build server package
npm run build:client   # Build client package
```

## Usage Examples

### Basic Conference

1. Generate certificates: `npm run generate-certs`
2. Start HTTPS server: `npm run start:https`
3. Open `https://localhost:3443` in your browser
4. Accept the self-signed certificate warning
5. Enter a room name (e.g., "my-meeting")
6. Enter your name
7. Click "Connect"
8. Allow camera/microphone access
9. Share the room name with others to join

### Multiple Participants

1. Open multiple browser tabs/windows
2. Use the same room name for all participants
3. Use different names for each participant
4. Everyone will see each other's video streams

### Screen Sharing

1. Connect to a conference
2. Click "Share Screen"
3. Select the screen/window to share
4. Other participants will see your screen

### Admin Controls

Use the REST API to manage conferences:

```bash
# For HTTPS (recommended)
# Get all conferences
curl -k https://localhost:3443/api/conferences

# Get server stats
curl -k https://localhost:3443/api/stats

# Kick a participant
curl -k -X POST https://localhost:3443/api/participants/PARTICIPANT_ID/kick \
  -H "Content-Type: application/json" \
  -d '{"reason": "Administrative action"}'

# Close a conference
curl -k -X POST https://localhost:3443/api/conferences/CONFERENCE_ID/close \
  -H "Content-Type: application/json" \
  -d '{"reason": "Meeting ended"}'

# For HTTP (development only)
curl http://localhost:3000/api/conferences
```

## Troubleshooting

### Common Issues

**Connection Failed**

- Ensure the server is running on the correct port
- Check firewall settings
- Verify CORS configuration

**No Video/Audio**

- Grant browser permissions for camera/microphone
- **Use HTTPS** - Many browsers require HTTPS for WebRTC features
- Check browser compatibility (modern browsers required)
- For self-signed certificates, accept the browser security warning

**Media Not Working**

- Verify MediaSoup worker ports (10000-10100) are available
- Check network configuration for WebRTC
- Ensure proper NAT/firewall traversal setup

### Browser Requirements

- Chrome 74+
- Firefox 66+
- Safari 12.1+
- Edge 79+

### Network Requirements

- **HTTPS required** for WebRTC features (camera, microphone, screen sharing)
- UDP ports 10000-10100 (configurable via environment variables)
- Proper STUN/TURN server configuration for NAT traversal
- Self-signed certificates acceptable for development, trusted CA certificates required for production

## Production Deployment

### Environment Variables

```bash
# Server Configuration
PORT=3000                    # HTTP port (default: 3000)
HTTPS_PORT=3443             # HTTPS port (default: 3443)
USE_HTTPS=true              # Enable HTTPS (default: false)
SSL_KEY=certs/key.pem       # Path to SSL private key
SSL_CERT=certs/cert.pem     # Path to SSL certificate

# Application Configuration
NODE_ENV=production         # Environment
MEDIASOUP_MIN_PORT=10000    # Min RTC port
MEDIASOUP_MAX_PORT=10100    # Max RTC port
```

### HTTPS Setup

**Development (Self-signed certificates):**

```bash
# Generate certificates and start HTTPS server
npm run generate-certs
npm run start:https
```

**Production (Trusted CA certificates):**

```bash
# Set environment variables
export USE_HTTPS=true
export SSL_CERT=/path/to/your/certificate.pem
export SSL_KEY=/path/to/your/private-key.pem
export HTTPS_PORT=443

# Start server
npm start
```

**Docker with HTTPS:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build && npm run generate-certs
EXPOSE 3443 10000-10100/udp
ENV USE_HTTPS=true
CMD ["npm", "run", "start:https"]
```

### Scaling

For larger deployments:

- Use multiple MediaSoup workers
- Implement load balancing
- Use Redis for session management
- Deploy with Docker/Kubernetes

## License

MIT License - see the main project LICENSE file for details.
