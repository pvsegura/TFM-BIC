# TDD Workflow

Status: ACCEPTED | Related: [ADR-008](../adr/adr-008-testing-strategy.md)

TDD is mandatory for every feature, no exceptions carved out in this milestone.

## Cycle

**RED → GREEN → REFACTOR**, embedded in this 14-step process:

1. Requirement — restate what's being built in one sentence.
2. Acceptance criteria — concrete, testable conditions.
3. Test — write the test for one acceptance criterion.
4. Execute test.
5. Confirm RED (test fails for the right reason — not a typo/setup error).
6. Minimal implementation — just enough to pass.
7. Confirm GREEN.
8. Refactor — clean up without changing behavior; tests stay green throughout.
9. Full suite — run everything, not just the new test, to catch regressions.
10. Lint.
11. Typecheck.
12. Build.
13. SonarQube (quality gate — see [ADR-010](../adr/adr-010-ci-cd.md)).
14. Commit (see [commit-convention.md](../development/commit-convention.md)).

Repeat per acceptance criterion until the feature is complete.

## Rules

- Tests must check **behavior**, not mirror the implementation line-by-line — a test that would
  fail only if you renamed a private variable is not a good test.
- No implementation code is written before a failing test exists for it, except for genuinely
  non-testable scaffolding (e.g., a type definition with no runtime behavior).
- REFACTOR is not optional busywork — if step 8 finds nothing to improve, that's a valid outcome,
  but the step must be considered every cycle.

## Where this applies

All of `packages/domain`, `packages/application`, `apps/api` route/controller logic, `apps/web`
components/hooks with any non-trivial logic. Pure boilerplate (e.g., a Zod schema with no branching
logic) may reasonably skip a dedicated RED step for the schema itself, but consumers of that
schema still follow the full cycle.
