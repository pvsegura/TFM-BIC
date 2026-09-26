# ADR-027: Security hardening — layered rate limits, trusted proxies, HTTP headers and CSP, atomic tokens

Status: ACCEPTED (M16) / PENDING (production host must serve the SPA headers; secret scanning in CI)
Date: 2026-09-26

## Context

M16 audited the whole implementation ([M16-SECURITY-AUDIT.md](../security/M16-SECURITY-AUDIT.md)). Authorization,
injection, answer keys and points were already sound. The findings that needed architectural decisions rather
than local fixes were:

- every rate limit was keyed by `request.ip` with Fastify's `trustProxy` unset. Behind any proxy that is one
  shared bucket for everyone, and "trust all proxies" would let clients spoof `X-Forwarded-For`;
- limits were per address only, so a distributed attacker or a stolen session could spread password guesses and
  costly generation over many addresses;
- reset and verification tokens were used check-then-mark, which is not single use under concurrency;
- no HTTP security headers and no CSP existed anywhere, although the baseline assumed a reverse-proxy config that
  was never written.

Constraints: single API instance (ADR-012/015), no Redis, no paid infrastructure, hosting still PENDING (ADR-015).

## Decision

1. **Trusted proxies are an explicit allowlist.** `TRUST_PROXY` lists proxy IPs/CIDR ranges (validated by
   `packages/config`); empty means trust none. `true`, hop counts and host names are refused. Fastify 5.12 itself
   disables hop-count trust, because it lets direct clients spoof `X-Forwarded-*`.
2. **Two layers of rate limits.** The per-address limits stay as each route's `config.rateLimit`. On top of them
   come a **per-account** login limit (normalised email, 10/15 min, counted for unknown addresses too) and
   **per-user** limits on account deletion, export, and audio and video generation. The second layer uses
   `app.createRateLimit()`, because the plugin's `app.rateLimit()` preHandler skips itself once a route limit has
   run on the request. Both layers keep in-memory stores; a shared store is needed only if the API is scaled out.
   Password reset stays available to a throttled account (OWASP's lockout-DoS caveat).
3. **Single-use tokens are consumed atomically, first.** The repositories expose
   `consume(tokenHash, now)`: one `UPDATE … WHERE used_at IS NULL AND expires_at > now RETURNING`. The use cases
   check the password policy, consume, and only then change anything. A failure after consumption needs a new
   link; failing safe is intended.
4. **API responses carry baseline headers.** One `onSend` hook (`apps/api/src/security/http-security.ts`) adds
   `nosniff`, `X-Frame-Options: DENY`, a deny-all CSP, `no-referrer`, CORP `same-origin`, a `no-store` default
   that a route can override, a random `X-Request-Id`, and HSTS in staging/production only (no `preload`). The
   same module owns the 16 KiB default body limit, the 30 s request timeout, status-specific safe 4xx bodies and a
   generic 404.
5. **The SPA's CSP is code, and the production build is tested under it.** The policy lives in
   `apps/web/src/security/security-headers.ts`: `'self'` for scripts, styles, fonts and connections, `blob:` for
   generated audio, `data:` images, no inline script, no `eval`, no third party, `frame-ancestors 'none'`, and
   `no-referrer`, because reset links carry tokens. `vite preview` serves it. The Playwright project
   `production-build` builds the app and fails on any CSP violation or if another origin can frame it. The dev
   server is exempt: its hot-reload client needs inline scripts. Zod runs `jitless`, its documented CSP option,
   because its `new Function` probe raised a violation; adding `'unsafe-eval'` was rejected.
6. **CSRF keeps SameSite=Strict + Origin**, with a Fetch Metadata fallback: when `Origin` is absent, a
   `Sec-Fetch-Site` of `cross-site`/`same-site` is refused. No CSRF token is added. The API accepts only JSON,
   sends no CORS headers, and every state-changing route is proven to check Origin by the route-inventory test.
7. **Default deny is enforced by a test.** `route-inventory.security.test.ts` requires every registered route to
   be classified. Unlisted routes must answer 401 without a session, state-changing ones 403 cross-origin, and
   teacher ones 403 to students.

## Alternatives rejected

- **Redis for rate limits**: no second instance exists; it adds cost and an operational dependency.
- **Account lockout (hard lock after N failures)**: invites lockout DoS. Throttling with a time window, while
  reset stays available, gives the same protection against guessing.
- **Nonce-based CSP**: needs a server that rewrites `index.html` per request. The SPA has no inline script, so
  `'self'` gives the same guarantee for a static host.
- **CSRF double-submit token**: SameSite=Strict, the Origin check, Fetch Metadata and JSON-only parsing already
  cover the browser attack surface (OWASP CSRF cheat sheet); a token adds client and server state for no
  identified gap.
- **`'unsafe-eval'` for Zod**: `jitless` removes the need.

## Consequences

- A deployment must set `TRUST_PROXY` to its proxy's address(es), or every client shares one per-address bucket.
  The per-account and per-user limits still work either way. It must also serve the SPA with the headers of
  `security-headers.ts` (checklist: [environments.md](../deployment/environments.md)).
- Limits reset on restart (in memory). Acceptable for one instance.
- The E2E run builds the web app once more (the `production-build` project), adding roughly 30 s.
- Staging/production refuse to start with a short `AUTH_SESSION_SECRET` or a non-https/missing `APP_BASE_URL`.
- Still open: secret scanning in CI (Docker was unavailable to verify a gitleaks stage), off-request email
  delivery against timing enumeration (with ADR-014), idle session timeout (product decision), and database
  roles/TLS/backups (with ADR-015).
