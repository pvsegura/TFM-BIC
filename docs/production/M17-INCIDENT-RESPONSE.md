# M17 — Incident Response (lightweight)

Date: 2026-09-27 · For a small team; not an enterprise process. Roles: **incident lead** (the person
who noticed or is on duty) and **database owner** (the only one who restores or touches roles).
Commands: [runbook](M17-PRODUCTION-RUNBOOK.md).

## Every incident

1. **Confirm**: `/health`, `/ready`, smoke test, recent logs (`reqId` from the user's `X-Request-Id`).
2. **Stabilise before diagnosing**: roll back, disable a feature, or stop the service.
3. **Write down** a timeline (UTC times, actions, no secret values) as you go.
4. **Communicate** to users if they are affected.
5. **Afterwards**: short review — cause, fix, what to change (test, check, doc).

## Application outage

- `/health` fails → the process is down or hung: restart; if it crash-loops, roll back to the previous image.
- `/health` ok, `/ready` 503 → the database is unreachable: go to _Database outage_.
- Both ok but users see errors → check `Unhandled request error` logs for the `reqId`; roll back if it started with a release.

## Database outage

- Check the provider's status page and plan limits (Neon Free suspends compute when CU-hours run out).
- The application recovers by itself when the database returns (verified in M17); no restart needed.
- Data loss suspected → stop writes (emergency shutdown), then the database owner restores to a new
  branch/database ([backup and recovery](M17-BACKUP-AND-RECOVERY.md)).

## Credential compromise

1. Identify which secret ([inventory](M17-SECRETS-MANAGEMENT.md#inventory)).
2. Rotate it immediately and redeploy; then revoke the old value at the provider.
3. Database password: `ALTER ROLE … PASSWORD` + update + restart; review `pg_stat_activity`.
4. Session secret: rotating logs every user out — accept it when compromise is plausible.
5. Review logs for use of the credential; check provider usage/billing (Gemini, email).
6. If personal data may have been accessed: this is a potential personal-data breach — escalate to the
   data controller without delay (the controller identity is still PENDING, M15); do not decide
   notification obligations alone.

## Provider outage (email, Gemini)

- Email down: verification/reset emails fail (`email.delivery_failed`); inform users, retry later.
- Gemini down or too expensive: `AUDIO_GENERATION_PROVIDER=disabled`, restart.

## Deployment failure

- Migration failed → do not start the new version; old version keeps running. Fix forward or restore.
- New version not ready / smoke failing → roll back to the previous image tag.
- Pipeline failed before deploy → nothing reached users; fix and rebuild.

## Suspected security incident

1. Preserve evidence: export logs for the time window before they rotate (retention is host-defined).
2. Contain: emergency shutdown, or disable the affected feature/route by rolling back.
3. Rotate every secret the affected component could read.
4. Check M16 controls still hold (headers, rate limits, route inventory test).
5. Personal data possibly affected → escalate as in _Credential compromise_ step 6.
6. Fix, add a regression test, redeploy through the normal pipeline — no hot patches in the container.
