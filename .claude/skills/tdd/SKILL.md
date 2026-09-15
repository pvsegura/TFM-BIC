---
name: tdd
description: The mandatory RED-GREEN-REFACTOR workflow for every feature in this project. Use before writing any implementation code.
---

# TDD

Full process: [docs/testing/tdd-workflow.md](../../../docs/testing/tdd-workflow.md).

## Cycle (every feature, every acceptance criterion)

1. State the requirement in one sentence.
2. Write concrete, testable acceptance criteria.
3. Write the test for one criterion.
4. Run it.
5. Confirm it fails for the right reason (RED) — not a setup/typo error.
6. Write the minimal implementation to pass.
7. Confirm GREEN.
8. Refactor (tests stay green) — consider this step every cycle even if nothing changes.
9. Run the full suite (catch regressions).
10. Lint.
11. Typecheck.
12. Build.
13. SonarQube gate.
14. Commit ([conventions.md](../../conventions.md) for message format).

## Do

- Write tests against observable behavior/output, not internal implementation details — a
  refactor shouldn't require rewriting a test whose behavior contract didn't change.

## Don't

- Don't write implementation before a failing test exists for it (pure non-testable scaffolding,
  like a type-only file, is the narrow exception).
- Don't write a test that just mirrors the implementation line-by-line.
- Don't skip the REFACTOR step as a formality — actually consider it.
