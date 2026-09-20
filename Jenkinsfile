// Declarative Jenkins pipeline for TFM-BIC (M2 scope: quality validation only, no deploy).
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
        timeout(time: 45, unit: 'MINUTES')
    }

    environment {
        CI = 'true'
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

        // No deploy stage: M2 scope stops after the Quality Gate. Deployment is a later
        // milestone (see docs/adr/adr-015-deployment.md, PENDING).
    }
}
