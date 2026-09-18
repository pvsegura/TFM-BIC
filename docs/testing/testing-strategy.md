# Testing Strategy

Status: ACCEPTED | Related: [ADR-008](../adr/adr-008-testing-strategy.md)

## Split

Approximately **80% unit/component/application/domain**, **20% E2E (Playwright)**. This ratio
guides effort allocation; it is never used to justify skipping tests for critical flows.

## Tooling by layer

| Layer                           | Tool                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Domain, Application (use cases) | Vitest, no I/O — pure logic, fast                                                                                             |
| Data/Infrastructure adapters    | Vitest with test doubles for external SDKs/DB (integration tests separately, in `tests/integration/`, may hit a real test DB) |
| React components/hooks          | Vitest + React Testing Library                                                                                                |
| Cross-app flows                 | Playwright, `tests/e2e/`                                                                                                      |

## Coverage baseline

Lines ≥ 80%, Statements ≥ 80%, Functions ≥ 80%, Branches ≥ 75%. This is a **baseline gate in CI**,
not a target to game — a change that hits the number while leaving a critical flow untested does
not pass review. Enforced in CI (M2) by Vitest's own `coverage.thresholds` in the "Unit / Component
Tests" Jenkins stage — a build fails the same way whether the failure is a broken test or an unmet
threshold. See [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md#coverage-baseline).

## Critical flows — tested regardless of coverage numbers

- Authentication (registration, login, logout, verification, password reset)
- Authorization (role checks, teacher/student data boundaries)
- Scoring (exercise attempt → correctness → points)
- Lesson completion
- Points/progress updates
- Profile changes (name, nickname, avatar)
- Destructive operations (account deletion, exercise-history deletion, unsubscribe)
- Teacher/student permission boundaries (a teacher must never read another teacher's students)

## What "testing behavior, not implementation" means here

Tests assert on inputs/outputs and observable state changes (e.g., "submitting a correct answer
increases points by N and marks the lesson step complete"), not on internal call counts or private
method invocation, so refactors under TDD's REFACTOR step don't require rewriting tests that
didn't change behavior.

## Integration vs unit boundary

**Revised in M3** from the M0/M1 plan below: `packages/data`'s Identity repositories
(`packages/data/src/identity/*.repository.test.ts`) are tested once, colocated with the adapter,
against **PGlite** (`@electric-sql/pglite`) — a real, WASM-compiled Postgres running in-process,
not a hand-rolled driver fake and not a separate `tests/integration/` tier. This was chosen over
the original two-tier plan because a faked driver can't catch real schema/constraint bugs (and
didn't need to prove itself twice — see [ADR-005](../adr/adr-005-database.md) for the concrete bugs
this caught during M3 development), and because it keeps Jenkins Docker-free (no Postgres service
to provision for CI). `tests/integration/` remains empty; local Docker Postgres
(`infrastructure/docker/docker-compose.yml`) is available for manual testing against a real
networked database, and `apps/api` can boot against a real Neon connection once one is
provisioned (deployment-time, M17) — neither is exercised by the automated test suite.

## Testing rules for M4+ that follow M3's precedent

Repository/adapter tests for a new bounded context should default to the same PGlite pattern
(colocated, no live network dependency) rather than reviving the `tests/integration/` +
hand-faked-driver split, unless a concrete reason emerges to deviate.

## Decided in M1

Coverage tool: Vitest's `v8` coverage provider (`@vitest/coverage-v8`), configured once at the
repo root (`vitest.config.ts`) with `test.projects` aggregating every package/app's own
`vitest.config.ts` — see [current-state.md](../../.claude/current-state.md). Reports:
`text`/`html`/`lcov` under `./coverage`, `lcov.info` being the format SonarQube consumes (see
[sonarqube skill](../../.claude/skills/sonarqube/SKILL.md)).

## Resolved in M3 (was "Not decided in M0/M1")

Integration tests do **not** run against a containerized Postgres in CI — see "Integration vs
unit boundary" above. `tests/integration/` stays empty; PGlite fills the role that tier would
have played.
