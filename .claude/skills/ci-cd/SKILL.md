---
name: ci-cd
description: CI/CD pipeline design - Jenkins, stage order, no AWS, secrets handling. Use when writing or modifying pipeline config, or reasoning about what gates a merge.
---

# CI/CD

Design: [docs/deployment/ci-cd-pipeline.md](../../../docs/deployment/ci-cd-pipeline.md),
[ADR-010](../../../docs/adr/adr-010-ci-cd.md). No AWS anywhere in this pipeline.

## Stage order (Jenkins)

```
checkout -> install -> lint -> typecheck -> unit tests -> integration tests -> coverage
  -> build -> SonarQube -> Playwright E2E -> artifact -> deploy
```

Each stage should fail fast — don't reorder to run slow stages (E2E, integration tests) before
cheap ones (lint, typecheck).

## Secrets

Jenkins credentials only — DB URL, provider API keys (Gemini, email, any Hyperframes auth),
SonarQube token. Never in the repo, never printed to logs.

## Merge gates

PR into `develop`: full pipeline through SonarQube + E2E must pass. Merge into `main`: same, plus
deploy (once [ADR-015](../../../docs/adr/adr-015-deployment.md) resolves the target).

## Not yet decided

Where Jenkins itself runs, exact package manager for `install`, deploy target — see ADR-015. Don't
assume a specific host/provider not already named in the ADRs.
