---
name: sonarqube
description: SonarQube quality-gate conventions - what it checks, how it fits the pipeline, self-hosted vs SonarCloud PENDING. Use when configuring the quality gate or interpreting its results.
---

# SonarQube

Implemented as of M2: [`sonar-project.properties`](../../../sonar-project.properties) (repo root),
integrated in the `Jenkinsfile` via the SonarQube Scanner for Jenkins plugin. Design/rationale:
[ADR-010](../../../docs/adr/adr-010-ci-cd.md),
[ci-cd-pipeline.md](../../../docs/deployment/ci-cd-pipeline.md#sonarqube-integration).
Hosting (self-hosted "SonarQube Server"/Community Build vs. SonarQube Cloud) is PENDING — don't
assume one; nothing in the repo hardcodes a host.

## What the quality gate checks

Bugs, vulnerabilities, code smells, duplication, coverage, maintainability, reliability, security
— analysis runs after `Playwright E2E`, then `Quality Gate` is the final stage, in the pipeline
order (see [ci-cd skill](../ci-cd/SKILL.md)).

## Quality gate as a merge blocker

A failing SonarQube gate blocks merge, same as failing tests — not treated as advisory-only.

## When writing code with this in mind

- Avoid obvious duplication the gate would flag — extract shared logic, but don't
  over-abstract prematurely (constitution §49) just to preempt a duplication warning on three
  genuinely-similar lines.
- Keep functions/files at a complexity level a static analyzer (and a human reviewer) can
  reasonably assess — this is a proxy for maintainability, not a target to game.

## Not decided yet

Exact quality-gate thresholds beyond the coverage baseline already set in
[testing-strategy.md](../../../docs/testing/testing-strategy.md); SonarQube-specific rule
customization — both deferred until a real SonarQube instance exists to tune them against
(hosting itself is PENDING, see above).
