# ADR-009: Git Strategy

Status: ACCEPTED
Date: 2026-09-15

## Context

Repository already exists (`main`, 2 commits, remote `origin` on GitHub). Need a branching model
suited to a small team doing incremental, TDD-driven feature work.

## Decision

`main` (protected, always releasable) + `develop` (integration branch) + short-lived
`feature/*`, `fix/*`, `test/*`, `refactor/*`, `docs/*`, `ci/*`, `chore/*`, `build/*`, `perf/*`,
`hotfix/*` branches, kebab-case, one coherent change per branch. Full detail, PR/review/merge/
release/hotfix process in [git-branching-strategy.md](../development/git-branching-strategy.md).

## Options considered

- **OPTION A — main + develop + short-lived branches (chosen).** Matches the brief exactly; gives
  a stable release branch (`main`) separate from in-progress integration (`develop`), suited to a
  milestone-based project.
- **OPTION B — Trunk-based (single `main`, very short-lived branches, feature flags).** Pros:
  simpler, less merge overhead. Cons: needs feature-flag infrastructure to keep `main` releasable
  with partial features, which is extra machinery not otherwise needed yet. Not chosen — the
  brief specifies `develop` explicitly.

## Consequences

- `main` should only receive merges from `develop` (or `hotfix/*` for emergencies).
- Branch-name prefix must match the nature of the change (constitution §31) — reviewers should
  reject mismatched prefixes (e.g., a dependency bump branded `feature/*`).

## References

- [git-branching-strategy.md](../development/git-branching-strategy.md)
- [commit-convention.md](../development/commit-convention.md)
