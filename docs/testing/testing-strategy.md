# Testing Strategy

Status: ACCEPTED | Related: [ADR-008](../adr/adr-008-testing-strategy.md)

## Split

Approximately **80% unit/component/application/domain**, **20% E2E (Playwright)**. This ratio
guides effort allocation; it is never used to justify skipping tests for critical flows.

## Tooling by layer

| Layer | Tool |
|---|---|
| Domain, Application (use cases) | Vitest, no I/O — pure logic, fast |
| Data/Infrastructure adapters | Vitest with test doubles for external SDKs/DB (integration tests separately, in `tests/integration/`, may hit a real test DB) |
| React components/hooks | Vitest + React Testing Library |
| Cross-app flows | Playwright, `tests/e2e/` |

## Coverage baseline

Lines ≥ 80%, Statements ≥ 80%, Functions ≥ 80%, Branches ≥ 75%. This is a **baseline gate in CI**,
not a target to game — a change that hits the number while leaving a critical flow untested does
not pass review.

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

`packages/data` repository/adapter implementations are tested twice: a fast unit test with a
faked driver/client, and a slower integration test in `tests/integration/` against a real
(disposable/test) Postgres instance — both required before an adapter is considered done, per
[dependency-upgrades](../../.claude/skills/dependency-upgrades/SKILL.md)-style rigor applied to
infra code generally.

## Not decided in M0

- Exact coverage-tool configuration (e.g., `vitest --coverage` provider) — implementation detail,
  deferred.
- Whether integration tests run against a containerized Postgres in CI or a managed test DB —
  depends on ADR-005/ADR-015 outcomes.
