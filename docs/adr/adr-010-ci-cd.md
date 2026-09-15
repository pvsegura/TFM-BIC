# ADR-010: CI/CD

Status: ACCEPTED (pipeline implemented, M2) / PENDING (runner hosting, SonarQube hosting,
deployment target)
Date: 2026-09-15 (M0 design), updated 2026-09-15 (M2 implementation)

## Context

Brief mandates Jenkins (no AWS). M0 designed a conceptual pipeline: checkout → install → lint →
typecheck → unit tests → integration tests → coverage → build → SonarQube → Playwright E2E →
artifact → deploy, but did not implement it. M2 implements a `Jenkinsfile` and
`sonar-project.properties` against that design, verifying current official Jenkins/SonarQube/pnpm/
Playwright documentation rather than assuming M0's draft syntax/plugin names were still current
(they were conceptual, not verified against real docs at M0 time).

## Decision

Implemented pipeline (declarative `Jenkinsfile`, repo root): Environment/Tool Validation → Install
Dependencies → Lint → Format Check → Typecheck → Unit/Component Tests (with coverage instrumentation
in the same run) → Coverage Report (publish only) → Build → E2E → SonarQube Analysis → Quality
Gate. Full stage-by-stage rationale: [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md). Two
deviations from M0's original conceptual list, both justified there:

- **No separate "integration tests" stage.** `tests/integration/` is still empty — no real
  database adapter exists yet to integration-test. Re-add once one does.
- **No separate plain "unit tests" run before "coverage."** `pnpm test:coverage` already runs
  every test; running the suite twice (once plain, once with coverage) would waste CI time for
  no additional signal.

Jenkins is the CI engine (given). SonarQube integration uses the "SonarQube Scanner for Jenkins"
plugin (`withSonarQubeEnv` + `waitForQualityGate abortPipeline: true`) rather than a hand-rolled
API call, per verified official SonarQube Jenkins-integration docs. Main pipeline stages run inside
a pinned `node:24-bookworm-slim` Docker agent (not whatever Node happens to be globally installed
on a Jenkins agent) — reproducibility over relying on per-instance Jenkins Global Tool
Configuration for Node. E2E runs inside Microsoft's official, version-pinned Playwright Docker
image on the same node/workspace (`reuseNode: true`).

Where Jenkins runs (self-hosted VM, which provider) and where deploys land (ADR-015) remain
**PENDING** — no AWS, no assumption of a specific non-AWS host without a decision owner. SonarQube
hosting (self-hosted "SonarQube Server"/Community Build vs. SonarQube Cloud) is likewise
**PENDING** — the Jenkinsfile/properties file don't hardcode either.

## Options considered

- **Docker-pinned Jenkins agents (chosen) vs. Jenkins Global Tool Configuration for Node/pnpm.**
  Docker pinning means the exact toolchain version travels with the repo (`Jenkinsfile`) instead of
  needing to be manually matched in every Jenkins instance's tool config. Cost: requires Docker
  Pipeline plugin + a Docker daemon reachable from the agent — a real prerequisite, documented in
  [infrastructure/jenkins/README.md](../../infrastructure/jenkins/README.md).
- **SonarQube Scanner for Jenkins plugin (chosen) vs. a raw `sonarsource/sonar-scanner-cli` Docker
  container invocation.** Both are officially documented. The plugin path was chosen because it
  keeps the SonarQube server URL and auth token entirely inside Jenkins' own configuration
  (injected via `withSonarQubeEnv`), with nothing scanner-related to pin/version in the
  `Jenkinsfile` itself — the CLI-container path would additionally require picking and maintaining
  a `sonar-scanner-cli` image tag.
- Not applicable to the Jenkins-vs-alternative tool choice (Jenkins is specified).

## Consequences

- Every PR is expected to pass lint, format, typecheck, unit/component tests + coverage baseline,
  build, E2E, SonarQube analysis, and the Quality Gate before merge to `develop`; `main` requires
  the same (see [git-branching-strategy.md](../development/git-branching-strategy.md) for the
  branch protection rules that enforce this in GitHub).
- Secrets (SonarQube auth token today; DB URL/provider API keys once they exist) are Jenkins
  credentials, never committed — ties to [environments.md](../deployment/environments.md).
- A Jenkins instance setting this up needs specific pre-configured identifiers (`SonarScanner` tool,
  `SonarQubeServer` server connection, a webhook back to Jenkins) — documented in
  [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md) so they aren't guessed per install.
- No deploy stage exists yet — the pipeline stops after the Quality Gate (ADR-015 still PENDING).

## References

- [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md)
- [jenkins skill](../../.claude/skills/jenkins/SKILL.md)
- [sonarqube skill](../../.claude/skills/sonarqube/SKILL.md)
- `Jenkinsfile`, `sonar-project.properties` (repo root)
