# ADR-002: Monorepo

Status: ACCEPTED
Date: 2026-09-15

## Context

Frontend, backend, shared contracts/types, domain logic, and multi-language content all need to
evolve together, often in the same PR (e.g., a new exercise type touches contracts, domain,
application, API route, and a React component). Shared TypeScript types between `apps/web` and
`apps/api` are required to avoid drift.

## Decision

Single **TypeScript monorepo** with `apps/`, `packages/`, `content/`, `infrastructure/`, `tests/`,
`docs/`, `.claude/` as top-level folders (see
[folder-structure.md](../architecture/folder-structure.md)).

**Workspace tooling (finalized at M1 scaffold time, 2026-09-15): pnpm workspaces**, not npm
workspaces or Turborepo. Verified per
[dependency-management.md](../development/dependency-management.md):

- pnpm `12.x` is the current stable release line on npm's `latest` dist-tag (a Rust rewrite of the
  CLI; the project team's own release notes describe it as preserving pnpm 11 lockfile/workflow
  compatibility, with only narrow, correctness-focused breaking changes — see `package.json`'s
  `packageManager` field for the exact pinned version).
  Corepack is used to keep the pinned version reproducible per machine/CI.
- No Turborepo/Nx: a plain `pnpm -r` (topological, dependency-graph-ordered) recursive run is
  sufficient for this repo's size (11 workspace projects) — adding a task-orchestration layer on
  top would be complexity without a proven need, per the constitution's simplicity bias.
- Workspace packages resolve to their **TypeScript source** (`package.json` `main`/`types` point
  at `src/index.ts`, not a pre-built `dist/`), consumed on the fly by Vite/Vitest (esbuild) and
  `tsx` (apps/api's dev runtime, also esbuild-based). Each package still has a `build` script
  (`tsc --emitDeclarationOnly` for libraries, a real `vite build`/`tsc` for the two apps) as a
  compile-correctness check and — for `apps/web` — the actual deployable artifact. A pre-built
  `dist/` that plain `node` can run standalone (e.g. for `apps/api` outside `tsx`) is not needed by
  anything in M1 (which excludes production deployment) and is deferred to the milestone that adds
  it.

## Options considered

- **OPTION A — Monorepo (chosen).** Pros: atomic cross-package commits, shared types via
  `packages/contracts` without publishing, single CI pipeline. Cons: requires workspace tooling
  and careful package boundaries to avoid a circular-dependency mess.
- **OPTION B — Polyrepo (separate `web`, `api`, `content` repos).** Pros: independent
  versioning/deploy cadence. Cons: type drift between frontend/backend, harder atomic changes,
  more CI/release surface for a small team — rejected.

## Consequences

- Requires an explicit dependency-direction rule between packages to prevent `packages/domain`
  from importing `packages/data` — enforced today by an ESLint `no-restricted-imports` rule scoped
  to `packages/domain/src/**` (see `eslint.config.mjs`) and by code review; a dedicated
  dependency-boundary tool (e.g. `dependency-cruiser`) is deferred until the rule set outgrows what
  ESLint can express.
- `packages/*` are `"private": true` and never published — the source-resolution approach above
  (no dist for libraries) would need revisiting if that changes.

## References

- [folder-structure.md](../architecture/folder-structure.md)
- [dependency-management.md](../development/dependency-management.md)
