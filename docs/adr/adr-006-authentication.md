# ADR-006: Authentication

Status: ACCEPTED
Date: 2026-09-15
Updated: 2026-09-17 (M3 — session mechanism and password hashing resolved)

## Context

Need registration, login, logout, email verification, password reset, password hashing,
session/token management, and role-based authorization, verified server-side, extensible beyond
STUDENT/TEACHER.

## Decision

**ACCEPTED**: Authentication/authorization lives in its own Identity & Authentication bounded
context (see [domain-model.md](../architecture/domain-model.md)), independent of Student/Teacher
Profile. Roles at M0: `STUDENT`, `TEACHER`. Architecture reserves `ADMIN`, `CONTENT_EDITOR`,
`SUPPORT`, `MODERATOR` as future roles — the role model must be an enum/table, not a boolean
flag, so adding a role doesn't require a schema rewrite. All authorization checks happen
server-side (`apps/api`); the frontend may hide UI based on role but must never be the sole
enforcement point.

## Options considered — session mechanism

- **OPTION A — Server-side sessions (signed cookie + server-side store).** Pros: easy revocation,
  simpler CSRF story with SameSite cookies. Cons: requires a session store (adds infra).
- **OPTION B — JWT access + refresh tokens.** Pros: stateless access tokens, natural fit for a
  separate `apps/web`/`apps/api` split. Cons: revocation is harder, requires careful refresh-token
  rotation/storage to avoid theft/replay.

## M3 decision (2026-09-17): session mechanism — RESOLVED as OPTION A

**Server-managed session, referenced by an opaque random token carried in an `HttpOnly`,
`Secure` (production), `SameSite=Strict`, `Path=/` cookie.** The session _record_ (id, userId,
token hash, createdAt, expiresAt, rotatedAt) lives in Postgres, owned by `SessionRepository`; the
cookie only ever holds the random token, never user data, a JWT, or anything the client can
decode/tamper with.

Rationale, against OPTION B:

- The task brief itself sets a hard constraint ("do NOT store sensitive authentication tokens in
  localStorage") and a strong preference for a server-managed mechanism over exposing long-lived
  credentials to JavaScript — a same-origin browser app with no separate mobile/third-party API
  client (M3 scope) doesn't need JWT's statelessness, so OPTION B's extra revocation/rotation
  complexity buys nothing here.
- Revocation (logout, password-reset-triggered session invalidation) is a single `DELETE`/`UPDATE`
  against `SessionRepository` — with JWTs, revoking a still-valid access token requires either a
  blocklist (which reintroduces server-side state anyway) or accepting a window where a revoked
  token still works.
- `apps/web` and `apps/api` are same-origin in this architecture (no CORS is configured yet
  because nothing needs one — see `.claude/current-state.md`), so the classic "JWT for
  cross-origin API" motivation doesn't apply.

**Threat model / trade-offs accepted:**

- CSRF: `SameSite=Strict` on the session cookie blocks the cookie from being sent on
  cross-site requests (including top-level navigations), which is the primary CSRF mitigation for
  M3's auth endpoints. As defense in depth, state-changing auth routes (`POST /auth/*`) also
  validate the `Origin` header against the configured `APP_BASE_URL` in the auth preHandler. A
  full double-submit CSRF token scheme is **not** implemented in M3 — documented as a known
  limitation (revisit if `SameSite=Strict` ever needs relaxing, e.g. for an email-link-initiated
  cross-site GET flow, which M3's verification/reset links are designed to avoid by requiring a
  same-site POST to actually act on the token).
- Session fixation: login always issues a **new** session token (never reuses a pre-auth session),
  i.e. session rotation on privilege change (login, and again on password reset).
- XSS: `HttpOnly` prevents the session token from being readable by injected/malicious JS even in
  an XSS scenario — this does not replace React's default output escaping as the primary XSS
  defense (see [security-baseline.md](../security/security-baseline.md)).
- Session tokens are generated with a CSPRNG (`node:crypto.randomBytes`), stored hashed
  (SHA-256) at rest — a leaked database row does not directly yield a usable session token,
  mirroring how passwords are never stored in recoverable form.
- Multiple concurrent sessions per user are allowed (e.g. two browsers) — no artificial
  single-session limit in M3; "revoke all sessions" is exposed as an internal capability used by
  password reset, not as end-user UI (out of M3 scope per the brief's "no advanced session
  management UI").

## M3 decision (2026-09-17): password hashing — RESOLVED

**Argon2id via the `argon2` npm package** (native bindings, prebuilt for common platforms;
verified current version `0.45.1`, `engines.node >=16.17.0`, compatible with this project's
Node 24 LTS baseline). Argon2id is the current OWASP-recommended password-hashing algorithm
(winner of the Password Hashing Competition, default hash type in this library).

Rejected: Node's native `crypto.argon2`/`crypto.argon2Sync` (added as a SEMVER-MINOR change in
Node 24.7.0) — real, but too new (weeks old relative to this decision) and insufficiently
documented at the time of writing to verify its exact parameter surface without guessing, which
the project's anti-hallucination rule forbids for a cryptographic primitive; the mature `argon2`
package has a stable, well-documented API instead. Revisit once the native API has matured and
its documentation is complete, to drop a native-binding dependency.

Cost parameters: library defaults (`timeCost`, `memoryCost`, `parallelism`) are used rather than
custom-tuned values — tuning to specific production hardware is a deployment-time concern
(out of M3 scope); the library's shipped defaults already target OWASP's current minimum
guidance. bcrypt was considered (also OWASP-acceptable) but Argon2id was preferred as the
first-choice recommendation.

## Consequences

- Session handling (cookie read/write, rotation, expiry checks) lives in `apps/api` (presentation)
  and `packages/data` (the `SessionRepository` adapter) — the domain layer only knows about a
  `Session` entity's fields, never about cookies or Fastify.
- Password hashing is reached only through the `PasswordHasher` port (owned by
  `packages/application`) — `packages/domain`/`packages/application` never import `argon2`
  directly, only `packages/data`'s adapter does.
- `AUTH_SESSION_SECRET` (env var, replaces the placeholder `AUTH_SECRET` name from `.env.example`)
  is used to **sign** (not encrypt) the session cookie via `@fastify/cookie`'s built-in HMAC
  signing — the cookie's payload is still just the opaque session token (validated by DB lookup,
  never decoded for data), but a tampered/forged cookie value is rejected at the cookie-parsing
  layer before a DB lookup is even attempted, as cheap defense in depth. Required at startup in
  `production`/`staging`; `packages/config` generates no default for it (a missing secret must
  fail startup, never silently disable signing).

## References

- [security-baseline.md](../security/security-baseline.md)
- [domain-model.md](../architecture/domain-model.md)
- [ADR-005 — Database](adr-005-database.md)
