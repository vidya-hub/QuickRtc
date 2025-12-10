import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuickRTCProvider } from "quickrtc-react-client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QuickRTCProvider>
      <App />
    </QuickRTCProvider>
  </StrictMode>
);
