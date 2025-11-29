import React from "react";
import ReactDOM from "react-dom/client";
import { QuickRTCProvider } from "quickrtc-react-client/src/QuickRTCProvider";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QuickRTCProvider>
      <App />
    </QuickRTCProvider>
  </React.StrictMode>
);
