# Current State

Last updated: 2026-09-20

## Milestone

**M4 — Student Profile** — implemented on `feature/student-profile`, branched from
`feature/authentication` (M3), which sits on `ci/jenkins-sonarqube` (all of M1+M2; `main` only has
M0). `feature/student-profile` was pushed to GitHub on 2026-09-20 (nothing merged); because it
contains M3, that also published M3's commits — the `feature/authentication` branch _ref_ itself is
still local-only. M0–M3 remain the base
(architecture/governance, monorepo/tooling, Jenkins/SonarQube CI/CD, authentication — see
[docs/product/project-constitution.md](../docs/product/project-constitution.md)).

## What actually exists (M4)

An authenticated student can view and edit first name, last name, nickname and pick an avatar.
Full rationale and trade-offs: [ADR-017](../docs/adr/adr-017-student-profile.md).

- **Domain**: `packages/domain/src/profile/` (`StudentProfile`, `createProfileName` 1–100,
  `createNickname` 2–30, `createAvatarId`, three domain errors) and `media/avatar-catalog.ts` (6
  static avatars, `avatar-01`…`avatar-06`).
- **Application**: `ProfileRepository` port; `GetCurrentStudentProfileUseCase` (read, no side
  effects) and `UpdateCurrentStudentProfileUseCase` (validates every field, then one upsert).
- **Contracts**: strict `updateProfileRequestSchema`, allowlisting `profileResponseSchema`,
  `avatarIdSchema` + re-exported `AVATAR_CATALOG` (how the web app gets the catalog),
  `profileValidationErrorResponseSchema` (per-field messages).
- **Data**: `student_profiles` (`user_id` PK + cascading FK to `users`; nullable name/nickname/
  avatar; `CHECK`s mirroring the domain rules). Own schema/client/migration folder under
  `packages/data/src/profile/`, own tracking table, `db:generate:profile` / `db:migrate:profile`
  (run Identity's `db:migrate` first). `DrizzleProfileRepository` = one atomic
  `INSERT … ON CONFLICT DO UPDATE`.
- **API**: `GET /profile`, `PATCH /profile` — session user only, no `:id`, `.strict()` body (any
  extra key is a `400`), 4 KB body cap, `Origin` check, generic `500`. See
  [docs/api/README.md](../docs/api/README.md). Under `NODE_ENV=test` auth and profile share one
  PGlite instance (`apps/api/src/composition/test-dependencies.ts`).
- **Frontend**: `/profile` page (replaces the placeholder; behind `ProtectedRoute`), `ProfileForm`
  (React Hook Form + the shared schema), `AvatarPicker` (native radios, check-mark selected state)
  and `Avatar` in `packages/ui`, `useCurrentProfile`/`useUpdateProfile` (TanStack Query), nav link.
  Blank input ⇒ `null` ⇒ field cleared; an empty string is never stored. Vite proxies `/profile`
  fetches to the API but serves the SPA for browser navigations (page and API share the path).
- **Fixes to M3 found along the way**: logout/login now clear every cached query except `["auth"]`
  (M3 leaked the previous user's cached data to the next login on the same tab); the header now
  wraps on narrow screens (it overflowed a 375px viewport by ~200px).

## What actually exists (M3, on top of M1/M2)

Full Identity & Authentication slice (register, verify email, login, logout, password reset;
server-side sessions, Argon2id; `authenticate`/`requireRole` hooks; per-route rate limits; `Origin`
CSRF check; `InMemoryEmailService` only — no real email provider). Repository tests run on PGlite
(real WASM Postgres, no Docker). ADRs 005/006/014 resolved. Detail: ADR-006,
[docs/security/security-baseline.md](../docs/security/security-baseline.md).

## Verification (M4, run locally on 2026-09-20)

- `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `build`: pass. `format:check`: passes for
  everything committed (a separate, uncommitted `README.md` edit unrelated to M4 is not formatted).
- **637 Vitest tests / 75 files** pass (258 at end of M3, +379 in M4). Coverage: 94.02% statements /
  86.54% branches / 95.03% functions / 93.85% lines (thresholds 80/75/80/80).
- **25 Playwright E2E tests** pass against the real server (12 from M3, +13 in
  `tests/e2e/profile.spec.ts`). Ports 3000 and 5173 must be free (`reuseExistingServer`).
- **Jenkins pipeline and SonarQube analysis / Quality Gate: not confirmed.** A local Jenkins
  (Multibranch job `TFM-BIC` on GitHub, containers in WSL Ubuntu) and SonarQube were started and
  the branch pushed, but Jenkins needs a login to scan/trigger a build (it re-scans GitHub every 4
  hours, or use "Scan Repository Now") and no result was read back. Its stages mirror the local
  checks above. `sonar.coverage.exclusions` was aligned with Vitest's exclusions in M4.

## What does NOT exist yet (do not assume otherwise)

- Lessons, vocabulary, phonetics, exercises, scoring/progress, gamification, teacher dashboard,
  subscriptions, newsletter, account deletion/data export, email/privacy preferences, AI services.
- Email change (a separate, security-sensitive workflow), avatar upload/custom avatars, real avatar
  artwork (emoji glyphs stand in).
- A real email provider (`InMemoryEmailService` only, ADR-014); a real Neon connection was never
  exercised (Docker Postgres in dev, PGlite in tests).
- Automated accessibility checks (no axe-style tool in the repo) — a11y is covered by RTL
  role/label/keyboard tests and manual review only.
- CSRF double-submit token (`SameSite=Strict` + `Origin` check only, ADR-006); a dependency-audit
  CI step.

## Pending decisions blocking further implementation

None block M5. Hosting/deploy target ([ADR-015](../docs/adr/adr-015-deployment.md)) remains
PENDING — relevant to a deployment milestone (M17), not to feature work.

## Known risks / rough edges

- **`/profile` is both the page and the API path.** Only the Vite dev proxy separates them
  (`Sec-Fetch-Dest`/`Accept`); a production reverse proxy must do the same (ADR-017, ADR-015).
- **Profile routes have no rate limit** (authenticated, own row only). No unsaved-changes
  navigation guard. An avatar can be replaced but not cleared.
- **Names are stored as typed, including markup-looking text** — safe only while every consumer
  escapes on output; a future HTML email/PDF must escape them.
- **Two `pg` pools** per API process (identity, profile) over one `DATABASE_URL`. Real Neon
  connectivity is still unverified.
- **One-off flake seen**: an M1 health-use-case test hit Vitest's default 5s timeout on a cold
  worker once while WSL/Docker was starting; it passed on the next 3 full runs.
- **`E2E_RELAXED_RATE_LIMITS`** raises (not removes) auth rate limits for E2E only (M3).
- Jenkins lint stage may need a long timeout on this larger monorepo (M3 note).
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is
  unset (required in staging/production).

## Next milestone

`M5 — Content & Languages` (not started).
