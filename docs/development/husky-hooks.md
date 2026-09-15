# Husky Hooks

Status: ACCEPTED — implemented in M1.

## Implemented hooks

- **pre-commit** (`.husky/pre-commit`): `pnpm exec lint-staged`, which runs ESLint (`--fix`) and
  Prettier (`--write`) only on staged files (see `.lintstagedrc.json`). Fast — no full typecheck
  or test run, per the constraint below.
- **pre-push** (`.husky/pre-push`): `pnpm test` (the full Vitest suite across every workspace
  project). Build verification is intentionally **not** part of pre-push — it's a CI-only concern,
  using the escape hatch this document already allowed for.

Setup: `husky` v9's `prepare` script (`package.json`) runs `husky` on `pnpm install`, which points
Git at `.husky/` as its hooks directory; hook files are plain shell commands (no
`#!/usr/bin/env sh` boilerplate — that was pre-v9 Husky) and are committed with the executable bit
set (`.gitattributes` also forces LF line endings for `.husky/*` so the scripts run correctly on
Linux CI regardless of the contributor's OS).

## Constraint

Hooks must stay fast enough that developers don't routinely bypass them. Pre-commit only touches
staged files; if `pnpm test` in pre-push becomes slow as the suite grows, move it to
affected-project-only (`pnpm --filter [changed] test`) rather than let it be skipped in practice.
