---
name: ci-cd
description: CI/CD pipeline design - Jenkins, stage order, no AWS, secrets handling. Use when writing or modifying pipeline config, or reasoning about what gates a merge.
---

# CI/CD

Implemented (M2): [`Jenkinsfile`](../../../Jenkinsfile) (repo root). Design/rationale:
[docs/deployment/ci-cd-pipeline.md](../../../docs/deployment/ci-cd-pipeline.md),
[ADR-010](../../../docs/adr/adr-010-ci-cd.md). No AWS anywhere in this pipeline. No deploy stage
yet — M2 stops after the Quality Gate.

## Stage order (Jenkins, as implemented)

```
(implicit checkout) -> env/tool validation -> install -> lint -> format check -> typecheck
  -> unit/component tests (+coverage) -> coverage report -> build -> Playwright E2E
  -> SonarQube analysis -> Quality Gate
```

Each stage should fail fast — don't reorder to run slow stages (E2E) before cheap ones (lint,
typecheck). No separate "integration tests" stage yet (`tests/integration/` is empty — nothing to
integration-test against); no separate plain "unit tests" run before "coverage" (one combined
`pnpm test:coverage` run covers both — see ci-cd-pipeline.md for why).

## Secrets

Jenkins credentials only — DB URL, provider API keys (Gemini, email, any Hyperframes auth),
SonarQube token. Never in the repo, never printed to logs.

## Merge gates

PR into `develop`: full pipeline through SonarQube + E2E must pass. Merge into `main`: same, plus
deploy (once [ADR-015](../../../docs/adr/adr-015-deployment.md) resolves the target).

## Not yet decided

Where Jenkins itself runs, SonarQube hosting (self-hosted vs. SonarQube Cloud), deploy target — see
ADR-015/ADR-010. Don't assume a specific host/provider not already named in the ADRs. Package
manager for `install` is decided (pnpm, `--frozen-lockfile`, see ADR-002) — not open.
