---
name: playwright
description: Playwright E2E conventions for tests/e2e - what belongs in E2E vs unit/component tests, page-object patterns, environment target. Use when writing or reviewing an E2E test.
---

# Playwright E2E

Location: `tests/e2e/`. ~20% of the test suite by design (see [testing skill](../testing/SKILL.md)).

## What belongs here

Cross-layer golden-path flows that exercise real UI + real (or realistic staging-like) API +
DB — e.g., registration → email verification → login → complete a lesson → dashboard reflects
updated points. Not every input-validation edge case — those belong in unit/component tests.

## What does NOT belong here

- Business-rule edge cases better tested at the domain/application unit level (faster feedback,
  no flakiness from browser timing).
- Anything that could be tested without a browser — prefer the faster tool.

## Conventions

- Prefer role/label-based selectors (accessible queries) over brittle CSS selectors — this also
  keeps E2E tests honest about the app's accessibility (constitution §18 requires keyboard
  navigation, etc.).
- Target environment for CI E2E runs is TBD (depends on [ADR-015](../../../docs/adr/adr-015-deployment.md));
  don't assume a specific staging URL exists yet.
- Critical flows list (auth, scoring, lesson completion, teacher/student permissions — see
  [testing skill](../testing/SKILL.md)) should each have at least one E2E happy-path test, in
  addition to their unit/component coverage.
