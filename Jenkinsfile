// Declarative Jenkins pipeline for TFM-BIC (M2 scope: quality validation only, no deploy).
//
// Prerequisites on the Jenkins controller/agent (see infrastructure/jenkins/README.md):
//   - "Docker Pipeline" plugin, with a Docker daemon reachable from the agent (the `docker {}`
//     agent blocks below need it).
//   - "SonarQube Scanner for Jenkins" plugin, with:
//       - a SonarQube Scanner tool installation named exactly `SonarScanner`
//         (Manage Jenkins > Tools), auto-install is fine — the scanner bundles its own JRE.
//       - a SonarQube server connection named exactly `SonarQubeServer`
//         (Manage Jenkins > System > SonarQube servers), whose auth token is a Jenkins
//         "Secret text" credential — never the literal token in this file.
//       - a webhook on the SonarQube server pointing to `<jenkins-url>/sonarqube-webhook/`
//         (required for waitForQualityGate to work without polling).
//   - "JUnit" and "HTML Publisher" plugins for test/coverage/E2E report visualization.
//   - Configured as a Multibranch Pipeline (or per-branch Pipeline) job so every
//     feature/fix/test/refactor/docs/ci/chore/build/perf/hotfix branch, develop, and main
//     get this same pipeline (see docs/deployment/ci-cd-pipeline.md).
//
// "Checkout" is not a stage here: Jenkins performs it automatically as
// "Declarative: Checkout SCM" before any stage runs, when this Jenkinsfile is loaded via
// "Pipeline script from SCM".
pipeline {
    agent {
        docker {
            image 'node:24-bookworm-slim'
        }
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
    }

    environment {
        CI = 'true'
        // corepack's default shim location (/usr/local/bin) is root-owned in the official
        // Node/Playwright images; the Docker Pipeline plugin runs agent containers as the
        // Jenkins controller's own non-root UID, so corepack needs a writable install
        // directory instead (verified: `corepack enable --install-directory`, nodejs/corepack).
        PATH = "${WORKSPACE}/.corepack-bin:${PATH}"
    }

    stages {
        stage('Environment / Tool Validation') {
            steps {
                sh '''
                    set -eu
                    node --version
                    corepack enable --install-directory "${WORKSPACE}/.corepack-bin"
                    pnpm --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                // --frozen-lockfile: fail instead of silently updating pnpm-lock.yaml.
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('Lint') {
            steps {
                sh 'pnpm lint'
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
                sh '''
                    set -eu
                    corepack enable --install-directory "${WORKSPACE}/.corepack-bin"
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
