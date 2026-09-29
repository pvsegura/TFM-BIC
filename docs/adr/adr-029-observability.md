# ADR-029: Observability — structured logs as the record, in-process metrics, no vendor

Status: ACCEPTED (M18) / PENDING USER DECISION: external uptime monitor, alert channel beyond the host, metrics scraper
Date: 2026-09-29

## Context

M17 left structured Pino logs, `/health`, `/ready` and a random `X-Request-Id` (M16), and listed "no error
tracking or metrics" as a risk. The only deployment is the staging demo on Render Free + Neon Free
(ADR-028, M17). What that host offers was verified on 2026-09-28 (render.com/docs): logs searchable by
text/level and kept **7 days** on the Hobby workspace, **no log streams** on this plan, health checks on a
configured path (stop routing after 15 s of failures, restart after 60 s), and email/Slack notifications when
a service becomes unhealthy or a deploy fails. Render Free instances sleep after 15 minutes idle, so
in-memory state resets often. Zero cost is a hard project requirement (M17).

Audit: [docs/m18-observability-audit.md](../m18-observability-audit.md).

## Decision

1. **Stdout JSON logs are the durable record.** Every line has `service`, `env`, `version` (from
   `APP_VERSION`), ISO `time`, a level label and, inside a request, `reqId`. One `request.completed` line per
   request with the **route template**, status and duration (successful probes at `debug`). `LOG_LEVEL`
   (default `info`); production refuses `debug`.
2. **Redaction stays central** in `logger-options.ts`: headers, cookies, secret-named fields
   (`password`, `token`, `apiKey`, `secret`, …) at the top level and one level down, query strings, SQL
   parameters. Tests assert secrets never reach a line.
3. **Correlation reuses M16's `X-Request-Id`**: server-generated UUID, returned on every response, never
   taken from the client (a client id could forge correlation). No second system.
4. **Metrics are in-process** (`MetricsRegistry`: counters + fixed-bucket histograms, label sets capped per
   metric) and read on demand from `GET /internal/metrics`, which exists only when `METRICS_TOKEN` is set.
   No push, no timers, no network calls per request. Values reset on restart — the logs carry the history.
5. **Providers are instrumented by decorators** in the API composition layer (Gemini audio, Hyperframes
   video, email). Domain and application layers know nothing about logging or metrics.
6. **Readiness transitions** are logged (`readiness.lost` with a safe reason code / `readiness.restored`).
7. **Fatal process errors** go through the logger (`fatal`), then the M17 bounded shutdown.
8. **Frontend errors** are reported same-origin to `POST /client-errors` (kind, class name, path — nothing
   else) from a route error boundary and global listeners. No third-party error tracker.
9. **Alerting** uses what exists at zero cost: the host's health-check notifications (unhealthy / deploy
   failed). Log- and metric-based alerts are defined as rules in [docs/runbooks/](../runbooks/README.md) to be
   checked by an operator until an alerting channel is chosen (**PENDING USER DECISION**).

## Options considered

| Option                                    | Why not (now)                                                                                                                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sentry / hosted error tracker (web + API) | New data processor and international transfer to assess under M15; source-map/release setup; the same-origin report covers "did the SPA break, where" for an MVP. Revisit if frontend errors need stacks to diagnose. |
| Prometheus + Grafana                      | Needs a server to run and scrape; nothing on the free stack can. The JSON endpoint keeps the data scrapeable later (a small adapter to the text format).                                                              |
| OpenTelemetry SDK + collector             | Tracing across one process and one database adds dependencies and a collector to host for little gain. The request id already correlates a request's lines.                                                           |
| Log shipping to a hosted log service      | Render log streams are not available on this plan; a hosted log service is another processor. Revisit with the production host.                                                                                       |
| Accept a client `X-Request-Id`            | Forgeable correlation (M16 decision kept). If a trusted proxy adds its own id later, log it as a separate field.                                                                                                      |
| Periodic metrics snapshot to the log      | Needs a timer; the per-request line already makes the log a time series. Revisit if the metrics endpoint is not scraped.                                                                                              |

## Consequences

- Operators answer "is it up / failing / slow / which release" from the host's log search (`msg`, `route`,
  `statusCode`, `durationMs`, `version`, `reqId`) and, when configured, `/internal/metrics`.
- Metrics are per instance and short-lived (sleep/restart). Rates over time come from logs. With more than one
  instance, each has its own numbers (same limitation as the rate limits, ADR-027).
- Log volume: one line per request instead of two; probes silent when healthy.
- Nothing new leaves the process except the log stream the host already had.
- A user-supplied error message or stack is never collected from the browser; a hard-to-reproduce frontend bug
  needs the class name + path + time to be reproduced, not read from a report.

## References

- [docs/observability-data-policy.md](../observability-data-policy.md) · [docs/runbooks/](../runbooks/README.md)
- ADR-026 (privacy logging), ADR-027 (request id, error bodies), ADR-028 (runtime, probes)
- Render docs, verified 2026-09-28: `render.com/docs/logging`, `/health-checks`, `/notifications`
