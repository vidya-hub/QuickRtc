import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Load SSL certs for dev server
const getHttpsConfig = () => {
  try {
    const certPath = path.join(__dirname, "..", "certs", "cert.pem");
    const keyPath = path.join(__dirname, "..", "certs", "key.pem");

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  } catch {
    console.warn("SSL certs not found, running without HTTPS");
  }
  return undefined;
};

export default defineConfig({
  plugins: [react()],
  server: {
    https: getHttpsConfig(),
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        loadtest: path.resolve(__dirname, 'loadtest.html'),
      },
    },
  },
});
