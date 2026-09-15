---
name: jenkins
description: Jenkins-specific conventions for this project's pipeline (Jenkinsfile structure, credentials, no AWS). Use when writing or editing infrastructure/jenkins/ config.
---

# Jenkins

`Jenkinsfile` implemented as of M2 (repo root) — see `infrastructure/jenkins/README.md` for
instance setup prerequisites (plugins, Docker daemon, required tool/server connection names).

## Structure

- Declarative pipeline (not scripted), for readability by the whole team.
- Stages match [ci-cd skill](../ci-cd/SKILL.md) order — see it for the exact, current list and why
  it differs slightly from M0's original conceptual draft.
- Each stage should have a clear pass/fail signal — don't swallow failures to "keep the pipeline
  green."
- Main stages run inside a pinned `node:24-bookworm-slim` Docker agent; the E2E stage overrides
  its agent to the pinned Playwright image (`reuseNode: true` to share the workspace, not a fresh
  checkout).

## Credentials

Use Jenkins' credential store for every secret — bound via the SonarQube Scanner plugin's own
server-connection config (`withSonarQubeEnv`) for the SonarQube token today; the `credentials()`
helper or `withCredentials` step for any future secret (DB URL, provider API keys). Never
hardcoded in the Jenkinsfile.

## Hosting

Where the Jenkins controller/agents run is PENDING (no AWS —
[ADR-015](../../../docs/adr/adr-015-deployment.md)). Don't assume a specific host.

## Before changing the Jenkinsfile

Verify current Jenkins/plugin syntax rather than assuming — per
[anti-hallucination](../anti-hallucination/SKILL.md) and
[dependency-upgrades](../dependency-upgrades/SKILL.md). In particular, if `@playwright/test` is
upgraded, the Playwright Docker image tag in the `Jenkinsfile` must be bumped to match in the same
commit (see [ci-cd-pipeline.md](../../../docs/deployment/ci-cd-pipeline.md#reproducibility)).
