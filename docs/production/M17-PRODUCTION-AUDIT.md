# M17 — Production Audit

Status: M17 complete up to the safe boundary — **NOT production ready** (see [Blockers](#blockers)).
Date: 2026-09-27 · Branch: `feature/production-readiness` (from M16 `feature/security-hardening`)

This audit was made against the repository itself (code, scripts, pipeline), not against earlier
documentation. Every "verified" statement below was checked by running it in this milestone; the
evidence is listed in [Verification](#verification).

## 1. State before M17 (what the repository could and could not do)

| Area                 | Found at the start of M17                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting, registry    | None selected (ADR-015 PENDING). `infrastructure/deployment/` and `infrastructure/nginx/` were placeholders.                                                                                            |
| Production artifact  | None. `apps/api` `start` ran `tsx src/index.ts` (a dev tool); workspace packages export TypeScript source, so `tsc` output could not run under plain Node. No Dockerfile for the app.                   |
| SPA delivery         | Only `vite dev` / `vite preview`. The API and SPA must share one origin (`SameSite=Strict` cookie, Origin check) but nothing served them together outside Vite.                                         |
| Readiness            | `GET /ready` returned `{ ready: true }` unconditionally.                                                                                                                                                |
| Shutdown             | SIGTERM/SIGINT closed the server and pools with no timeout and no error handling; a second signal started a second shutdown.                                                                            |
| Database connections | 11 separate `pg.Pool`s (one per context), `pg` defaults: up to ~110 connections, no connection, idle or statement timeout. No listener for pool `error` events (see finding F-1).                       |
| Migrations           | 10 migration sets, applied by 10 hand-run `drizzle-kit migrate` commands (a devDependency) in an order only documented in comments. No protection against concurrent runs.                              |
| Configuration guards | M16 guards (secret length, https `APP_BASE_URL`, `TRUST_PROXY`). Nothing refused fake providers, a loopback URL or a plaintext database connection in production.                                       |
| Providers            | Email: `fake` is the only adapter (ADR-014 PENDING). Audio: `fake` default, Gemini adapter gated by ADR-013 terms. Video: `fake` default, Hyperframes adapter unverified, output written to local disk. |
| CI/CD                | Jenkins quality pipeline up to the SonarQube quality gate. Dependency audit (M16). No secret scanning (M16 S-16 left it PENDING: Docker was unavailable). No image build, no deploy.                    |
| Backups              | None defined. Neon chosen (ADR-005) but not provisioned; no restore ever tested.                                                                                                                        |
| Frontend config      | No `VITE_*` variables at all — the SPA has no build-time configuration and calls its own origin. Nothing secret can reach the bundle through configuration.                                             |
| Scheduled/background | No cron or scheduler. Video generation runs as an in-process, non-durable task (ADR-012). No worker process.                                                                                            |

## 2. What M17 changed

| Change                                                                                           | Where                                                                              |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Production guards: fake providers, loopback URLs, DB without TLS, missing `WEB_DIST_DIR` refused | `packages/config/src/env/load-env.ts`                                              |
| `disabled` mode for audio/video (503, no job, no provider call)                                  | `apps/api/src/routes/*-generations.route.ts`, `packages/data/src/providers/`       |
| One shared, bounded pool with timeouts and an idle-error listener                                | `packages/data/src/db/shared-pool.ts`                                              |
| `/ready` checks the database; `/health` stays liveness-only and reports `APP_VERSION`            | `apps/api/src/routes/health.route.ts`                                              |
| Start-up waits for the DB (bounded backoff) and exits 1; bounded, idempotent shutdown            | `apps/api/src/lifecycle/process-lifecycle.ts`, `apps/api/src/index.ts`             |
| One migration runner, fixed order, advisory lock, `lock_timeout`                                 | `packages/data/src/migrations/`, `pnpm db:migrate`                                 |
| API serves the built SPA (in-memory, explicit routes, SPA headers, precompressed)                | `apps/api/src/web/web-app.ts` (ADR-028)                                            |
| Compiled production bundle (esbuild), test composition excluded and checked                      | `apps/api/build.mjs`                                                               |
| Production image                                                                                 | `infrastructure/docker/app.Dockerfile`, `.dockerignore`                            |
| Image validation, smoke test, restore drill                                                      | `infrastructure/docker/validate-image.sh`, `infrastructure/deployment/*.mjs\|*.sh` |
| Jenkins: secret scan, image build/validation, release-candidate record, opt-in push              | `Jenkinsfile`                                                                      |

## 3. Findings raised and fixed during M17

| ID  | Severity | Finding                                                                                                                                                                           | Fix                                                                                      |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| F-1 | HIGH     | Stopping Postgres under the running container **crashed the API**: `pg.Pool` emitted `error` (57P01) for an idle connection and nothing listened. Existed in every pool since M3. | Listener on the shared pool; logs the SQLSTATE only. Re-verified by `validate-image.sh`. |
| F-2 | HIGH     | `/ready` always true: a platform would route traffic to an instance with no database.                                                                                             | Real `SELECT 1` with a 2 s timeout; 503 otherwise.                                       |
| F-3 | MEDIUM   | Up to ~110 connections, no timeouts: exhausts small managed-Postgres connection caps; requests hang instead of failing.                                                           | Shared pool, `max` 10, 5 s connect, 30 s idle, 15 s statement timeout.                   |
| F-4 | MEDIUM   | Production could start with every provider fake, i.e. "successfully" never send a verification email.                                                                             | Fail-fast guards (production only; staging may use fakes).                               |
| F-5 | MEDIUM   | The API's `index.ts` statically imports the PGlite test composition — a naive bundle ships a devDependency and an in-memory database.                                             | Build-time stub + metafile check that fails the build if it ever leaks.                  |
| F-6 | LOW      | Shutdown could hang forever or run twice.                                                                                                                                         | Single, 8 s-bounded shutdown; exit code reflects failures.                               |
| F-7 | LOW      | Concurrent migration runs possible (two deploys at once).                                                                                                                         | Postgres advisory lock (bounded wait) + Jenkins `disableConcurrentBuilds()`.             |

## 4. Blockers

A **blocker** stops a real production launch. A **risk** is accepted or tracked, and does not.

| #   | Blocker                                                                                                                                                                             | Owner / decision                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| B-1 | **No hosting provider selected** — [M17-HOSTING-OPTIONS.md](M17-HOSTING-OPTIONS.md): PENDING USER DECISION.                                                                         | User                                    |
| B-2 | **No real email provider** — `EMAIL_PROVIDER=fake` is the only adapter, and production refuses it (verification and password-reset emails are required). ADR-014 PENDING.           | User (provider), then an adapter (M14+) |
| B-3 | **No production database provisioned** — Neon selected (ADR-005), account, roles and TLS URL not created; backups not configured.                                                   | User / operator                         |
| B-4 | **No domain / DNS / HTTPS** — `APP_BASE_URL` must be a public https origin. PENDING USER/INFRASTRUCTURE DECISION.                                                                   | User                                    |
| B-5 | **No image registry** — PENDING REGISTRY DECISION (options in the hosting document).                                                                                                | User                                    |
| B-6 | **Privacy/legal placeholders** — controller identity/contact on the privacy page is a visible PENDING placeholder (M15); legal bases, retention and transfers PENDING legal review. | User / legal                            |
| B-7 | **RPO/RTO undefined** — PENDING PRODUCT DECISION ([M17-BACKUP-AND-RECOVERY.md](M17-BACKUP-AND-RECOVERY.md)).                                                                        | Product owner                           |

Not blockers (production runs with the feature switched off — `disabled`, answered with 503):

- **Audio (Gemini)** — ADR-013 provider-terms decision (under-18 use, paid tier in the EEA) PENDING.
- **Video (Hyperframes)** — adapter unverified end to end, needs Chrome/FFmpeg and **persistent media
  storage, which does not exist**; generated files would live on the container's ephemeral disk.
  Production refuses `hyperframes` until both are solved.

## 5. Non-blocking risks

| Risk                                                                                                                  | Handling                                                            |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Rate limits, audio cache and video jobs are in memory → correct only with **one** API instance.                       | Documented single-instance topology; a shared store is future work. |
| Sessions are in Postgres (not memory) → sessions survive restarts and do not block scaling.                           | —                                                                   |
| Recreate deployment: a short outage on every release (no zero-downtime claim).                                        | Documented; rolling/blue-green depends on the chosen host.          |
| Serverless Postgres cold start (Neon scale-to-zero, 5 min on Free) adds latency to the first request and to start-up. | Start-up waits up to ~25 s; readiness reflects it.                  |
| No error tracking or metrics — **addressed by M18** (ADR-029): in-process metrics, SPA error reports, runbooks.       | See docs/m18-observability-audit.md.                                |
| Base image pinned by tag, not digest.                                                                                 | Digest pinning documented in the runbook as a follow-up.            |
| Jenkins pipeline changes were **not executed** (standing instruction: do not run Jenkins/SonarQube).                  | Each shell step was run locally; first real run must be watched.    |

## 6. Infrastructure assumptions

- One API instance per environment (see §5). Postgres reachable over TLS from it.
- The host terminates TLS and sets `X-Forwarded-For`; its proxy address range goes into `TRUST_PROXY`.
- The host runs the image with a read-only view of `/app` and gives SIGTERM with ≥ 10 s grace.
- `/health` is the liveness probe, `/ready` the readiness/traffic probe.

## 7. Unresolved provider decisions

Hosting (B-1), registry (B-5), email (B-2, ADR-014), domain (B-4), Gemini terms (ADR-013),
Hyperframes + media storage (ADR-012), error tracking (M18).

## Verification

Run on 2026-09-27 on the developer laptop (Windows 11, Docker Desktop 4.91 / engine 29.8.0):

| Check                                                                                                                             | Result                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Image build from the repository (`app.Dockerfile`)                                                                                | PASS — 241.5 MB, `node:24.19.0-bookworm-slim`, user `node` (uid 1000) |
| `validate-image.sh` (migrations ×2, prod refusal, staging start, smoke, DB outage, non-root/read-only, no secrets, graceful stop) | PASS — `IMAGE VALID: tfm-bic:0e2802cfd133`                            |
| Smoke test against the container                                                                                                  | PASS — 18/18                                                          |
| Migration concurrency (two runs at once)                                                                                          | PASS — one `lock_busy` then no-op; no duplicate history rows          |
| Restore drill (`restore-drill.sh`)                                                                                                | PASS — identical row counts; drill account logs in on the restore     |
| Rollback drill (broken N+1 → N)                                                                                                   | PASS — see [runbook](M17-PRODUCTION-RUNBOOK.md#rollback)              |
| Secret scan (gitleaks v8.30.1, all 259 commits)                                                                                   | PASS — no leaks                                                       |
| Production config with fakes/loopback/short secret                                                                                | Refused, 8 problems listed, no secret value printed                   |

Performance observations (laptop, single request, not a benchmark): process start-up to listening
**~0.5 s**; `/health` ~15 ms; `/ready` ~8–30 ms; SPA shell ~11 ms; `/lessons` ~16–22 ms; clean
migrations 0.35–0.4 s (first cold run 39 s); graceful stop 0.68 s.
