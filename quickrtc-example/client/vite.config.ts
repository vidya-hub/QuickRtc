import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Only load SSL certs for dev server (not during build)
const getHttpsConfig = () => {
  // Skip SSL for production build
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  
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
    // Ignore errors during build
  }
  return undefined;
};

export default defineConfig({
  plugins: [react()],
  server: {
    https: getHttpsConfig(),
    port: 5173,
  },
});
