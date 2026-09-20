import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxies auth requests to apps/api so the browser sees a single
    // origin (no CORS needed) and the session cookie's SameSite=Strict
    // stays workable — see docs/adr/adr-006-authentication.md and
    // docs/deployment/environments.md.
    proxy: {
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // The profile page (SPA route) and the profile API (`GET`/`PATCH
      // /profile`) share one path. A browser navigation — a typed URL, a
      // reload, a link — must get the SPA, while the app's own `fetch` (which
      // always sends `Accept: application/json`, see src/services/
      // profile-api.ts) must reach the API. Any reverse proxy in front of
      // production needs the same distinction.
      "/profile": {
        target: "http://localhost:3000",
        changeOrigin: true,
        bypass(req) {
          const isPageNavigation =
            req.headers["sec-fetch-dest"] === "document" ||
            (req.headers.accept ?? "").includes("text/html");
          return isPageNavigation ? "/index.html" : undefined;
        },
      },
    },
  },
});
