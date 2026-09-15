# Git Branching Strategy

Status: ACCEPTED | Related: [ADR-009](../adr/adr-009-git-strategy.md)

## Branches

- `main` — always releasable, protected. Only receives merges from `develop` or `hotfix/*`.
- `develop` — integration branch; feature branches merge here first.
- Work branches, kebab-case, prefixed by change type:
  `feature/...`, `fix/...`, `test/...`, `refactor/...`, `docs/...`, `ci/...`, `chore/...`,
  `build/...`, `perf/...`, `hotfix/...`.

Examples: `feature/user-registration`, `feature/student-dashboard`, `test/exercise-scoring`,
`fix/lesson-completion`, `refactor/content-repository`, `ci/jenkins-pipeline`,
`chore/update-dependencies`.

Rules: one coherent change per branch (no mixing unrelated features); prefix must match the
change's true nature.

## Pull requests

- Opened against `develop` (or `main` for `hotfix/*`).
- Must pass CI (lint, typecheck, tests, coverage baseline, build) before merge — see
  [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md).
- Requires review before merge (reviewer checks: TDD evidence, layering rules from
  [architecture-overview.md](../architecture/architecture-overview.md) respected, no business
  logic leaked into components/routes, no hardcoded per-language branching).

## Merge strategy

Squash or merge-commit — decided at implementation time based on team preference; either is
acceptable as long as `main`/`develop` history stays readable. Rebasing shared branches is
avoided.

## Release

`develop` → `main` merge represents a release candidate; tagging convention (e.g., semver tags)
PENDING until the first release is actually cut.

## Hotfix

`hotfix/*` branches off `main`, fixes the issue, merges back into both `main` and `develop` to
keep them in sync.
