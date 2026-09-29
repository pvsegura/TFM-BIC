# Runbooks and alert catalogue (M18)

Decision record: [ADR-029](../adr/adr-029-observability.md) · Data rules: [observability-data-policy.md](../observability-data-policy.md)
· Deploy/rollback/restore procedures: [M17 runbook](../production/M17-PRODUCTION-RUNBOOK.md) · Incident process:
[M17 incident response](../production/M17-INCIDENT-RESPONSE.md)

## How alerts are delivered today

| Channel                                                                 | Status                                                                                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host notification: service **unhealthy** (`/health`), **deploy failed** | Available on Render (verified 2026-09-28). Enable email notifications in the Render workspace settings. Covers only [api-unavailable](api-unavailable.md).          |
| External uptime monitor on `/ready`                                     | **PENDING USER DECISION** — would cover [database-unavailable](database-unavailable.md). Must be zero-cost; not selected, not configured.                           |
| Automated log/metric alerts (error rate, latency, providers)            | **PENDING USER DECISION** — no alerting service exists on the free stack. Until then these rules are **checked by the operator** (log search, `/internal/metrics`). |

Nothing below is automated unless marked "host notification".

## Alert rules

Thresholds are starting points for a low-traffic demo; tune them with real traffic. "Sustained" = the condition
holds for the whole window, not one request.

| Alert                | Condition                                                                                        | Severity | Delivery                 | Runbook                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------ | -------- | ------------------------ | -------------------------------------------------------------------- |
| API unavailable      | `/health` fails the host's check (Render: 60 s of failures → restart + notification)             | Critical | Host notification        | [api-unavailable.md](api-unavailable.md)                             |
| Database unavailable | `/ready` 503 for ≥ 2 min, or a `readiness.lost` line without `readiness.restored` within 2 min   | Critical | PENDING monitor / manual | [database-unavailable.md](database-unavailable.md)                   |
| High error rate      | 5xx ≥ 5 % of requests (and ≥ 5 errors) over 10 min, excluding documented 503 `disabled` features | High     | Manual                   | [high-error-rate.md](high-error-rate.md)                             |
| High latency         | p95 `http_request_duration_ms` upper bound ≥ 1000 ms on a route with ≥ 20 requests, over 10 min  | Medium   | Manual                   | [high-latency.md](high-latency.md)                                   |
| Pool exhaustion      | `database.waitingRequests` > 0 on consecutive scrapes ≥ 1 min apart                              | High     | Manual                   | [database-unavailable.md](database-unavailable.md)                   |
| Gemini failures      | ≥ 3 audio provider failures and ≥ 50 % failure ratio over 15 min                                 | Medium   | Manual                   | [gemini-failure.md](gemini-failure.md)                               |
| Hyperframes failures | ≥ 2 `video.render_failed` over 30 min                                                            | Low      | Manual                   | [hyperframes-failure.md](hyperframes-failure.md)                     |
| Email failures       | any `email.delivery_failed` burst: ≥ 3 in 15 min, or every attempt failing                       | High     | Manual                   | [email-provider-failure.md](email-provider-failure.md)               |
| Auth abuse (signal)  | `auth.login_failure` or 429 `request.rejected` far above normal for 15 min                       | Medium   | Manual                   | [high-error-rate.md](high-error-rate.md#4xx-spikes-security-signals) |

Deliberately **not** alerts: a single 5xx, a single provider failure, 4xx in general, client errors
(`client.error` is reviewed, not paged), audio/video 503 while the feature is `disabled`.

## Where to look

- **Logs** (host log search; Render: text search + level filter, 7 days): search by `msg` value, e.g.
  `request.completed`, `Unhandled request error`, `readiness.lost`, `video.render_failed`, `client.error`,
  `process.uncaught_exception`; by `reqId` for one request (the `X-Request-Id` response header); by `version` for
  one release.
- **Metrics** (only if `METRICS_TOKEN` is set; per instance, reset on restart/sleep):

  ```sh
  curl -sS -H "Authorization: Bearer $METRICS_TOKEN" "$BASE/internal/metrics"
  ```

  `counters`: `http_responses_total{method,route,status}`, `provider_calls_total{provider,operation,outcome,category}`,
  `readiness_checks_total{outcome}`, `client_errors_total{kind}`. `histograms`: `http_request_duration_ms`,
  `provider_call_duration_ms` (count, sum, max, p95 upper bound, buckets). Plus `readiness`, `database` (pool
  usage, `idleConnectionErrors`), `process` (memory), `version`, `uptimeSeconds`.

- **Probes**: `curl -sS -w ' %{http_code}\n' "$BASE/health"` and `"$BASE/ready"`.

## Runbooks

[api-unavailable](api-unavailable.md) · [database-unavailable](database-unavailable.md) ·
[high-error-rate](high-error-rate.md) · [high-latency](high-latency.md) · [gemini-failure](gemini-failure.md) ·
[hyperframes-failure](hyperframes-failure.md) · [email-provider-failure](email-provider-failure.md)

Host-specific commands are written only where the host (Render, staging demo) was verified; anything else is
marked **PROVIDER-SPECIFIC** until the production host is chosen (ADR-015).
