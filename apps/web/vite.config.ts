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
    },
  },
});
