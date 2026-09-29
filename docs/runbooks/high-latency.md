# Runbook: High latency

Alert: p95 upper bound of `http_request_duration_ms` ≥ 1000 ms on a route with ≥ 20 requests, over 10 min. Medium.
Operator-checked.

## 1. Symptoms

Slow pages; `durationMs` high on `request.completed`; users report spinners.

## 2. Possible causes

Database cold start (Neon scale-to-zero) or slow queries · pool waits · a slow provider (audio is synchronous and
can take seconds by design — judge it against its own normal) · CPU/memory limits of a free instance · the instance
waking from sleep (first request only).

## 3. First checks

1. Which route? `/internal/metrics` → `http_request_duration_ms` by `route` (`p95UpperBoundMs`, `maxMs`), or log
   search on `route` + `durationMs`.
2. Is it all routes (instance/database) or one (its query/provider)?
3. Did a release or a traffic change coincide (`version`, request count)?

## 4. Logs / metrics to inspect

`database.waitingRequests`; `provider_call_duration_ms`; `process.rssBytes`; `readiness` flapping.

## 5. Safe mitigation

One-off cold start: none needed. Pool waits: see [database-unavailable](database-unavailable.md). A provider: set its
feature to `disabled` if it makes the app unusable. Instance limits: restart (short relief) and record it — a
bigger plan is a cost decision for the owner.

## 6. Rollback considerations

Roll back only if a release introduced it (compare `version` with when latency rose).

## 7. Escalation

Project owner; database/host provider if their status shows degradation.

## 8. Recovery verification

p95 bound back under 1000 ms on the route for 30 min (metrics reset on restart — compare using logs).
