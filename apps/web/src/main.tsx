// First: configures Zod for the Content-Security-Policy before any schema parses (M16).
import "./security/zod-without-eval.js";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";
import "./styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
