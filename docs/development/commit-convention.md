# Commit Convention

Status: ACCEPTED | Related: [ADR-009](../adr/adr-009-git-strategy.md)

Conventional-commits-style prefixes:

```
feat:     new feature
fix:      bug fix
test:     adding/adjusting tests
refactor: code change that doesn't alter behavior
docs:     documentation only
ci:       CI/CD pipeline changes
chore:    maintenance (deps, tooling) with no production code change
build:    build system/tooling changes
perf:     performance improvement
hotfix:   urgent production fix
```

## Rules

- Small, atomic commits — one intention per commit.
- Descriptive subject line (imperative mood, e.g., `feat: add lesson completion tracking`).
- A commit should correspond to a coherent step in the TDD cycle (e.g., a RED+GREEN pair may be
  one commit, or split — team preference — but never an unrelated bundle of changes).
- Scope note (optional): `feat(exercises): add matching exercise type` where a scope adds clarity.
