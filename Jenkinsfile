// Declarative Jenkins pipeline for TFM-BIC: quality validation (M2), then (M17) secret scanning, the
// production image build and validation, and a release-candidate record. No deploy stage yet.
//
// Prerequisites on the Jenkins controller (see infrastructure/jenkins/README.md /
// infrastructure/jenkins/Dockerfile): Node 24 + pnpm and the Docker CLI (talking to the host's
// Docker daemon via a mounted socket) are baked into the controller's own image — main stages
// run directly on the controller (`agent any`), not in a separate `docker {}` sub-agent. Only
// the E2E stage spins up a sibling container (Playwright's image), which needs the controller's
// Docker CLI/socket access to do so; nesting a SECOND docker agent from inside a first one
// doesn't work (a first version of this Jenkinsfile ran main stages inside a plain
// `agent { docker { image: 'node:24-bookworm-slim' } }`, and the E2E stage then failed with
// "docker: not found" trying to start its own sibling container from inside that one — only the
// controller itself has the Docker CLI. See docs/deployment/ci-cd-pipeline.md for the full story,
// including the corepack-non-root-permission detour that approach also required and no longer
// needs since Node/pnpm are baked into the controller image instead).
//
// Also needed:
//   - "SonarQube Scanner for Jenkins" plugin, with:
//       - a SonarQube Scanner tool installation named exactly `SonarScanner`
//         (Manage Jenkins > Tools), auto-install is fine — the scanner bundles its own JRE.
//       - a SonarQube server connection named exactly `SonarQubeServer`
//         (Manage Jenkins > System > SonarQube servers), whose auth token is a Jenkins
//         "Secret text" credential — never the literal token in this file.
//       - a webhook on the SonarQube server pointing to `<jenkins-url>/sonarqube-webhook/`
//         (required for waitForQualityGate to work without polling).
//   - "Docker Pipeline", "JUnit" and "HTML Publisher" plugins.
//   - Configured as a Multibranch Pipeline (or per-branch Pipeline) job so every
//     feature/fix/test/refactor/docs/ci/chore/build/perf/hotfix branch, develop, and main
//     get this same pipeline (see docs/deployment/ci-cd-pipeline.md).
//
// "Checkout" is not a stage here: Jenkins performs it automatically as
// "Declarative: Checkout SCM" before any stage runs, when this Jenkinsfile is loaded via
// "Pipeline script from SCM".
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        // M17: + image build (≈ 2–6 min) and image validation (≈ 1–2 min).
        timeout(time: 60, unit: 'MINUTES')
    }

    // M17: pushing needs an image registry, which is PENDING (docs/production/M17-HOSTING-OPTIONS.md).
    // Deploy stages are not defined yet: the hosting provider is PENDING USER DECISION, and this
    // pipeline must never deploy anywhere nobody approved. See docs/deployment/ci-cd-pipeline.md.
    parameters {
        booleanParam(
            name: 'PUSH_IMAGE',
            defaultValue: false,
            description: 'Push the validated image to IMAGE_REGISTRY (main only; needs the tfm-bic-registry credential).'
        )
    }

    environment {
        CI = 'true'
        // Immutable image identity (M17): the full commit's first 12 hex digits, never `latest`.
        IMAGE_NAME = 'tfm-bic'
        // Pinned; bump deliberately (docs/production/M17-PRODUCTION-RUNBOOK.md).
        GITLEAKS_IMAGE = 'ghcr.io/gitleaks/gitleaks:v8.30.1'
    }

    stages {
        stage('Environment / Tool Validation') {
            steps {
                sh '''
                    set -eu
                    node --version
                    pnpm --version
                    docker --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                // --frozen-lockfile: fail instead of silently updating pnpm-lock.yaml.
                sh 'pnpm install --frozen-lockfile'
            }
        }

        // M16 (docs/security/M16-SECURITY-AUDIT.md, S-16): known-vulnerability check against the
        // lockfile just installed. Any advisory in a production dependency fails the build; in dev
        // dependencies (which also run here, in CI) high/critical ones do. Accepted lower-severity
        // dev-only advisories are listed in docs/security/M16-RISK-REGISTER.md. Needs registry
        // access; no credential is involved.
        stage('Dependency Audit') {
            steps {
                sh '''
                    set -eu
                    pnpm audit --prod
                    pnpm audit --audit-level=high
                '''
            }
        }

        // M5: validates every content file (schemas, ids, ordering, availability) with the same
        // loader the API runs at startup, so malformed content fails here, before lint/tests, with
        // a readable list of problems instead of failing later in a test or at server start.
        stage('Content Validation') {
            steps {
                sh 'pnpm content:validate'
            }
        }

        stage('Lint') {
            steps {
                // ESLint's type-aware rules (eslint.config.mjs: projectService: true) build a
                // full TS program per workspace tsconfig in one process — on this Jenkins
                // controller's memory-constrained container that hit Node/V8's *default*
                // ~2.2GB old-space ceiling and crashed with a heap OOM, even though the system
                // itself still had free memory/swap. Raising the ceiling explicitly (not
                // relevant/needed on a typical local machine, which is why this never showed up
                // outside CI) fixes it without touching system-wide memory.
                sh 'NODE_OPTIONS="--max-old-space-size=3072" pnpm lint'
            }
        }

        stage('Format Check') {
            steps {
                sh 'pnpm format:check'
            }
        }

        stage('Typecheck') {
            steps {
                sh 'pnpm typecheck'
            }
        }

        // Runs the full Vitest suite with coverage instrumentation in one pass — a separate
        // plain `pnpm test` first would just re-run the same tests a second time for no
        // additional signal. Vitest fails this stage on either a test failure or an unmet
        // coverage threshold (vitest.config.ts), so both gates are enforced here.
        stage('Unit / Component Tests') {
            steps {
                sh 'pnpm test:coverage'
            }
        }

        stage('Coverage Report') {
            steps {
                junit testResults: 'test-results/junit.xml', allowEmptyResults: true
                publishHTML target: [
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'coverage',
                    reportFiles: 'index.html',
                    reportName: 'Coverage Report',
                ]
                archiveArtifacts artifacts: 'coverage/lcov.info', fingerprint: true
            }
        }

        stage('Build') {
            steps {
                sh 'pnpm build'
            }
        }

        stage('E2E') {
            agent {
                docker {
                    // Pinned to the exact @playwright/test version resolved in pnpm-lock.yaml
                    // (1.63.0) — Playwright refuses to run if the image/browser version and the
                    // npm package version disagree. Bump both together.
                    image 'mcr.microsoft.com/playwright:v1.63.0-noble'
                    reuseNode true
                }
            }
            steps {
                // This image (unlike the Jenkins controller) doesn't have pnpm baked in, and
                // the Docker Pipeline plugin runs it as the controller's own non-root UID, so
                // corepack's default shim location (/usr/local/bin) isn't writable here either
                // — same fix as the controller-side attempt that was abandoned for the *main*
                // stages (see docs/deployment/ci-cd-pipeline.md), kept here since this one
                // remaining stage still runs in an ad-hoc external image, not a custom one.
                // `pnpm` restricts corepack to that one package manager — a bare `corepack
                // enable` also tries (and fails) to link yarn against something already
                // present at /usr/local/bin/yarn in this image (same issue hit while building
                // the Jenkins controller's own image; this project doesn't use yarn at all).
                sh '''
                    set -eu
                    mkdir -p "$WORKSPACE/.corepack-bin"
                    corepack enable --install-directory "$WORKSPACE/.corepack-bin" pnpm
                    export PATH="$WORKSPACE/.corepack-bin:$PATH"
                    pnpm exec playwright test --config tests/e2e/playwright.config.ts
                '''
            }
            post {
                always {
                    junit testResults: 'test-results/e2e-junit.xml', allowEmptyResults: true
                    publishHTML target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright E2E Report',
                    ]
                    archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('SonarQubeServer') {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ---- M17: build once, validate, record — the artifact every later environment receives ----

        // M16 S-16 follow-up: secret scanning over the checkout's whole Git history. Any finding fails
        // the build; --redact keeps a leaked value out of the Jenkins log itself. The .git directory
        // is streamed through stdin rather than bind-mounted: this controller talks to the host's
        // Docker daemon, which would resolve a -v path on the host, not in the controller.
        stage('Secret Scan') {
            steps {
                sh '''
                    set -eu
                    tar -C "$WORKSPACE" -cf - .git | docker run --rm -i --entrypoint sh "$GITLEAKS_IMAGE" -c '
                        mkdir -p /tmp/repo && tar -xf - -C /tmp/repo &&
                        git config --global --add safe.directory /tmp/repo &&
                        gitleaks git /tmp/repo --redact --no-banner --exit-code 1'
                '''
            }
        }

        stage('Build Image') {
            steps {
                script {
                    env.GIT_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = env.GIT_SHA.take(12)
                    def version = sh(script: "node -p \"require('./package.json').version\"", returnStdout: true).trim()
                    env.APP_VERSION = "${version}+${env.IMAGE_TAG}"
                }
                // No --build-arg carries a secret: only the public version and commit.
                sh '''
                    set -eu
                    docker build \
                        -f infrastructure/docker/app.Dockerfile \
                        --build-arg APP_VERSION="$APP_VERSION" \
                        --build-arg GIT_COMMIT="$GIT_SHA" \
                        -t "$IMAGE_NAME:$IMAGE_TAG" .
                '''
            }
        }

        // Migrations on a clean database, staging start-up as a least-privilege role, the smoke test,
        // a database outage, non-root/read-only checks, no embedded secrets, graceful stop. Uses
        // generated one-time secrets — no Jenkins credential is involved. disableConcurrentBuilds()
        // (above) means no two validations or migration runs from this job overlap.
        stage('Validate Image') {
            steps {
                sh 'infrastructure/docker/validate-image.sh "$IMAGE_NAME:$IMAGE_TAG" "$APP_VERSION"'
            }
        }

        // Traceability: which commit, version, image and migrations this build validated.
        stage('Record Release Candidate') {
            steps {
                sh '''
                    set -eu
                    IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE_NAME:$IMAGE_TAG")"
                    MIGRATIONS="$(ls packages/data/src/*/db/migrations/*.sql | sed 's|packages/data/src/||' | paste -sd, -)"
                    cat > release-candidate.json <<EOF
{
  "gitCommit": "$GIT_SHA",
  "appVersion": "$APP_VERSION",
  "image": "$IMAGE_NAME:$IMAGE_TAG",
  "imageId": "$IMAGE_ID",
  "migrations": "$MIGRATIONS",
  "buildUrl": "$BUILD_URL"
}
EOF
                    cat release-candidate.json
                '''
                archiveArtifacts artifacts: 'release-candidate.json', fingerprint: true
            }
        }

        // Registry: PENDING decision. Runs only when asked for, on main, with IMAGE_REGISTRY set on
        // the job and a `tfm-bic-registry` username/password credential (a deploy token, never a
        // person's account). The password goes through stdin, never the command line or the log.
        stage('Push Image') {
            when {
                allOf {
                    branch 'main'
                    expression { return params.PUSH_IMAGE && env.IMAGE_REGISTRY?.trim() }
                }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'tfm-bic-registry',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_TOKEN'
                )]) {
                    sh '''
                        set -eu
                        printf '%s' "$REGISTRY_TOKEN" | docker login "${IMAGE_REGISTRY%%/*}" -u "$REGISTRY_USER" --password-stdin
                        docker tag "$IMAGE_NAME:$IMAGE_TAG" "$IMAGE_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
                        docker push "$IMAGE_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
                        docker logout "${IMAGE_REGISTRY%%/*}"
                    '''
                }
            }
        }

        // Deploy to staging → staging smoke test → input('Deploy to production?') → production
        // deploy → production smoke test: not defined until the hosting provider and registry are
        // chosen (PENDING USER DECISION). The design they must follow is in
        // docs/production/M17-DEPLOYMENT-ARCHITECTURE.md; the smoke test they call already exists
        // (infrastructure/deployment/smoke-test.mjs).
    }

    post {
        always {
            // Validation containers are removed by the script's own trap; this drops the local tag
            // so the controller's disk does not fill up with one image per build.
            sh 'if [ -n "${IMAGE_TAG:-}" ]; then docker image rm "$IMAGE_NAME:$IMAGE_TAG" >/dev/null 2>&1 || true; fi'
        }
    }
}
