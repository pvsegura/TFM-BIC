# Runbook: Database unavailable / pool exhaustion

Alerts: `/ready` 503 sustained ≥ 2 min or `readiness.lost` without `readiness.restored`; pool `waitingRequests` > 0
sustained. Critical / High. **Not a host notification today** (the host checks `/health`) — see the
[catalogue](README.md).

## 1. Symptoms

`/ready` 503 `{ ready: false }`; pages that need data fail (500/503) while `/health` stays 200; slow responses
followed by errors (requests waiting for a connection, 5 s connect timeout).

## 2. Possible causes

Neon compute suspended and slow to wake (scale-to-zero) · Neon outage or plan limit (compute hours, connections) ·
credentials rotated or role changed (`28P01`) · TLS/host change (`ENOTFOUND`, certificate codes) · all 10 pool
connections busy with slow statements (15 s statement timeout) · network between host and database.

## 3. First checks

1. `curl -sS -w ' %{http_code}\n' "$BASE/ready"`.
2. The reason code on the last `readiness.lost` line (`reason`: SQLSTATE such as `28P01`, `57P01`, `53300`, or
   `ENOTFOUND`, `ECONNREFUSED`, `timeout`).
3. Database provider console (Neon): compute state, usage limits, status page.

## 4. Logs / metrics to inspect

`readiness.lost` / `readiness.restored` (times bound the outage) · `database.idle_connection_lost` (with SQLSTATE) ·
`Unhandled request error` with `err.code` · `/internal/metrics` → `database.totalConnections`, `idleConnections`,
`waitingRequests`, `idleConnectionErrors`, `readiness`, and `http_request_duration_ms` for data routes.

## 5. Safe mitigation

- Authentication code (`28P01`) → fix `DATABASE_URL` in the host's secret store; restart.
- Provider outage/limit → wait / raise the limit; nothing in the app to change. The app recovers by itself:
  `pg` opens new connections on the next query.
- Pool exhaustion → find the slow route in `http_request_duration_ms`; restart only to shed stuck requests. Do
  **not** raise `max` above what the database plan allows (M17 pool budget).

## 6. Rollback considerations

If it began with a deploy that ran a migration, check the migration's effect before rolling back the image;
never roll back the schema by hand — follow [M17 runbook](../production/M17-PRODUCTION-RUNBOOK.md#rollback) and, for
data loss, [Database restore](../production/M17-PRODUCTION-RUNBOOK.md#database-restore).

## 7. Escalation

Project owner → database provider support. Data loss suspected: M17 disaster recovery.

## 8. Recovery verification

`readiness.restored` logged; `/ready` 200 on several checks; `waitingRequests` 0; a data page loads; error rate back to normal.
