# Security Baseline

Status: ACCEPTED | Related: [ADR-006](../adr/adr-006-authentication.md)

Principles to be applied from the first line of implementation code, not retrofitted.

## Authentication & authorization (M3 — implemented)

- Passwords hashed with Argon2id (the `argon2` npm package, library-default cost parameters) —
  see ADR-006 for why this was chosen over Node's native `crypto.argon2`.
- All authorization checks enforced server-side (`apps/api`, via the `authenticate`/`requireRole`
  preHandler hooks — `apps/api/src/hooks/`); UI-level role hiding
  (`apps/web/src/components/protected-route.tsx`) is UX only, never the security boundary.
- Session mechanism: server-managed session, referenced by an opaque CSPRNG token in an
  `HttpOnly`/`Secure` (prod)/`SameSite=Strict` cookie, signed via `@fastify/cookie`. Session
  tokens and reset/verification tokens are stored only as SHA-256 hashes, never in recoverable
  form, and are never logged — see ADR-006 for the full threat model.

## Student profile (M4 — implemented)

Personal data (name, nickname) is exposed only to its owner. See
[ADR-017](../adr/adr-017-student-profile.md).

- **Broken access control / IDOR**: `GET`/`PATCH /profile` derive the user from the session
  (`request.currentUser`); there is no `:id` route, and a body or query `userId` is either
  rejected (`400`, `.strict()`) or ignored. Tested per route (unauthenticated `401`, user A cannot
  read or change user B, no `PATCH /profile/:id`).
- **Mass assignment**: the request schema is `.strict()` (any key beyond the four editable fields
  is a `400`); the use case's input type carries no `role`/`email`/auth field; fields are mapped
  one by one, never spread. `role`, `userId`, `emailVerified` and `email` cannot be changed through
  the profile. Email changes are a separate, security-sensitive workflow (not implemented).
- **Avatar validation**: `avatarId` must equal a catalog id (checked in the contract _and_ again in
  the use case); a URL or unknown id is a `400`. No image upload exists.
- **Input limits**: body capped at 4 KB (`413`); name 1–100, nickname 2–30 characters; control
  characters rejected; a database `CHECK` mirrors the length rules.
- **XSS**: values are rendered as text by React — no `dangerouslySetInnerHTML`. HTML- and
  SQL-looking input is stored as inert data (not sanitized away); anything that later renders a name
  outside React (HTML email, PDF) must escape it.
- **Errors and logs**: profile values are not logged by the routes; unexpected failures return a
  generic `500` (tested with a driver error naming host, port and credentials). The central error
  handler logs the underlying error server-side.
- **Client cache**: user-scoped query data is cleared on logout and login so one person's profile
  is never shown to the next person on the same browser tab (covered by unit and E2E tests).

These tests demonstrate specific behaviours; they do not prove the profile is free of
vulnerabilities.

## Input/output validation

- All external input (HTTP bodies, query params, route params) validated with Zod schemas from
  `packages/contracts` before reaching application/domain code.
- Output encoding handled by React's default escaping — no `dangerouslySetInnerHTML` without a
  documented, reviewed reason (e.g., sanitized rich content).

## Common vulnerability classes

- **XSS**: rely on React's default escaping; sanitize any HTML explicitly allowed into the DOM
  (e.g., rich-text lesson content) with a vetted sanitizer at the point of storage or render.
- **SQL injection**: repository implementations use Drizzle's parameterized query builder
  (`packages/data/src/identity/*.repository.ts`), never string-concatenated SQL.
- **CSRF** (M3 — implemented): primary defense is `SameSite=Strict` on the session cookie;
  defense in depth is an `Origin`-header check on every state-changing `/auth/*` route
  (`apps/api/src/hooks/verify-origin.ts`) — see ADR-006 for the full rationale and accepted
  trade-offs (no double-submit CSRF token in M3).
- **Rate limiting** (M3 — implemented): `@fastify/rate-limit`, per-route, on every auth endpoint
  — register/resend/reset-request: 5/hour; login: 10/15min; reset-confirm: 10/hour; verify-email:
  20/15min (`apps/api/src/routes/auth.route.ts`). Enforcement is covered by an automated test
  (`auth.route.test.ts`), not just configured and assumed to work.
- **Secure headers**: standard security headers (CSP, HSTS, X-Content-Type-Options, etc.) set at
  the API/reverse-proxy layer (`infrastructure/nginx/`) — exact CSP policy deferred until frontend
  asset/CDN strategy (tied to ADR-015) is known.

## Secrets

- No secret ever committed to Git. `.env.example` documents variable _names_ only.
- Environment variables validated (presence + shape) at process startup, failing fast rather than
  behaving unpredictably with a missing secret.
- CI secrets (DB URL, provider API keys, SonarQube token) stored as Jenkins credentials, never in
  `Jenkinsfile`/`sonar-project.properties`/shell steps/logs — see
  [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md#secrets) (implemented M2: the SonarQube
  token today, via the SonarQube Scanner plugin's own credential binding).

## Dependency security

- Dependency updates follow [dependency-management.md](../development/dependency-management.md),
  including a security-advisory check before upgrading.
- Automated dependency audit as a CI step — **not yet added** to the M2 `Jenkinsfile` (its stage
  list is lint/format/typecheck/test/coverage/build/E2E/SonarQube/Quality Gate only); mechanism
  (`pnpm audit` as an explicit stage vs. relying on SonarQube's dependency-vulnerability checks)
  still open.

## Audit logging

- Privacy-relevant and destructive actions (account deletion, data export, role changes) are
  audit-logged — detail owned by the Privacy & Data Management context (see
  [domain-model.md](../architecture/domain-model.md)), a later milestone.
- M3: auth routes log structured events (login success/failure, logout, email verified,
  password-reset requested/completed) via Fastify's request logger
  (`apps/api/src/routes/auth.route.ts`) — user id where known, never email/password/tokens/
  cookies (the logger's `redact` config additionally strips the `Cookie` and `Authorization`
  headers and `Set-Cookie` response header from every log line, see `apps/api/src/server.ts`).

## Least privilege

- Database credentials used by the API scoped to only what the API needs; no shared "admin"
  credential reused across environments.
- Provider API keys (Gemini, email, Hyperframes-hosted-if-applicable) scoped/rotated per current
  provider capability — verified per provider, not assumed uniform.
