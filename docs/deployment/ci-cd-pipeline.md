# CI/CD Pipeline Design

Status: ACCEPTED (design) / PENDING (hosting) | Related: [ADR-010](../adr/adr-010-ci-cd.md)

## Pipeline stages (Jenkins)

```
checkout -> install -> lint -> typecheck -> unit tests -> integration tests -> coverage
  -> build -> SonarQube -> Playwright E2E -> artifact -> deploy
```

- **checkout**: pull the PR/branch.
- **install**: install workspace dependencies (exact package manager PENDING, see ADR-002).
- **lint / typecheck**: fail fast before running any tests.
- **unit tests**: `packages/domain`, `packages/application`, component tests — no external I/O.
- **integration tests**: `tests/integration/` — may hit a real (disposable/test) Postgres.
- **coverage**: enforce the baseline from [testing-strategy.md](../testing/testing-strategy.md).
- **build**: production build of `apps/web` and `apps/api`.
- **SonarQube**: quality gate (bugs, vulnerabilities, code smells, duplication, coverage) — see
  [ADR-010](../adr/adr-010-ci-cd.md) and the [sonarqube skill](../../.claude/skills/sonarqube/SKILL.md).
- **Playwright E2E**: `tests/e2e/`, run against a build (likely a preview/staging-like
  environment) — exact target environment PENDING.
- **artifact**: build output packaged for deploy.
- **deploy**: PENDING target (ADR-015).

## Branch triggers (proposed)

- `feature/*`, `fix/*`, etc. pushed → checkout through SonarQube (no deploy).
- PR into `develop` → full pipeline including E2E, gates the merge.
- Merge into `main` → full pipeline + deploy to production (once ADR-015 resolved).

## Secrets

All credentials (DB URL, provider API keys, SonarQube token) are Jenkins credentials, injected as
environment variables at pipeline runtime — never stored in the repository.

## Not decided in M0

- Where Jenkins itself runs (ADR-015-adjacent, no AWS).
- Exact SonarQube hosting (self-hosted vs SonarCloud) — PENDING, cost/verification needed.
- Whether integration tests spin up Postgres via container in the pipeline or use a shared test
  DB — depends on ADR-005/ADR-015.
