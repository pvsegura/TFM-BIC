# CI/CD Pipeline

Status: ACCEPTED (implemented, M2) — hosting still PENDING | Related: [ADR-010](../adr/adr-010-ci-cd.md)

The `Jenkinsfile` at the repo root is the authoritative pipeline definition; this document explains
the decisions behind it. M2 stops after the Quality Gate — there is no deploy stage yet (see
[ADR-015](../adr/adr-015-deployment.md), PENDING).

## Pipeline stages (implemented)

```
(implicit) Checkout -> Environment/Tool Validation -> Install Dependencies -> Content Validation
  -> Lint
  -> Format Check -> Typecheck -> Unit/Component Tests -> Coverage Report -> Build -> E2E
  -> SonarQube Analysis -> Quality Gate
```

- **Checkout**: not a stage in the `Jenkinsfile` — Jenkins performs it automatically
  ("Declarative: Checkout SCM") before any stage, for a job configured with "Pipeline script from
  SCM" (a Multibranch Pipeline, in this repo's case).
- **Environment / Tool Validation**: prints `node --version`/`pnpm --version` and runs
  `corepack enable` so every later stage resolves the exact pinned toolchain
  (`package.json#packageManager`, `.nvmrc`) rather than whatever the agent happens to have.
- **Install Dependencies**: `pnpm install --frozen-lockfile` — fails instead of silently rewriting
  `pnpm-lock.yaml` if the lockfile and manifests disagree (see [§ Dependency installation](#dependency-installation)).
- **Content Validation** (M5; covers M7 exercise files too — the same loader validates every `exercises/*.json` and the exercise-to-lesson relationships): `pnpm content:validate` — loads every file under `content/` with the
  same loader the API runs at startup and prints every schema, location and catalog-consistency
  problem at once. It sits before lint/tests so malformed content fails fast with a readable list.
- **Lint / Format Check / Typecheck**: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` — cheap,
  fail fast, before any test/build cost is paid.
- **Unit / Component Tests**: `pnpm test:coverage` — see [§ Why one combined test+coverage run](#why-one-combined-testcoverage-run).
- **Coverage Report**: publishes the report already produced by the previous stage (JUnit XML to
  Jenkins' native test-result UI, HTML coverage report via the HTML Publisher plugin,
  `coverage/lcov.info` archived and later fed to SonarQube) — it does not re-run tests.
- **Build**: `pnpm build` (production build of `apps/web` and a compile-check build of `apps/api` —
  see [ADR-002](../adr/adr-002-monorepo.md) on why `apps/api` has no standalone `dist/` yet).
- **E2E**: Playwright, `tests/e2e/`, run inside `mcr.microsoft.com/playwright:v1.63.0-noble` (see
  [§ Playwright in CI](#playwright-in-ci)).
- **SonarQube Analysis**: `sonar-scanner`, config in `sonar-project.properties` — see
  [§ SonarQube integration](#sonarqube-integration).
- **Quality Gate**: `waitForQualityGate abortPipeline: true` — a failing gate aborts the build, same
  as a failing test.

### What M0's original stage list dropped, and why

[ADR-010](../adr/adr-010-ci-cd.md)'s original draft (M0) listed an `integration tests` stage between
unit tests and coverage. It is not in the implemented pipeline: `tests/integration/` is still empty
(no real database adapter exists to integration-test against yet — see
[testing-strategy.md](../testing/testing-strategy.md)). Adding an empty stage would be theater, not
a gate. Re-add it once `packages/data` has a real adapter under integration test.

### Why one combined test+coverage run

`pnpm test` and `pnpm test:coverage` both run the exact same Vitest suite — the second just adds
coverage instrumentation and threshold enforcement. Running the full suite twice per build wastes
CI time for zero additional signal, so the pipeline runs `pnpm test:coverage` once; a plain test
failure and a coverage-threshold failure are still distinguishable from the console output alone
(Vitest reports them differently), so per-stage diagnosability isn't lost.

## Reproducibility

- **Node**: pinned via the `node:24-bookworm-slim` Docker image (main stages) and the Playwright
  image's bundled Node (E2E stage) — not the agent's own Node, whatever that happens to be.
- **pnpm**: `corepack enable` + `package.json#packageManager` (`pnpm@12.4.2`) — Corepack reads the
  pinned version and fetches it on first use; the same mechanism developers use locally (see
  README), so CI and local installs can't silently diverge. (pnpm's own docs recommend a standalone
  installer script over Corepack in CI for a small per-invocation speed win; this repo keeps
  Corepack in CI anyway so the install mechanism is identical to local dev — one less thing that can
  behave differently between a developer's machine and Jenkins. Node 24 is also the last Node major
  to bundle Corepack, per [ADR-016](../adr/adr-016-typescript-node-baseline.md).)
- **TypeScript**: `~6.0.3`, pinned in every `package.json` (ADR-016) — nothing CI-specific needed.
- **Playwright**: the Docker image tag (`v1.63.0-noble`) is pinned to the exact
  `@playwright/test` version resolved in `pnpm-lock.yaml` (currently `1.63.0`). Playwright refuses
  to run if the browser binaries (from the image) and the npm package disagree — **when
  `@playwright/test` is upgraded, the image tag in the `Jenkinsfile` must be bumped in the same
  commit.** This is the one place version drift can silently break CI; call it out in the PR that
  upgrades Playwright.
- **Docker image pinning**: `node:24-bookworm-slim` is pinned to the major version, not an exact
  patch or digest — a deliberate, documented trade-off (§ below), not an oversight.
- **Corepack under a non-root Docker agent**: the Docker Pipeline plugin runs agent containers as
  the Jenkins controller's own non-root UID (for workspace file-ownership consistency), not root.
  `corepack enable`'s default shim location (`/usr/local/bin`) is root-owned in the official
  Node/Playwright images, so a plain `corepack enable` fails with `EACCES` under Jenkins even
  though it works locally (where Docker isn't forcing a UID). Fixed by pointing corepack at a
  writable, workspace-relative directory instead: `corepack enable --install-directory
"${WORKSPACE}/.corepack-bin"`, with that same directory prepended to `PATH` in the pipeline's
  `environment` block. Found by running the pipeline for real — exactly the kind of thing static
  review can't catch (see [current-state.md](../../.claude/current-state.md)).

### Node image pinning trade-off

`node:24-bookworm-slim` floats across Node 24.x patch releases rather than pinning an exact patch
or SHA digest. Pinning further (e.g. `node:24.x.y-bookworm-slim@sha256:...`) would be stricter but
needs active maintenance (bumping the digest on every security patch) that isn't justified yet at
this project's size. If a Node patch release ever breaks the pipeline, tighten this pin and record
why in this file.

## pnpm in Jenkins

`pnpm install --frozen-lockfile` is explicit in the `Jenkinsfile` rather than relying on pnpm's
own CI auto-detection (pnpm switches to frozen-lockfile mode automatically when it detects a CI
environment) — being explicit means the behavior doesn't depend on whether the `CI` env var happens
to be set exactly the way pnpm expects on a given Jenkins agent.

## Caching

**Not implemented in M2** — deliberately. The pnpm store and Playwright browser binaries are both
cacheable in principle, but every caching approach available (mounting a Jenkins-agent-local
directory into the ephemeral Docker containers, a dedicated cache plugin) is Jenkins-instance-
specific, and Jenkins hosting itself is still PENDING ([ADR-010](../adr/adr-010-ci-cd.md)). Adding
caching now would mean guessing at infrastructure that doesn't exist yet. Once Jenkins hosting is
decided, revisit: mount a persistent volume at pnpm's store directory (`pnpm store path`) for the
main agent, and — separately — either keep using the prebuilt Playwright Docker image (which
already bundles matching browsers, so there's nothing to cache) or cache
`~/.cache/ms-playwright` if a plain Node image is used instead.

## Test artifacts

Per build, Jenkins archives/publishes (never secrets):

- `coverage/lcov.info` (archived) + an HTML coverage report (via HTML Publisher).
- `test-results/junit.xml` (Vitest) and `test-results/e2e-junit.xml` (Playwright) — both feed
  Jenkins' native JUnit test-result trend view.
- `playwright-report/` (HTML, via HTML Publisher) and `test-results/**` (traces/screenshots on
  retry, archived as raw files) for E2E failures.

Jenkins' default archive/keep-build settings apply — no extra retention policy configured in M2;
revisit if storage becomes a real problem.

## Playwright in CI

Runs inside `mcr.microsoft.com/playwright:v1.63.0-noble` — Microsoft's official Playwright image,
which already bundles matching browser binaries and their OS-level dependencies (avoids the
separate `playwright install --with-deps` step and its own dependency-drift risk). The E2E stage
declares its own `agent { docker { ... reuseNode true } }`, which runs that image on the **same**
underlying Jenkins node and workspace as the rest of the pipeline (rather than a fresh node), so it
sees the already-installed `node_modules` and build output without a second `pnpm install`. Known
risk: `node_modules` was populated by the `node:24-bookworm-slim` (Debian) container earlier in the
run; the Playwright image is Ubuntu-based. Both are glibc Linux — **M3 update**: `argon2`
(`packages/data`, password hashing — ADR-006) does resolve a native binding at install time, via a
prebuilt binary for common glibc-Linux platforms (not a from-source compile in the normal case),
so this is still not expected to be an issue in practice, but it is no longer accurate to say
nothing in the dependency tree touches native addons — worth re-verifying on the first real
Jenkins run rather than assuming.

The Playwright config's `webServer` step now starts **two** servers inside the same container the
tests run in: `pnpm --filter @tfm-bic/web dev` (`apps/web`) and `pnpm --filter @tfm-bic/api start`
with `NODE_ENV=test` (`apps/api`, booting against an in-process PGlite instance — no
Docker/network database needed even in CI, see [ADR-005](../adr/adr-005-database.md) and
`tests/e2e/playwright.config.ts`). No separate "deploy to a preview environment" step exists yet
(ADR-010's original draft mentioned this as PENDING; not needed since E2E only needs both apps
reachable inside the CI container, not a public URL).

## SonarQube integration

- `sonar-project.properties` at the repo root configures sources/tests/exclusions and points at
  `coverage/lcov.info` (`sonar.javascript.lcov.reportPaths` — the current property name; the older
  `sonar.typescript.lcov.reportPaths` is deprecated).
- The Jenkinsfile uses the "SonarQube Scanner for Jenkins" plugin: `tool 'SonarScanner'` (a Jenkins
  Global Tool Configuration entry — the scanner bundles its own JRE via JRE auto-provisioning, so no
  separate Java installation is required on the agent) wrapped in
  `withSonarQubeEnv('SonarQubeServer')`, which injects the server URL and auth token from Jenkins'
  own SonarQube server configuration — **neither appears in this repo**.
- `waitForQualityGate abortPipeline: true` blocks the pipeline on a failing gate. This requires a
  webhook configured on the SonarQube server side pointing to
  `<jenkins-url>/sonarqube-webhook/` — without it, `waitForQualityGate` has nothing to react to.
- Hosting (self-hosted "SonarQube Server"/Community Build vs. SonarQube Cloud) is still **PENDING**
  ([ADR-010](../adr/adr-010-ci-cd.md)) — the Jenkinsfile and properties file work against either,
  since neither hardcodes a host.

Exact Jenkins identifiers the pipeline expects to already exist (documented here so a Jenkins admin
setting this up has a checklist — see [infrastructure/jenkins/README.md](../../infrastructure/jenkins/README.md)):

| Jenkins configuration item                            | Expected name/ID                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| SonarQube Scanner tool installation                   | `SonarScanner`                                                                                                 |
| SonarQube server connection (Manage Jenkins > System) | `SonarQubeServer`                                                                                              |
| Credential: SonarQube auth token (Secret text)        | `SONAR_TOKEN` (documentation convention — the actual Jenkins credential ID is chosen by whoever configures it) |

## Coverage baseline

Unchanged from [testing-strategy.md](../testing/testing-strategy.md): Lines/Statements/Functions
≥80%, Branches ≥75%, enforced by Vitest's own `coverage.thresholds` (not by SonarQube — SonarQube's
quality gate is a second, independent check on top, covering bugs/vulnerabilities/duplication/etc.,
not just the coverage number).

## Branch triggers and merge gates

- Every `feature/*`, `fix/*`, `test/*`, `refactor/*`, `docs/*`, `ci/*`, `chore/*`, `build/*`,
  `perf/*`, `hotfix/*` push, plus `develop` and `main`, runs this same pipeline — configure Jenkins
  as a **Multibranch Pipeline** job (via the GitHub Branch Source plugin, since this repo is on
  GitHub) so branches and PRs are auto-discovered rather than each needing a manually-created job.
- A PR into `develop` (or `main`, for `hotfix/*`) must pass every stage through the Quality Gate
  before merge — see [git-branching-strategy.md](../development/git-branching-strategy.md) for the
  GitHub branch protection rules that enforce this.
- No stage deploys anything (§ above) — safe to run on every branch without a "which environment
  does this deploy to" question.

## Secrets

Every credential (SonarQube auth token today; DB URL/provider API keys once they exist) is a
Jenkins credential, referenced by ID — never a literal value in the `Jenkinsfile`,
`sonar-project.properties`, a shell command, or a log line. `withSonarQubeEnv` masks the token in
Jenkins' console log automatically (standard Jenkins credential-masking behavior).

## Local CI simulation

Everything Jenkins runs through the Quality Gate, except the SonarQube analysis itself (which needs
a live SonarQube server), can be reproduced locally before ever touching Jenkins:

```bash
pnpm install --frozen-lockfile
pnpm check       # lint + format:check + typecheck + test + build
pnpm test:e2e     # Playwright, installs/uses local browsers (not the CI Docker image)
```

A developer should never need to push to discover that lint/typecheck/tests fail — `pnpm check`
(plus `pnpm test:e2e` for the E2E slice) is the same set of gates, just without the Docker
pinning/JUnit-artifact machinery that only matters in CI.

If a local SonarQube Server (self-hosted) instance is available, `sonar-scanner` can be run against
it directly using this repo's `sonar-project.properties` plus `-Dsonar.host.url=...
-Dsonar.token=...` on the command line — never commit those flags. Not required for day-to-day
development; only useful when iterating on SonarQube rule configuration itself.

## Troubleshooting

- **`Invalid agent type "docker" specified. Must be one of [any, label, none]`**: the "Docker
  Pipeline" plugin isn't installed on this Jenkins instance — install it (Manage Jenkins > Plugins
  > Available), no restart usually required.
- **`corepack enable` fails with `EACCES: permission denied, symlink ... -> /usr/local/bin/...`**:
  see § Reproducibility above — the Jenkinsfile already works around this
  (`--install-directory`); if you see this, something reverted that fix.
- **A stage fails and the log doesn't say why**: each stage runs exactly one concern (lint OR
  typecheck OR tests, etc. — see § stage list above) specifically so a red stage name alone
  narrows the failure category; read that stage's log next, not the whole build log.
- **`pnpm install --frozen-lockfile` fails in CI but `pnpm install` works locally**: the lockfile is
  out of sync with a `package.json` change that wasn't committed — run `pnpm install` locally
  (without the flag) and commit the updated `pnpm-lock.yaml`.
- **E2E stage fails with a browser/version mismatch error**: the Playwright Docker image tag in the
  `Jenkinsfile` and the resolved `@playwright/test` version in `pnpm-lock.yaml` have drifted apart
  — bump the image tag to match (see § Reproducibility above).
- **`waitForQualityGate` hangs until the 1-hour timeout**: the SonarQube-side webhook
  (`<jenkins-url>/sonarqube-webhook/`) is missing or misconfigured — check
  Administration > Webhooks on the SonarQube project.
- **Quality Gate fails on a change that looks fine**: check the SonarQube project dashboard for
  which condition failed (new-code coverage, duplication, a specific rule) — don't just re-run the
  pipeline hoping it passes; per [security skill](../../.claude/skills/sonarqube/SKILL.md), a
  failing gate is a real blocker, not advisory.

## Not decided yet

- Where Jenkins itself runs, and SonarQube hosting (self-hosted vs. SonarQube Cloud) — both
  PENDING, see [ADR-010](../adr/adr-010-ci-cd.md). The pipeline and properties file don't assume
  either.
- Whether `tests/integration/` runs against a containerized Postgres in CI or a managed test DB —
  moot until a real database adapter exists (ADR-005/ADR-015).
- Deploy stage — a later milestone (ADR-015).
