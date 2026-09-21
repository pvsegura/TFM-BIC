# tests/e2e

Playwright end-to-end tests (~20% of the suite by design). See
[docs/testing/testing-strategy.md](../../docs/testing/testing-strategy.md) and
[.claude/skills/playwright](../../.claude/skills/playwright/SKILL.md).

## What's here (M3, M4)

- `smoke.spec.ts` (M1) — the app boots and is reachable, dark-mode toggle works.
- `registration.spec.ts`, `login.spec.ts`, `logout.spec.ts`, `password-reset.spec.ts`,
  `route-protection.spec.ts` (M3) — the Identity & Authentication golden paths: register → verify
  email → log in; duplicate registration (no account enumeration); login success/wrong-password/
  nonexistent-account; logout → protected route inaccessible; full password-reset flow including
  the old password being rejected afterward; unauthenticated access to a protected route
  redirects to `/login`.
- `profile.spec.ts` (M4) — the Student Profile flows: view (account email/role, empty profile);
  edit name/nickname/avatar and see it persist across a reload; clear a field; client-side
  validation blocks submission; markup-looking text is inert; a logged-out visit to `/profile`
  reaches the login flow (which also proves the dev proxy serves the SPA for a page navigation
  while `fetch('/profile')` reaches the API); unauthenticated and forged API access is rejected;
  a second user on the same browser never sees the first user's profile; dark mode; a 375px mobile
  viewport with no horizontal scroll.
- `lessons.spec.ts` (M6) — the lesson flows: discover Polish → A1 → the ordered lessons; open a lesson
  and read its blocks in order; opening marks it in progress but never completed; the explicit
  Complete lesson action (mouse and keyboard) is confirmed and survives a refresh; repeated and
  double-click completion is idempotent; logged-out visits reach login and the API refuses every
  lesson route; another student's progress is invisible and cannot be set (mass-assignment body
  refused); unknown, malformed, injection-like and non-lesson ids show a safe not-found; a planned
  level lists nothing; a 375px viewport with no horizontal scroll; dark mode.
- `helpers/register-and-verify.ts` — arranges a verified user via direct API calls (not the UI)
  so specs other than `registration.spec.ts` stay focused on their own flow.
- `helpers/ui.ts` (M4) — `signInViaUi` / `openProfileViaNav`: drive the real login form and nav.

Port `3000` (API) and `5173` (web) must be free: `reuseExistingServer` would otherwise silently
reuse whatever is already listening there.

## Running against a real backend, not a mock

`playwright.config.ts` starts **two** web servers: `apps/web`'s Vite dev server, and `apps/api`
with `NODE_ENV=test` — which makes `apps/api` boot against an in-process PGlite instance (a real,
WASM-compiled Postgres) instead of a live database connection, see
[ADR-005](../../docs/adr/adr-005-database.md) and
`apps/api/src/composition/auth-dependencies.ts`. No Docker, no network database, no mocked HTTP
layer — these are real requests through the real server.

Verification/reset links are retrieved via a diagnostic-only route,
`GET /auth/_test/emails?to=<email>`, that exists only when `NODE_ENV=test` (see
`apps/api/src/routes/test-email.route.ts`) — no real email is ever sent (ADR-014).

Auth rate limits are raised (not disabled) for E2E runs via `E2E_RELAXED_RATE_LIMITS`, set only in
this config's `webServer` env — a full run legitimately registers/logs in many times against one
shared server. The real, strict limits are still proven to work by their own fixed-config unit
test (`apps/api/src/routes/auth.route.test.ts`), unaffected by this flag.
