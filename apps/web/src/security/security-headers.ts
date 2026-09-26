/**
 * The HTTP security headers the SPA must be served with (M16, ADR-027) — the single source of
 * truth. `vite preview` applies them to the production build (vite.config.ts), the E2E project
 * `production-build` checks the built app runs under them, and whatever host serves `dist/` in
 * production (PENDING, ADR-015) must send the same values. They are not applied to `vite dev`,
 * whose hot-reload client needs inline scripts.
 *
 * Built from what the app actually loads: its own bundled JS/CSS, calls to its own origin (the
 * API sits behind the same origin), generated audio played from `blob:` URLs, and the data: URIs
 * the CSS may inline. Nothing third-party — no CDN, font service or analytics exists.
 */
const CSP_DIRECTIVES = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  // Header-only: browsers ignore frame-ancestors in a <meta> CSP.
  "frame-ancestors 'none'",
];

export const CONTENT_SECURITY_POLICY = CSP_DIRECTIVES.join("; ");

export const WEB_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // Reset and verification pages carry their token in the URL; never send it on as a Referer.
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};
