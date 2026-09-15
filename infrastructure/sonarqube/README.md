# infrastructure/sonarqube

Analysis configuration lives at the repo root:
[`sonar-project.properties`](../../sonar-project.properties). Full rationale:
[docs/deployment/ci-cd-pipeline.md](../../docs/deployment/ci-cd-pipeline.md#sonarqube-integration),
[ADR-010](../../docs/adr/adr-010-ci-cd.md). Convention detail:
[.claude/skills/sonarqube](../../.claude/skills/sonarqube/SKILL.md).

Self-hosted ("SonarQube Server"/Community Build) vs. SonarQube Cloud is still **PENDING** — the
properties file and `Jenkinsfile` don't hardcode either; whichever is chosen, the required Jenkins
side configuration is the same (a `SonarQubeServer` server connection + `SonarScanner` tool +
webhook back to Jenkins — see
[infrastructure/jenkins/README.md](../jenkins/README.md)).

No local developer setup required day-to-day — analysis runs in CI. Optional local usage (only
useful when iterating on SonarQube rule configuration itself) is documented in
[ci-cd-pipeline.md](../../docs/deployment/ci-cd-pipeline.md#local-ci-simulation).
