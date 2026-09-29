// First: configures Zod for the Content-Security-Policy before any schema parses (M16).
import "./security/zod-without-eval.js";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";
import {
  installGlobalErrorHandlers,
  reportClientError,
} from "./observability/client-error-reporter.js";
import "./styles/index.css";

// M18: errors outside React rendering (event handlers, promises) are reported too.
installGlobalErrorHandlers(window, reportClientError);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
