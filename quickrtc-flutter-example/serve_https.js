const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8443;
const BUILD_DIR = path.join(__dirname, 'build', 'web');
const CERTS_DIR = path.join(__dirname, '..', 'quickrtc-example', 'certs');

const options = {
  key: fs.readFileSync(path.join(CERTS_DIR, 'key.pem')),
  cert: fs.readFileSync(path.join(CERTS_DIR, 'cert.pem')),
};

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

const server = https.createServer(options, (req, res) => {
  let filePath = path.join(BUILD_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Handle paths without extension (SPA routing)
  if (!path.extname(filePath)) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Serve index.html for SPA routing
        fs.readFile(path.join(BUILD_DIR, 'index.html'), (err2, indexContent) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Flutter Web HTTPS Server running at:`);
  console.log(`   https://localhost:${PORT}`);
  console.log(`   https://127.0.0.1:${PORT}`);
  console.log(`\nUsing certificates from: ${CERTS_DIR}`);
  console.log(`Serving files from: ${BUILD_DIR}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
