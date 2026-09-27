# M17 — Disaster Recovery

Date: 2026-09-27 · Recovery times are **not** stated: RTO/RPO are PENDING PRODUCT DECISION and no
production environment exists to measure. Commands: [runbook](M17-PRODUCTION-RUNBOOK.md).

| Scenario                              | Detection                                                                            | Recovery                                                                                                                                                                                  | Limitations                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Application process crash             | Liveness `/health` fails; container exits; host restarts it                          | Automatic restart by the host (Docker `HEALTHCHECK` / platform policy). If it crash-loops: check logs, roll back to the previous image.                                                   | Automatic restart depends on the chosen host.                                                          |
| Bad release (errors after deploy)     | Smoke test fails; error lines; users report (use `X-Request-Id`)                     | Roll back to the previous image tag (no rebuild).                                                                                                                                         | Only if the release's migrations were backward compatible (the rule — review enforced, not automatic). |
| Failed migration                      | `migrations.failed`, exit 1 in the deploy step                                       | Do not start the new version (the old one keeps running on the unchanged schema for the failed set). Fix forward, or restore.                                                             | Sets applied before the failure stay applied; no down migrations.                                      |
| Database unavailable                  | `/ready` 503; `database.idle_connection_lost` / request errors; provider status page | Nothing to do in the app: it keeps running, `/ready` recovers on its own (verified). If the provider is down long, communicate; if the database is lost, restore.                         | Every request that needs data fails meanwhile.                                                         |
| Data corruption / accidental deletion | User reports, row counts, application errors                                         | Restore to a new branch/database from before the event, validate, switch `DATABASE_URL`.                                                                                                  | Neon Free: only 6 h back; beyond that only logical dumps. Writes after the restore point are lost.     |
| Loss of the hosting account/project   | Everything down                                                                      | New project on the same or another Docker host: same image from the registry (or rebuild from Git at the release commit), same env vars, secrets re-created, DNS/URL updated, smoke test. | Secrets must be regenerated if not recoverable (sessions invalidated). Registry is PENDING.            |
| Loss of the database provider account | —                                                                                    | New Postgres (any provider), create roles, restore the latest logical dump, migrate, point the app at it.                                                                                 | Only as recent as the last off-provider dump.                                                          |
| Provider outage: email                | `email.delivery_failed` logs                                                         | Wait/communicate; users can retry verification/reset later.                                                                                                                               | No queue: failed sends are not retried automatically.                                                  |
| Provider outage: Gemini (if enabled)  | 503 from `/audio-generations`, `provider_unavailable` logs                           | Nothing required; optionally set `AUDIO_GENERATION_PROVIDER=disabled`.                                                                                                                    | —                                                                                                      |
| Credential leak                       | Secret scan, provider alert, unexpected usage/cost                                   | [Incident response](M17-INCIDENT-RESPONSE.md#credential-compromise): rotate, redeploy, revoke, review logs.                                                                               | Session secret rotation logs everyone out.                                                             |
| Domain/DNS problem                    | Site unreachable by name while the host URL works                                    | Fix records at the registrar/DNS provider (manual, never automated). Keep `APP_BASE_URL` = the public origin; changing it changes email links and the Origin check.                       | DNS propagation delay; no custom domain exists yet.                                                    |
| Jenkins controller lost               | No builds                                                                            | Rebuild from `infrastructure/jenkins/`; re-create credentials. Deploying can be done manually with the runbook commands meanwhile.                                                        | Credentials must be re-entered.                                                                        |

## Application vs database recovery

Application recovery (redeploy/rollback an image) is fast and loses nothing. Database recovery
(restore) loses writes after the restore point and must be a deliberate decision by the database
owner. They are handled separately.

## Media

No user media exists in production (audio is generated on demand and never stored; video is
disabled). If video is enabled in future, persistent storage and its backup must be designed first.

## Regular exercises (proposed)

- Restore drill (`restore-drill.sh`) quarterly and after any backup change — once against real staging.
- Rollback drill on staging before the first production release.
