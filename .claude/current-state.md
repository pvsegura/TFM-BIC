# Current State

Last updated: 2026-09-15

## Milestone

**M2 — Git, CI/CD, Jenkins & SonarQube** — pipeline implemented and statically verified; **not yet
executed against a real Jenkins/SonarQube instance** (neither is provisioned — hosting is PENDING,
see [ADR-010](../docs/adr/adr-010-ci-cd.md)). M1 (monorepo/tooling foundation) is complete. M0
(architecture/governance) is still the base — see
[docs/product/project-constitution.md](../docs/product/project-constitution.md).

## What actually exists

- **CI/CD (M2)**: `Jenkinsfile` (repo root, declarative) + `sonar-project.properties` — stages
  Environment/Tool Validation → Install → Lint → Format Check → Typecheck → Unit/Component Tests
  (+coverage) → Coverage Report → Build → E2E (Playwright, pinned `mcr.microsoft.com/playwright:
v1.63.0-noble` image) → SonarQube Analysis → Quality Gate. No deploy stage (M2 scope excludes
  it). Full detail: [docs/deployment/ci-cd-pipeline.md](../docs/deployment/ci-cd-pipeline.md),
  [ADR-010](../docs/adr/adr-010-ci-cd.md). **Not executed for real** — no Jenkins/SonarQube
  instance exists yet to run it against; only statically reviewed against verified official docs
  and reproduced locally via `pnpm check`/`pnpm test:e2e` (see § below).
- Branch protection rules (GitHub) documented but not applied (no repo-admin access from this
  session) — see
  [git-branching-strategy.md](../docs/development/git-branching-strategy.md#branch-protection-github-repository-settings).
- A working, installable TypeScript monorepo: `pnpm install && pnpm check` passes (lint,
  format:check, typecheck, test, build all green; `pnpm test:e2e` and `pnpm test:coverage` also
  pass — coverage well above the 80/80/80/75 baseline).
- **Stack** (versions verified 2026-09-15, see the dependency ADRs for sourcing):
  Node.js 24 LTS, pnpm 12 workspaces, TypeScript `~6.0.3` (not 7 — see
  [ADR-016](../docs/adr/adr-016-typescript-node-baseline.md)), React 19 + Vite 8 + React Router 8
  - TanStack Query 5 + Zustand 5 + React Hook Form 7 + Zod 4 + Tailwind CSS 4 (`apps/web`),
    Fastify 5 (`apps/api`), Vitest 5 + React Testing Library 16 + Playwright 1.63, ESLint 10 (flat
    config) + typescript-eslint 8 + Prettier 3, Husky 9 + lint-staged.
- **Packages**, each with real (not placeholder) code, tests, and a `build`/`typecheck` script —
  see each package's own README for exactly what's implemented and why:
  - `packages/shared` — `Brand<T>` type utility, `assertNever`.
  - `packages/domain` — `LanguageId` value object (validated ISO-639-style code). Zero external
    deps (only `packages/shared`).
  - `packages/application` — `Clock` port + `GetHealthStatusUseCase`.
  - `packages/contracts` — `healthResponseSchema`/`HealthResponse` (Zod).
  - `packages/data` — `SystemClock` (the only concrete I/O adapter so far).
  - `packages/config` — `loadEnv()`, validates `NODE_ENV`/`PORT`/`DEFAULT_LANGUAGE` at startup.
  - `packages/ui` — `Button` (presentation-only, Tailwind classes).
  - `packages/testing` — `renderWithProviders()` (RTL + TanStack Query wrapper) for `apps/web`
    tests.
  - These eight packages/adapters form one coherent, working vertical slice (route → use case →
    domain → adapter, contract shared front/back) proving the architecture end to end without any
    real business feature — see `apps/api/src/routes/health.route.ts` as the entry point to read.
- **`apps/web`**: Vite dev server + production build; React Router v8 data router with placeholder
  routes for every route listed in the M1 brief (`/`, `/login`, `/register`, `/dashboard`,
  `/lessons`, `/vocabulary`, `/phonetics`, `/exercises`, `/progress`, `/achievements`, `/profile`,
  `/settings`) — no auth, no real pages yet; Tailwind v4 brand tokens + manual dark-mode toggle
  (Zustand store, persisted to localStorage); accessible skip-link, nav, focus-visible styles,
  `prefers-reduced-motion` handling.
- **`apps/api`**: Fastify server, `GET /health` and `GET /ready` only; environment validated at
  startup; structured logging with auth/cookie header redaction; centralized error handler;
  SIGINT/SIGTERM graceful shutdown. No business endpoints.
- **Testing**: 34 Vitest tests across 11 projects (one per package/app) aggregated via a root
  `vitest.config.ts` (`test.projects`); 2 Playwright smoke tests (app boots and is reachable, dark
  mode toggle works) in `tests/e2e/`. `tests/integration/` still empty — no real DB adapter to
  integration-test yet.
- Monorepo folder skeleton from M0 is now populated where M1 required it; `content/`,
  `infrastructure/` remain placeholder-only (out of M1 scope).
- `.claude/skills/` — unchanged from M0 (19 skills), still accurate for M1's stack.

## What does NOT exist yet (do not assume otherwise)

- No auth (registration/login/logout/session), no real dashboards/lessons/exercises/scoring.
- No database connection — `packages/data` has one adapter (`SystemClock`), no PostgreSQL/ORM.
- No Hyperframes or Gemini integration code.
- No real lesson/vocabulary content.
- No CI pipeline actually **executed** — the `Jenkinsfile`/`sonar-project.properties` exist (M2)
  but no Jenkins or SonarQube instance is provisioned to run them against yet (hosting PENDING,
  ADR-010).
- No dependency-audit CI step (e.g. `pnpm audit`) — not in the M2 stage list; see
  [security-baseline.md](../docs/security/security-baseline.md).
- `apps/web` does not call `apps/api` — no CORS policy configured because nothing needs one yet.
- No standalone-`node`-runnable build of `apps/api` — workspace packages resolve to TypeScript
  source (see [ADR-002](../docs/adr/adr-002-monorepo.md)); `apps/api` runs via `tsx` in dev, and
  `pnpm build` there is a compile-correctness check, not a deployment artifact. Revisit once a
  deployment milestone needs one.

## Pending decisions blocking further implementation

DB provider (ADR-005), session mechanism (ADR-006), email provider (ADR-014), hosting/deploy
target (ADR-015). Backend framework (ADR-004) and workspace tooling (ADR-002) are now ACCEPTED —
see [docs/adr/README.md](../docs/adr/README.md) for current status on everything else.

## Known risks / rough edges from M1

- pnpm 12 (the Rust rewrite) is very recent (weeks old as of this milestone) — if it turns out to
  have compatibility issues with a future dependency, pnpm 11 is the documented fallback (see
  ADR-002).
- Coverage on `apps/api/src/server.ts`'s logger-level ternary is intentionally not 100% (only the
  `NODE_ENV === "test"` branch is exercised by tests) — acceptable, well above the 75% branch
  baseline overall; noted here so it isn't mistaken for an oversight.
- No dedicated architectural dependency-boundary tool yet (e.g. `dependency-cruiser`) — the
  domain-must-not-import-infra rule is enforced by one ESLint `no-restricted-imports` rule plus
  code review, not by a graph-analysis tool. Fine at 8 packages; revisit if that stops scaling.

## Known risks / rough edges from M2

- The `Jenkinsfile`/`sonar-project.properties` are unverified against a real Jenkins/SonarQube run
  — only statically reviewed. The first real Jenkins execution may surface a syntax or plugin-
  config issue that static review couldn't catch (e.g. exact behavior of `tool 'SonarScanner'`
  inside a Docker agent, which is expected to work but wasn't exercised for real).
- `node:24-bookworm-slim`'s Docker image tag floats across Node 24.x patch releases rather than
  pinning an exact patch/digest — a documented trade-off, see
  [ci-cd-pipeline.md](../docs/deployment/ci-cd-pipeline.md#node-image-pinning-trade-off).
- The Playwright Docker image tag (`v1.63.0-noble`) must be bumped by hand whenever
  `@playwright/test` is upgraded, or the E2E stage will fail on a version mismatch — no automated
  check for this yet.

## Next milestone

`M3 — Authentication` (not started).
