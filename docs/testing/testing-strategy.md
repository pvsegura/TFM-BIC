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

M4 followed this: `packages/data/src/profile/profile.repository.test.ts` runs against a PGlite
instance with Identity's migrations applied first and Student Profile's second (the foreign key
needs `users`), and asserts real database behaviour — constraint names on rejected rows, cascade
delete, concurrent first saves. A context whose tables reference another's needs a harness like
`packages/data/src/profile/db/test-support/create-test-db.ts`.

Security-relevant behaviour is asserted explicitly rather than assumed: unauthenticated access,
cross-user access, mass assignment, unknown avatar ids, oversized/malformed bodies, hostile text
and error-message leakage each have their own tests (`apps/api/src/routes/profile.route.test.ts`,
`packages/contracts/src/profile/`, `tests/e2e/profile.spec.ts`). They demonstrate those behaviours;
they are not proof of complete security.

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

## Content and languages (M5)

- **Content is tested as data**: `shipped-content.test.ts` loads the real `content/` tree and asserts
  Polish is registered, A1 is available and A2–C2 planned, ids unique, ordering explicit, required
  text present, and every published item readable through the real use cases. `pnpm content:validate`
  runs the same loader in CI.
- **Loader tests use throw-away temp directories** (`test-support/content-fixtures.ts`) so each rule
  — malformed JSON, schema violation, location mismatch, duplicate ids, order clashes, dishonest
  availability, oversized file — is proved with the exact bytes the loader sees.
- **Extensibility is tested at three layers with fictional languages** (`xx`, `qq`): the unmodified
  application use cases, the file-system repository (a language that exists only as files), and the
  HTTP routes. If adding a language ever needs code, one of these fails.
- **Architecture guard**: `no-language-branching.test.ts` fails on language-specific branching or
  language names in production source, and proves it is not vacuous.
- **Security tests** cover public access (no cookie needed, none set), unpublished/inactive exclusion,
  `400` for malformed codes/levels/ids (injection- and traversal-shaped, oversized, repeated params),
  generic `404`/`500` bodies, fail-closed serialization of markup/unknown block types, and rate limiting.
- **Frontend tests** cover the selectors (data-driven, keyboard order, non-colour selected/planned
  cues), loading/error/not-found/empty states, dark mode, and safe block rendering. Playwright covers
  the public flow on desktop, dark mode and a 375px viewport (`tests/e2e/content-languages.spec.ts`).
- **Not covered**: there is no automated accessibility scanner (axe or similar) in the repository, so
  accessibility rests on role/label/keyboard tests and manual review.
