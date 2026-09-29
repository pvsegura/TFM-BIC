# Runbook: High error rate

Alert: 5xx ≥ 5 % of requests (and ≥ 5 errors) over 10 min. High. Operator-checked (see [catalogue](README.md)).

## 1. Symptoms

Users see "Something went wrong" / generic errors; `request.completed` lines with `statusCode` ≥ 500; many
`Unhandled request error` lines.

## 2. Possible causes

A bad release · database trouble (see [database-unavailable](database-unavailable.md)) · a provider failing through a
route (audio 502/503) · a content/configuration error affecting one route · load beyond one small instance.

## 3. First checks

1. Which routes? Group `request.completed` with `statusCode` ≥ 500 by `route`, or `/internal/metrics` →
   `http_responses_total` by `route`/`status`.
2. Which release? The `version` field — did it start with a deploy?
3. `/ready` — is the database involved?

## 4. Logs / metrics to inspect

`Unhandled request error` (`err.type`, `err.code`, redacted message/stack) — open one by `reqId` to see every line
of that request. `provider_calls_total` failures by `category`. `client.error` lines (SPA side of the same breakage).

## 5. Safe mitigation

Release-related → roll back. Provider-related → switch the feature to `disabled` (audio/video) with the provider
variable and redeploy — users get a clear 503 instead of failures. One route/content item → fix forward.

## 6. Rollback considerations

See [M17 runbook: Rollback](../production/M17-PRODUCTION-RUNBOOK.md#rollback); mind migrations.

## 7. Escalation

Project owner. A security cause (see below) → M17 incident response.

## 8. Recovery verification

5xx back to baseline for 30 min; no new `Unhandled request error` for the route.

## 4xx spikes (security signals)

Not an outage, but worth a look: many `auth.login_failure` lines, `request.rejected` with `statusCode` 429 (rate
limits hit), 401/403 on `http_responses_total` far above normal. Check whether one address dominates
(`remoteAddress` on `request.completed`). The rate limits (M16) already block; escalate as a security incident only
if an account or data may be affected. Do not copy IPs out of the log store except into the incident record.
