# ADR-010: CI/CD

Status: ACCEPTED (pipeline design) / PENDING (runner hosting, deployment target)
Date: 2026-09-15

## Context

Brief mandates Jenkins (no AWS) with a conceptual pipeline: checkout → install → lint →
typecheck → unit tests → integration tests → coverage → build → SonarQube → Playwright E2E →
artifact → deploy. M0 designs this; it is not implemented.

## Decision

Adopt the pipeline order above as the CI contract (see
[ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md)). Jenkins is the CI engine (given). Where
Jenkins runs (self-hosted VM, which provider) and where deploys land (ADR-015) are **PENDING** —
no AWS, no assumption of a specific non-AWS host without a decision owner.

## Options considered

Not applicable to the tool choice (Jenkins is specified). Open option space is _where Jenkins
runs_ and _what the SonarQube instance is_ (self-hosted vs SonarCloud) — both PENDING, to be
resolved in ADR-015/deployment planning with real cost/verification, not guessed here.

## Consequences

- Every PR is expected to pass lint, typecheck, unit+integration tests, coverage baseline, and
  build before merge to `develop`; `main` additionally implies E2E passed.
- Secrets (DB URL, provider API keys, SonarQube token) are Jenkins credentials, never committed —
  ties to [environments.md](../deployment/environments.md).

## References

- [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md)
- [jenkins skill](../../.claude/skills/jenkins/SKILL.md)
- [sonarqube skill](../../.claude/skills/sonarqube/SKILL.md)
