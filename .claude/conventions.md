# Conventions

## TDD (mandatory)

RED → GREEN → REFACTOR for every feature. Full 14-step process:
[docs/testing/tdd-workflow.md](../docs/testing/tdd-workflow.md). No implementation before a
failing test exists for it (except genuinely non-testable scaffolding like a pure type).

## Testing

Vitest + RTL for unit/component, Playwright for E2E, ~80/20 split. Coverage baseline: Lines ≥80%,
Statements ≥80%, Functions ≥80%, Branches ≥75% — but critical flows (auth, authorization,
scoring, lesson completion, points, profile changes, destructive ops, teacher/student permission
boundaries) are tested regardless of whether the percentage target is already met. Detail:
[docs/testing/testing-strategy.md](../docs/testing/testing-strategy.md).

Practical setup since M1: one root `vitest.config.ts` (`test.projects`) aggregates every
package/app's own `vitest.config.ts` (built via the shared `vitest.shared.ts` helper) — `pnpm
test` runs everything in one process; `pnpm --filter @tfm-bic/<pkg> test` runs just one project.
RTL's auto-cleanup does **not** register itself (`vitest.shared.ts` sets `globals: false`), so any
new `vitest.config.ts` with `environment: "jsdom"` needs a `setupFiles` entry that imports
`@testing-library/jest-dom/vitest` and calls `afterEach(cleanup)` explicitly — see
`apps/web/src/test-setup.ts` for the pattern.

## Git

Branches: `main` (protected) + `develop` + `feature/`, `fix/`, `test/`, `refactor/`, `docs/`,
`ci/`, `chore/`, `build/`, `perf/`, `hotfix/` — kebab-case, one coherent change per branch.
Detail: [docs/development/git-branching-strategy.md](../docs/development/git-branching-strategy.md).

## Commits

`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `ci:`, `chore:`, `build:`, `perf:`, `hotfix:` —
small, atomic, one intention each.
Detail: [docs/development/commit-convention.md](../docs/development/commit-convention.md).

## CI/CD (since M2)

`Jenkinsfile` + `sonar-project.properties` (repo root) — stages, reproducibility decisions, and
troubleshooting: [docs/deployment/ci-cd-pipeline.md](../docs/deployment/ci-cd-pipeline.md). Not yet
executed against a real Jenkins/SonarQube instance (neither is provisioned). Reproduce the same
gates locally before pushing: `pnpm check` (lint/format/typecheck/test/build) + `pnpm test:e2e`.
Whenever `@playwright/test` is upgraded, the Playwright Docker image tag in the `Jenkinsfile` must
be bumped to match in the same commit, or the E2E stage breaks.

## Code style

TypeScript strict mode everywhere, no `any`. No business logic in React components (belongs in
domain/application, invoked via hooks/services). No business logic in API route handlers (thin
controllers only). No per-language `if` branching — parameterize by `languageId`.

## Data, API and client-state conventions (since M4)

Rationale: [ADR-017](../docs/adr/adr-017-student-profile.md).

- **One bounded context = its own schema file, connection factory and migration folder** under
  `packages/data/src/<context>/` (`identity/`, `profile/`). A context whose tables reference
  another's keeps its own migration-tracking table (`migrations.table` in its drizzle config) and
  its tests apply migrations in dependency order.
- **User-owned data is reached only through the session.** Routes take the user from
  `request.currentUser`, never from a URL/query/body id; no `:id` routes for "my own" data. Request
  schemas are `.strict()`, use-case input types carry no auth/role fields, and fields are mapped
  one by one — never spread from a body.
- **A `GET` never writes.** Create-on-first-write with one atomic upsert.
- **Every cached TanStack Query except `["auth", …]` is user-scoped** and is dropped on
  logout/login (`apps/web/src/hooks/session-cache.ts`). Never cache another user's data under an
  `auth` key, and never put user data in Zustand.
- **Names/free text**: trim only — no case folding, diacritic stripping or alphabet allow-lists
  (the product is multilingual). Reject control characters; treat markup-looking text as inert data
  and rely on output escaping.

## Dependencies

Never install "latest" blindly — check stable version, Node/TS compatibility, peer deps, breaking
changes, security advisories, then test/lint/typecheck/build before committing. Full checklist:
[docs/development/dependency-management.md](../docs/development/dependency-management.md).

## Anti-hallucination (applies to Claude's own output, not just code)

No invented APIs/SDKs/versions/pricing/limits/legal requirements. Unverifiable → `UNKNOWN`.
Multiple valid options → `OPTION A/B/C` with trade-offs, not a silent pick. Detail:
[.claude/skills/anti-hallucination/SKILL.md](skills/anti-hallucination/SKILL.md).
