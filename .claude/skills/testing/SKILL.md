---
name: testing
description: Testing strategy - Vitest/RTL for unit-component-application-domain, Playwright for E2E, 80/20 split, coverage baseline, and non-negotiable critical-flow coverage. Use when writing or reviewing any test, or deciding whether a change needs one.
---

# Testing

Full policy: [docs/testing/testing-strategy.md](../../../docs/testing/testing-strategy.md),
[ADR-008](../../../docs/adr/adr-008-testing-strategy.md).

## Split

~80% unit/component/application/domain (Vitest + RTL), ~20% E2E (Playwright). This is an effort
guideline, never a reason to skip a critical-flow test.

## Coverage baseline (CI gate)

Lines ≥80%, Statements ≥80%, Functions ≥80%, Branches ≥75%.

## Always test, regardless of coverage numbers

Authentication, authorization, scoring, lesson completion, points/progress, profile changes,
destructive operations (deletion/unsubscribe), teacher/student permission boundaries.

## How to write a good test here

- Assert on behavior/output/state changes, not on internal call counts or private methods — must
  survive a REFACTOR step that doesn't change behavior.
- Domain/application tests: no network, no DB, no filesystem — that's what makes 80% achievable
  without a slow suite. If a test needs I/O, it belongs in `tests/integration/`, not next to the
  domain code.
- Repository/adapter code: one fast unit test (faked driver/SDK) + one integration test
  (`tests/integration/`, real test DB/provider where feasible).

## Playwright E2E

Lives in `tests/e2e/`. Covers cross-layer golden paths (e.g., register → verify → complete a
lesson → see points update), not every edge case — edge cases belong in unit/component tests.
