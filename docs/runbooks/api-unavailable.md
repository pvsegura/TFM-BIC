# Runbook: API unavailable

Alert: the host's `/health` check fails (Render: traffic stopped after 15 s, restart after 60 s, notification). Critical.

## 1. Symptoms

Site or API does not answer, or answers the host's own error page; host notification "service unhealthy";
users cannot load the SPA (the API serves it — ADR-028).

## 2. Possible causes

Process crashed or crash-looping (fatal error, bad configuration after a deploy) · start-up giving up because the
database is unreachable (`database.unreachable_giving_up`, exit 1) · out of memory · failed deploy · host outage ·
free instance still waking from sleep (Render Free: first request after idle takes longer).

## 3. First checks

1. `curl -sS -w ' %{http_code}\n' "$BASE/health"` — note the `version` if it answers.
2. Host dashboard: latest deploy status and time; did it start right after a deploy?
3. Host status page for an outage.

## 4. Logs / metrics to inspect

`process.uncaught_exception`, `process.unhandled_rejection`, `Invalid environment configuration:` (printed to stderr
before the logger exists — it names variables, never values),
`database.unreachable_at_startup` / `database.unreachable_giving_up`, `shutdown.*`, `server.started` (with `version`
and `startupMs`). If it answers intermittently: `/internal/metrics` → `process.rssBytes`, `uptimeSeconds` (resets =
restarts).

## 5. Safe mitigation

- Crash after a deploy → roll back to the previous image ([M17 runbook: Rollback](../production/M17-PRODUCTION-RUNBOOK.md#rollback)).
- Start-up refuses configuration → fix the variable in the host's settings (the error names the variable, never its value).
- Database unreachable at start-up → [database-unavailable.md](database-unavailable.md).
- Memory growth → restart (**PROVIDER-SPECIFIC**; Render: manual restart/redeploy from the dashboard) and open an issue with the memory trend.

## 6. Rollback considerations

Rolling back the image is safe only if the database schema is still compatible (migrations are additive — check
the M17 rollback section before rolling back across a migration).

## 7. Escalation

Project owner (sole operator). Host outage: host support/status page. Record the incident (M17 incident response).

## 8. Recovery verification

`/health` 200 with the expected `version`; `/ready` 200; `server.started` logged once; the public smoke test
(`infrastructure/deployment/smoke-test.mjs`) passes; no new `process.*` lines for 15 min.
