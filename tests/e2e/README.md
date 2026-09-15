# tests/e2e

Playwright end-to-end tests (~20% of the suite by design). See
[docs/testing/testing-strategy.md](../../docs/testing/testing-strategy.md) and
[.claude/skills/playwright](../../.claude/skills/playwright/SKILL.md).

## What's here (M1)

`smoke.spec.ts` — the only test: the app boots and is reachable, and the dark-mode toggle works.
No golden-path flow exists yet (no auth, no lessons), so there is nothing else to cover per the
"cross-layer golden paths only" rule in the testing skill.
