# MediaSoup Event Flow Visualization

Interactive visualization of the complete MediaSoup WebRTC conference event flow. Shows step-by-step how clients interact with servers during video conferencing.

## Features

- **51 Event Steps**: Complete flow from connection to cleanup
- **Interactive Controls**: Play/Pause, Previous/Next, Speed control
- **Dark/Light Mode**: Toggle between themes
- **Data Visualization**: Shows request/response data for each event
- **Architecture Overview**: Visual representation of MediaSoup components
- **Keyboard Shortcuts**: Arrow keys and Space for navigation

## Events Covered

1. **Connection**: Socket.IO connection establishment
2. **Conference**: Join/leave, participant management
3. **Transport**: WebRTC transport creation and connection
4. **Producer**: Audio/video media production
5. **Consumer**: Consuming remote participant media
6. **Cleanup**: Resource cleanup and disconnection

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy the `dist` folder
```

### GitHub Pages
```bash
npm run build
# Push dist folder to gh-pages branch
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` | Next step |
| `←` | Previous step |
| `Space` | Play/Pause |

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS

## Based On

This visualization is based on the [QuickRTC](https://github.com/vidya-hub/simple_mediasoup) library's client-server implementation.
