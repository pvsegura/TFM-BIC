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
      // Public language/content discovery (M5). Unlike /profile, the pages live under /learn, so
      // these API paths need no page-vs-API bypass.
      "/languages": { target: "http://localhost:3000", changeOrigin: true },
      "/content": { target: "http://localhost:3000", changeOrigin: true },
      // Lessons (M6) are an authenticated API. Their pages live under /learn/lessons, so — like the
      // catalog — this path needs no page-vs-API bypass (ADR-019).
      "/lessons": { target: "http://localhost:3000", changeOrigin: true },
      // Exercises (M7): the API paths are `/exercises/:id` and `/exercises/:id/answer` (plus
      // `/lessons/:id/exercises`, covered above). The pages live under /learn/exercises, so — like
      // lessons — this needs no page-vs-API bypass (ADR-020).
      "/exercises": { target: "http://localhost:3000", changeOrigin: true },
      // Gamification (M8): read-only `/gamification/summary`, `/achievements` and
      // `/point-transactions`. The pages live at /achievements and /dashboard, which are not API
      // paths, so — like lessons and exercises — this needs no page-vs-API bypass (ADR-021).
      "/gamification": { target: "http://localhost:3000", changeOrigin: true },
      // Vocabulary (M9): `/vocabulary`, `/vocabulary/:id/...` and `/user-vocabulary`. The pages
      // live under /learn/vocabulary, so — like lessons and exercises — this needs no
      // page-vs-API bypass (ADR-022).
      "/vocabulary": { target: "http://localhost:3000", changeOrigin: true },
      "/user-vocabulary": { target: "http://localhost:3000", changeOrigin: true },
      // Phonetics (M10): `/phonetics`, `/phonetics/topics` and `/phonetics/:id/...`. The pages
      // live under /learn/phonetics, so — like vocabulary — this needs no page-vs-API bypass.
      "/phonetics": { target: "http://localhost:3000", changeOrigin: true },
      // Video generation (M11): `/video-generations` and `/video-generations/:id`. The page lives
      // at /learn/videos, so — like phonetics — this needs no page-vs-API bypass.
      "/video-generations": { target: "http://localhost:3000", changeOrigin: true },
      // Audio generation (M12): `POST /audio-generations`. No page lives at this path (the
      // "Listen" action is on the vocabulary detail page), so it needs no page-vs-API bypass.
      "/audio-generations": { target: "http://localhost:3000", changeOrigin: true },
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
