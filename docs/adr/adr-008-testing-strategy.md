# ADR-008: Testing Strategy

Status: ACCEPTED
Date: 2026-09-15

## Context

Product brief mandates TDD, an approximate 80/20 unit-to-E2E split, and non-negotiable coverage
of critical flows regardless of aggregate metrics.

## Decision

Vitest + React Testing Library for unit/component/application/domain tests; Playwright for E2E.
Target baseline (not a substitute for critical-flow coverage): Lines ≥ 80%, Statements ≥ 80%,
Functions ≥ 80%, Branches ≥ 75%. Critical flows (authentication, authorization, scoring, lesson
completion, points, profile changes, destructive operations, teacher/student permissions) require
tests regardless of whether the percentage target is already met. See
[testing-strategy.md](../testing/testing-strategy.md) and
[tdd-workflow.md](../testing/tdd-workflow.md) for the full policy and the RED/GREEN/REFACTOR
process.

## Options considered

Not re-derived — tooling (Vitest, RTL, Playwright) and the 80/20 split were specified directly by
the brief. The open question was *how* to prevent the percentage target from becoming an excuse
to skip critical-flow tests — resolved by making critical-flow coverage an explicit, separate
requirement rather than folding it into the aggregate number.

## Consequences

- Domain/application tests must not require a database or network (enforced by the hexagonal
  boundary in ADR-001) — this is what makes 80% unit coverage achievable without a slow suite.
- CI (ADR-010) gates on both the coverage baseline and, conceptually, on critical-flow test
  presence for PRs touching those areas (mechanism for enforcing the latter is left to CI design
  at implementation time — not invented here as a specific tool feature).

## References

- [testing-strategy.md](../testing/testing-strategy.md)
- [tdd-workflow.md](../testing/tdd-workflow.md)
