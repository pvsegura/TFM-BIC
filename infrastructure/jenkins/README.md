# infrastructure/jenkins

Pipeline definition lives at the repo root: [`Jenkinsfile`](../../Jenkinsfile). Full rationale for
every stage: [docs/deployment/ci-cd-pipeline.md](../../docs/deployment/ci-cd-pipeline.md),
[ADR-010](../../docs/adr/adr-010-ci-cd.md). Convention detail:
[.claude/skills/jenkins](../../.claude/skills/jenkins/SKILL.md).

## Prerequisites for a Jenkins instance running this pipeline

- Plugins: Pipeline (declarative), Docker Pipeline, SonarQube Scanner for Jenkins, JUnit, HTML
  Publisher, Credentials Binding, GitHub Branch Source (for Multibranch Pipeline auto-discovery of
  branches/PRs).
- A Docker daemon reachable from the Jenkins agent (the `Jenkinsfile`'s stages run inside pinned
  Docker images, not the agent's own global Node/tool installs).
- Global Tool Configuration: a SonarQube Scanner installation named `SonarScanner`.
- Manage Jenkins > System > SonarQube servers: a server connection named `SonarQubeServer`,
  authenticated with a Secret text credential (never a literal token in Jenkins config screenshots,
  scripts, or this repo).
- A job configured as a Multibranch Pipeline pointed at this GitHub repo, "Pipeline script from
  SCM" reading the root `Jenkinsfile`.

## Not decided yet

Where the Jenkins controller/agents themselves run — no AWS
([ADR-015](../../docs/adr/adr-015-deployment.md), PENDING). Don't assume a specific host/provider.
