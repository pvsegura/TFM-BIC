# Current State

Last updated: 2026-09-18

## Milestone

**M3 — Authentication** — implemented on `feature/authentication` (branched from
`ci/jenkins-sonarqube`, which carries all of M1+M2's work; `main` only has M0). M0–M2 remain the
base (architecture/governance, monorepo/tooling, Jenkins/SonarQube CI/CD — see
[docs/product/project-constitution.md](../docs/product/project-constitution.md)).

## What actually exists (M3, on top of M1/M2)

- **Identity & Authentication**, full vertical slice (domain → application → contracts → data →
  API → frontend → E2E), all layers real, not placeholder:
  - **Domain** (`packages/domain/src/identity/`): `Email`/`Password` value objects, `Role`
    (`STUDENT`/`TEACHER`, reserved: `ADMIN`/`CONTENT_EDITOR`/`SUPPORT`/`MODERATOR`), `User`,
    `Session`, `SecurityToken` (shared by email-verification and password-reset tokens),
    `requireRole` authorization primitive. Zero external dependencies.
  - **Application** (`packages/application/src/identity/`): 7 ports (`UserRepository`,
    `SessionRepository`, `PasswordHasher`, `TokenGenerator`, `EmailVerificationTokenRepository`,
    `PasswordResetTokenRepository`, `EmailService`) and 8 use cases (register, login, logout,
    resolve-session, verify-email, resend-verification, request-password-reset,
    confirm-password-reset).
  - **Contracts** (`packages/contracts/src/auth/`): Zod schemas for every request/response,
    shared by `apps/api` (validation) and `apps/web` (typed client + React Hook Form resolvers).
  - **Data** (`packages/data/src/identity/`): Drizzle/Postgres schema + migration
    (`users`/`sessions`/`email_verification_tokens`/`password_reset_tokens`, uniqueness enforced
    at the DB level), 4 repository adapters, `Argon2PasswordHasher`, `CryptoTokenGenerator`,
    `InMemoryEmailService`. Repository tests run against PGlite (real, WASM-compiled Postgres, no
    Docker) rather than a driver fake.
  - **API** (`apps/api/src/`): 8 auth routes under `/auth/*` (see
    [docs/api/README.md](../docs/api/README.md) for the table) — session cookie (signed,
    HttpOnly, SameSite=Strict), per-route rate limiting, `Origin`-header CSRF check on
    state-changing routes, `authenticate`/`requireRole` preHandler hooks, safe/generic error
    mapping. `NODE_ENV=test` boots against an in-process PGlite instance instead of a live
    Postgres connection (`apps/api/src/composition/auth-dependencies.ts`), enabling real E2E runs
    with no Docker/network database.
  - **Frontend** (`apps/web/src/`): register/login/verify-email/forgot-password/reset-password
    pages (React Hook Form + the same Zod contracts schemas), TanStack Query hooks
    (`useCurrentUser`, `useLogin`, `useLogout`, etc.), `ProtectedRoute` (frontend UX gate only —
    backend remains authoritative), a new `TextField` primitive in `packages/ui`. Vite's dev
    server proxies `/auth/*` to `apps/api` so the browser sees one origin (no CORS).
- **ADRs resolved** (were PENDING): [ADR-005](../docs/adr/adr-005-database.md) — Neon (docs-only;
  account provisioning is a deployment-time action, M17, out of M3 scope), Drizzle ORM;
  [ADR-006](../docs/adr/adr-006-authentication.md) — server-side sessions (not JWT), Argon2id;
  [ADR-014](../docs/adr/adr-014-email.md) — Resend documented as target provider,
  `InMemoryEmailService` the only adapter actually wired (no real account exists).
- **Testing**: 258 Vitest tests (up from 34 at end of M1) across 52 files/13 projects; 12
  Playwright E2E tests (up from 2), including every M3 auth golden path, run against the real
  server (not mocked) via a `NODE_ENV=test` PGlite-backed `apps/api`. Coverage: see the M3 final
  report for exact numbers — comfortably above the 80/80/80/75 baseline.
- `pnpm check` (lint/format/typecheck/test/build) and `pnpm test:e2e` both pass locally as of this
  writing.

## What does NOT exist yet (do not assume otherwise)

- No student/teacher profile, lessons, vocabulary, exercises, scoring, gamification, teacher
  dashboard — M3 is authentication only, per its own scope control.
- No real email provider account — `InMemoryEmailService` is the only adapter; a `ResendEmailService`
  is a documented follow-up (ADR-014), not implemented.
- No real remote Postgres connection exercised — Neon is the documented provider, but no account
  was provisioned in this session (out of M3 scope, deployment is M17); local dev uses
  `infrastructure/docker/docker-compose.yml`, tests use PGlite.
- No CSRF double-submit token — `SameSite=Strict` + `Origin` check only, documented trade-off
  (ADR-006).
- No CI pipeline actually **executed** against a real Jenkins/SonarQube instance — still neither
  provisioned (unchanged from M2, hosting PENDING, ADR-010). M3 was verified by running its own
  checks locally, the same way M2 verified itself.
- No dependency-audit CI step — unchanged from M2 (`pnpm audit` was run manually during M3
  dependency additions, not wired into the `Jenkinsfile`).
- No Hyperframes/Gemini integration, no real lesson/vocabulary content — unchanged from M1/M2.

## Pending decisions blocking further implementation

None block M3. Hosting/deploy target ([ADR-015](../docs/adr/adr-015-deployment.md)) remains
PENDING — relevant to a future deployment milestone (M17), not to M4+ feature work.

## Known risks / rough edges from M3

- **Real Neon connectivity is unverified.** The Drizzle schema/migrations/repositories are tested
  against PGlite (real Postgres semantics, WASM-compiled) and, optionally, local Docker Postgres
  — never against the actual documented production provider. A first real deployment may surface
  a Neon-specific difference (connection pooling behavior, TLS requirements) that local testing
  couldn't catch.
- **No real transactional email has ever been sent.** `InMemoryEmailService` proves the
  integration points (token generation, URL construction, port/adapter boundary) but not actual
  deliverability, template rendering in a real inbox, or provider-specific rate limits.
- **`E2E_RELAXED_RATE_LIMITS`** (set only by `tests/e2e/playwright.config.ts`) raises — not
  disables — auth rate-limit ceilings for E2E runs; the real limits are proven by a separate
  fixed-config unit test. Documented in `apps/api/src/routes/auth.route.ts` and
  `tests/e2e/README.md`, called out here so it isn't mistaken for a production weakening.
- **Jenkins lint stage may need a longer timeout.** Type-aware ESLint across this now-larger
  monorepo took several minutes locally in this session's sandbox (machine-dependent — not
  necessarily representative of the actual Jenkins agent) — worth watching on the first real CI
  run.
- No double-submit CSRF token (see ADR-006) — accepted trade-off, not an oversight.
- Session/token secrets fall back to an ephemeral per-process value in development/test when
  `AUTH_SESSION_SECRET` is unset (required in staging/production) — by design, but means dev
  sessions don't survive an `apps/api` restart.

## Known risks / rough edges from M1/M2 (still open)

- pnpm 12 compatibility, no dependency-boundary graph tool, `node:24-bookworm-slim`/Playwright
  image tag pinning — see the M1/M2 sections of git history for `current-state.md` if needed;
  unchanged by M3.

## Next milestone

`M4 — Student Profile` (not started).
