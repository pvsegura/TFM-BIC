---
name: sonarqube
description: SonarQube quality-gate conventions - what it checks, how it fits the pipeline, self-hosted vs SonarCloud PENDING. Use when configuring the quality gate or interpreting its results.
---

# SonarQube

[ADR-010](../../../docs/adr/adr-010-ci-cd.md), [ci-cd-pipeline.md](../../../docs/deployment/ci-cd-pipeline.md).
Hosting (self-hosted vs SonarCloud) is PENDING — don't assume one.

## What the quality gate checks

Bugs, vulnerabilities, code smells, duplication, coverage, maintainability, reliability, security
— runs after `build`, before `Playwright E2E`, in the pipeline order (see
[ci-cd skill](../ci-cd/SKILL.md)).

## Quality gate as a merge blocker

A failing SonarQube gate blocks merge, same as failing tests — not treated as advisory-only.

## When writing code with this in mind

- Avoid obvious duplication the gate would flag — extract shared logic, but don't
  over-abstract prematurely (constitution §49) just to preempt a duplication warning on three
  genuinely-similar lines.
- Keep functions/files at a complexity level a static analyzer (and a human reviewer) can
  reasonably assess — this is a proxy for maintainability, not a target to game.

## Not decided in M0

Exact quality-gate thresholds beyond the coverage baseline already set in
[testing-strategy.md](../../../docs/testing/testing-strategy.md); SonarQube-specific rule
customization — deferred to implementation time.
