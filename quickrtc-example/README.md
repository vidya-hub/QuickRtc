# QuickRTC Example

Simple video conferencing example with Express backend and React frontend.

## Setup

```bash
npm run setup
```

This will:
1. Generate SSL certificates in `certs/`
2. Install server dependencies
3. Install client dependencies

## Run

```bash
npm run dev
```

Opens:
- Server: https://localhost:3000
- Client: https://localhost:5173

Accept the self-signed certificate warning in your browser.

## Structure

```
quickrtc-example/
  certs/           # SSL certificates (generated)
  server/          # Express + QuickRTC server
  client/          # Vite + React client
```
