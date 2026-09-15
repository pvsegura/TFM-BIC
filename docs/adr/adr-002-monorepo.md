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
[folder-structure.md](../architecture/folder-structure.md)). Package-manager workspace tooling
(exact tool: npm workspaces vs pnpm vs turborepo) is **PENDING** — deferred to the milestone that
actually scaffolds `package.json`/tooling, per constitution §33 (Husky/scaffolding is next
milestone's concern) and the dependency-management policy (no tool chosen without checking
current stable versions and Node compatibility at scaffold time).

## Options considered

- **OPTION A — Monorepo (chosen).** Pros: atomic cross-package commits, shared types via
  `packages/contracts` without publishing, single CI pipeline. Cons: requires workspace tooling
  and careful package boundaries to avoid a circular-dependency mess.
- **OPTION B — Polyrepo (separate `web`, `api`, `content` repos).** Pros: independent
  versioning/deploy cadence. Cons: type drift between frontend/backend, harder atomic changes,
  more CI/release surface for a small team — rejected.

## Consequences

- Requires an explicit dependency-direction rule (enforced conceptually now, by lint later)
  between packages to prevent `packages/domain` from importing `packages/data`.
- Workspace tool selection is itself a future ADR-adjacent decision, tracked as PENDING here
  rather than invented now.

## References

- [folder-structure.md](../architecture/folder-structure.md)
- [dependency-management.md](../development/dependency-management.md)
