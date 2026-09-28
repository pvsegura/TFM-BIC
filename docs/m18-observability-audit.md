# M18 — Observability Audit

Date: 2026-09-28 · Branch: `feature/observability` (from M17 `feature/production-readiness`)

Made against the repository (code, scripts, pipeline) and the one deployment that exists — the public
**staging demo** on Render Free + Neon Free (`https://tfm-bic.onrender.com`, `NODE_ENV=staging`, M17).
Production is still blocked (M17 B-1…B-7). Nothing below assumes infrastructure that does not exist.

## 1. Current state (before M18)

| Area                     | Found                                                                                                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logging                  | Fastify's built-in Pino, JSON to stdout (`apps/api/src/logging/logger-options.ts`). Level `info`, `silent` under test. Numeric levels, default `pid`/`hostname` base fields — **no service, environment or version on log lines**. No `LOG_LEVEL` setting.            |
| Redaction                | Centralised: `authorization`/`cookie`/`set-cookie` redacted; request serializer drops query strings (M14); allowlist error serializer strips drizzle `params` and Postgres `detail` (M15); `logMethod` hook scrubs messages. Tested.                                  |
| Request logs             | Fastify default: two lines per request (`incoming request`, `request completed`) with `reqId`, raw path, `responseTime`. **No route template**, so latency per endpoint cannot be grouped; health probes log two lines each.                                          |
| Request IDs              | M16: random UUID per request (`genReqId`), **never taken from the client** (a client id could forge correlation), returned as `X-Request-Id` on every response, present on every request log line as `reqId`.                                                         |
| Health                   | `GET /health`: liveness only, reports `APP_VERSION`; independent of DB and providers.                                                                                                                                                                                 |
| Readiness                | `GET /ready`: `SELECT 1` within 2 s → 200/503, reason never disclosed. **A failing `/ready` logs nothing** — a DB outage is invisible in the logs unless a request fails.                                                                                             |
| Metrics                  | **None.**                                                                                                                                                                                                                                                             |
| Error tracking (backend) | Error handler: 4xx logged at `info` with a safe body; 5xx logged once at `error` with the serialized error and a generic body. **No `unhandledRejection`/`uncaughtException` handler** — Node's default prints an unstructured, unredacted stack to stderr and exits. |
| Error tracking (web)     | **None.** No Error Boundary, no global `error`/`unhandledrejection` listeners; React Router's default error element shows its developer message. Failed API calls become a safe `ApiError` (message from the API, never a body/stack).                                |
| Database                 | One shared `pg` pool (max 10, timeouts) with an idle-error listener that writes one JSON line (SQLSTATE only). No pool usage visibility (total/idle/waiting), no count of connection errors.                                                                          |
| Gemini (audio)           | Route logs one success/failure line per request with duration and a safe error (`audio-generation-log.ts`). No aggregates.                                                                                                                                            |
| Hyperframes (video)      | In-process background job (ADR-012). **Provider success/failure and duration are not logged at all**; the failure category is only stored on the job row.                                                                                                             |
| Email                    | Every send attempt logged (`email.delivery_accepted`/`failed`) with category/template/adapter — never recipient, subject or links. No latency, no aggregates. Only adapter: `fake`.                                                                                   |
| Background jobs          | Only the in-process video render (above). No scheduler, no worker.                                                                                                                                                                                                    |
| Auth/security signals    | Logged events: `auth.login_failure`, `request.rejected` (4xx incl. 429). No aggregate counts of 401/403/429.                                                                                                                                                          |
| Audit log                | M15/M16 decision: **no separate audit store**; security-relevant actions are structured log events (`privacy.account_deleted`, `auth.password_reset_completed`, …) — "logs-only audit".                                                                               |
| Release identification   | `APP_VERSION` (`<version>+<git sha>`, set by the image build) in `/health` and the `server.started` line only.                                                                                                                                                        |
| CI/CD                    | Jenkins: quality gates, coverage, E2E, dependency audit, gitleaks, image build/validation, release-candidate record. Nothing observability-specific needed.                                                                                                           |
| Alerting                 | None configured by the project. Render (verified 2026-09-28): notifies by email/Slack when a service **becomes unhealthy** or a **deploy fails** (health check on a configured path).                                                                                 |
| Dashboards               | None. Render's dashboard shows the log stream; nothing else is verified for the Free plan.                                                                                                                                                                            |
| Retention                | Render Hobby workspace: **7 days** of logs, text/level search; **no log streams** (external export) on this plan (verified 2026-09-28).                                                                                                                               |
| Documentation/runbooks   | M17 runbook and incident-response docs (deploy, rollback, restore). No per-alert runbooks, no observability data policy.                                                                                                                                              |

## 2. Existing capabilities (reuse, do not rebuild)

- Pino via Fastify and its redaction/serializers (M14–M16) — the single logging pipeline.
- `X-Request-Id` (M16) — the single correlation system.
- `/health`, `/ready`, the start-up DB wait and bounded shutdown (M17).
- Safe public error bodies (M16 error handler); `ApiError` on the web side.
- Typed provider errors at the port boundary (`Audio*Error`, `Video*Error`, `EmailDeliveryError`) — gives a
  small, controlled set of failure categories without parsing messages.
- Narrow provider ports (`AudioGenerationService`, `VideoGenerationService`, `EmailProvider`) — instrumentable
  by decoration in the composition layer, without touching domain or application.
- Route inventory default-deny test (M16) — any new route must be classified.
- Render's health checks and unhealthy/deploy-failure notifications — the only alert channel that exists.

## 3. Missing capabilities (gaps)

1. Log lines do not say which service, environment or release produced them.
2. No route template / per-endpoint latency; two request lines per request; probe noise.
3. No metrics of any kind (request rate, error rate, latency, providers, DB pool).
4. `/ready` failures and DB outages are silent in the logs.
5. Fatal process errors bypass the structured, redacting logger.
6. Video render outcomes are not logged.
7. No visibility of frontend runtime/render errors; no Error Boundary.
8. No aggregate security signals (401/403/429 rates).
9. No alert definitions, runbooks or observability data policy.
10. No `LOG_LEVEL` control; nothing prevents debug logging in production.

## 4. Proposed M18 changes (only these)

| #   | Change                                                                                                                                                                                                                 | Why no vendor                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Logger base fields `service`, `env`, `version`; ISO timestamps; label levels; `LOG_LEVEL` (production refuses `debug`).                                                                                                | Config of the existing logger.                                                             |
| 2   | One `request.completed` line per request (method, **route template**, status, duration, reqId) replacing Fastify's two; successful probes at `debug`.                                                                  | Same logger.                                                                               |
| 3   | In-process metrics registry (counters + fixed-bucket latency histograms, bounded label sets) fed by an `onResponse` hook and provider decorators.                                                                      | Stdout logs are the only sink the host offers; an in-memory aggregate costs nothing.       |
| 4   | `GET /internal/metrics` (JSON), **only when `METRICS_TOKEN` is set**, bearer-token protected, rate limited. Includes process, DB pool and readiness state.                                                             | Pull by an operator or a future scraper; no push, no network call per request.             |
| 5   | Readiness transitions logged (`readiness.lost` with the safe reason code / `readiness.restored`) and counted.                                                                                                          | —                                                                                          |
| 6   | Provider decorators (composition layer): Gemini audio, Hyperframes video (also logs render start/end), email — outcome, category, latency.                                                                             | —                                                                                          |
| 7   | Shared-pool statistics (total/idle/waiting, idle-error count).                                                                                                                                                         | —                                                                                          |
| 8   | `unhandledRejection`/`uncaughtException` → one `fatal` line through the redacting logger, then the existing bounded shutdown.                                                                                          | —                                                                                          |
| 9   | Web: Error Boundary (root route `errorElement`) with a safe fallback, global error listeners, and a minimal **same-origin** report `POST /client-errors` (error kind/name/path only — no message, stack or user data). | A third-party error tracker is not needed for an MVP and would add a data processor (M15). |
| 10  | Docs: data policy, alert catalogue + runbooks, ADR-029, current-state.                                                                                                                                                 | —                                                                                          |

Explicitly **not** done: external error tracker, APM, OpenTelemetry, Prometheus/Grafana, log shipping, per-query
SQL logging, product analytics, an audit-log store. Alert delivery beyond Render's own notifications and an
external uptime monitor are **PENDING USER DECISION** (see [observability-data-policy.md](observability-data-policy.md)
and [runbooks/README.md](runbooks/README.md)).
