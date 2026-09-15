# Husky Hooks (design — not implemented in M0)

Status: PROPOSED — implementation deferred to the milestone that scaffolds `package.json`/tooling
(constitution §33: depends on next milestone's scaffolding).

## Planned hooks

- **pre-commit**: lint, formatting check, typecheck/tests scoped to affected files where
  reasonably fast.
- **pre-push**: full test suite, build (where reasonable — if this becomes too slow, move build
  verification to CI-only and keep pre-push to tests).

## Constraint

Hooks must stay fast enough that developers don't routinely bypass them. If a hook becomes slow
(e.g., full-suite pre-commit), scope it down (affected-files only) rather than accept it being
skipped in practice.

## Why not implemented now

Husky hooks require a `package.json` and installed tooling (lint/test runners) to hook into —
none of that is scaffolded in M0 per the no-implementation constraint. This document exists so the
next milestone implements hooks matching this design rather than inventing one ad hoc.
