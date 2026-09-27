# M17 — Backup and Recovery

Date: 2026-09-27 · Database: Neon (ADR-005) — **not provisioned yet**, so no production backup exists.

## What must be backed up

| Data                                                                                                       | Where                                                            | Backup                                                                                    |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Users, sessions, progress, attempts, points, vocabulary/phonetics state, teacher links, newsletter consent | PostgreSQL                                                       | Provider restore window + logical `pg_dump` (below)                                       |
| Course content                                                                                             | Git (`content/`), in the image                                   | Git history; every image contains the content it was built with                           |
| Application                                                                                                | Git + images tagged by commit                                    | Rebuildable from any commit                                                               |
| Generated media                                                                                            | None (video/audio disabled in production; audio is never stored) | —                                                                                         |
| Secrets                                                                                                    | Host secret store / Jenkins                                      | Not backed up by us; recreated by rotation if lost ([secrets](M17-SECRETS-MANAGEMENT.md)) |

## Provider capability (verified on neon.com, 2026-09-27)

| Plan   | Point-in-time restore window   | Scheduled backups                             |
| ------ | ------------------------------ | --------------------------------------------- |
| Free   | **6 hours** (up to 1 GB-month) | Not available                                 |
| Launch | Up to 7 days                   | Automated schedules; snapshots $0.09/GB-month |

Encryption at rest, backup location and exact retention mechanics were not verified in M17 — check
the provider's documentation when the project is created.

**Risk (free tier):** a 6-hour window means a problem noticed the next day (bad migration, bulk
deletion, application bug) is **not recoverable from the provider alone**. With the free stack the
logical dumps below are the real backup.

## Logical backups (provider-independent)

`pg_dump --format=custom --no-owner --no-privileges` run from a `postgres:17` client container
(the client must be ≥ the server's major version). Store the file **outside** the database provider,
encrypted, with access limited to the database owner. Frequency and retention are PENDING the RPO
decision; a daily dump kept 14–30 days is a reasonable starting proposal, not a requirement.

Scheduling (Jenkins timer job, operator cron) and the storage location are **not implemented** —
they depend on the hosting/storage decision. Until then a dump before every production migration is
the minimum (runbook).

## Restore procedure

Never restore over production in place. Restore into a **new** database/branch, validate, then switch.

1. Create an empty target (Neon: a branch from a point in time, or a new database; locally: a container).
2. Restore: `pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET_URL" tfm_bic.dump`
   (for a Neon point-in-time branch this step is not needed).
3. Re-apply role grants (the dump carries no owners/privileges): run the SQL in
   [deployment architecture — Database](M17-DEPLOYMENT-ARCHITECTURE.md#database), then
   `ALTER TABLE … OWNER TO tfm_migrator` for restored tables if they were created by the admin role.
4. Run migrations with the image that will serve it (brings an older dump up to the current schema).
5. Validate: row counts, `/ready`, the smoke test against a container pointed at the target.
6. Switch `DATABASE_URL` to the target and restart.

## Restore test — performed

`infrastructure/deployment/restore-drill.sh tfm-bic:0e2802cfd133` on 2026-09-27:

| Step       | Result                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | Throwaway Postgres 17, migrated with the image, filled through the app (user, session, lesson progress, verification token)                                      |
| Backup     | `pg_dump` custom format: 60 KB in 3 s                                                                                                                            |
| Restore    | Into a new empty Postgres 17: 2 s                                                                                                                                |
| Validation | Row counts of **every** table identical (incl. `drizzle.*` migration history); the image started on the restored copy, `/ready` 200, the drill account logged in |
| Result     | **PASSED**                                                                                                                                                       |

Restore from the **real** provider (Neon point-in-time/branch) — **PENDING — REQUIRES PROVIDER/ENVIRONMENT**.
Run the drill with `SOURCE_DATABASE_URL=<read-only staging URL>` once staging exists, and repeat it
periodically (proposal: quarterly and after any backup change).

## RPO / RTO

| Objective                          | Value                        |
| ---------------------------------- | ---------------------------- |
| RPO (maximum acceptable data loss) | **PENDING PRODUCT DECISION** |
| RTO (maximum acceptable downtime)  | **PENDING PRODUCT DECISION** |

Technical capability that actually exists today:

- Data loss bound by the provider window (6 h Free / 7 days Launch) or the age of the last logical dump.
- Restore of a small database took seconds in the drill; production time depends on size and
  provider and has **not** been measured.
- Application redeploy of an existing image: container start ~0.5 s + database wait; a rollback drill
  on a laptop took 86 s end to end including a 30 s readiness timeout. These are observations, not
  commitments.

Questions for the product owner: How much student progress may be lost (an hour, a day)? How long may
the platform be unavailable during term time? Is a paid database plan acceptable to meet that?
