---
name: jenkins
description: Jenkins-specific conventions for this project's pipeline (Jenkinsfile structure, credentials, no AWS). Use when writing or editing infrastructure/jenkins/ config.
---

# Jenkins

No Jenkinsfile exists yet as of M0 (see `infrastructure/jenkins/README.md`). When it's written:

## Structure

- Declarative pipeline preferred over scripted, for readability by the whole team.
- Stages match [ci-cd skill](../ci-cd/SKILL.md) order exactly: checkout, install, lint, typecheck,
  unit tests, integration tests, coverage, build, SonarQube, Playwright E2E, artifact, deploy.
- Each stage should have a clear pass/fail signal — don't swallow failures to "keep the pipeline
  green."

## Credentials

Use Jenkins' credential store for every secret (DB URL, API keys, SonarQube token) — bound to
pipeline steps via the credentials plugin, never hardcoded in the Jenkinsfile.

## Hosting

Where the Jenkins controller/agents run is PENDING (no AWS —
[ADR-015](../../../docs/adr/adr-015-deployment.md)). Don't assume a specific host.

## Before writing the Jenkinsfile

Verify the current stable Jenkins version and plugin compatibility (pipeline, credentials, any
Node/Docker plugin needed) rather than assuming — per
[anti-hallucination](../anti-hallucination/SKILL.md) and
[dependency-upgrades](../dependency-upgrades/SKILL.md).
