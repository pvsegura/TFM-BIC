# M17 — Deployment Architecture

Status: ACCEPTED for the runtime/artifact design ([ADR-028](../adr/adr-028-production-runtime-and-deployment.md)); hosting target PENDING ([hosting options](M17-HOSTING-OPTIONS.md)).
Date: 2026-09-27

## Topology

```
Browser ──HTTPS──▶ Host edge (TLS termination, proxy)   ← provider PENDING
                         │  HTTP, X-Forwarded-For
                         ▼
             ┌─────────────────────────────────┐
             │ tfm-bic container (1 instance)   │   node dist/index.js, user node, NODE_ENV=production
             │  Fastify                          │
             │   ├─ SPA: /, /assets/*, deep links│   in-memory apps/web/dist, SPA security headers
             │   └─ API: /auth, /lessons, …      │   API security headers, rate limits (in memory)
             └───────┬───────────────┬──────────┘
                     │ TLS (sslmode) │ HTTPS (only when enabled)
                     ▼               ▼
             PostgreSQL (Neon)   Email provider (PENDING — blocker)
                                 Gemini TTS (disabled until ADR-013)
                                 Gemini AI Coach (M23: AI_COACH_PROVIDER)
                                 Hyperframes (disabled; unverified, no media storage)
```

Model **C** of the brief: the Node server serves the static frontend. Chosen by the user on
2026-09-27 over an nginx + API pair because one image/one process runs unchanged on any
Docker-capable host, and the host already terminates TLS.

## Environments

| Environment | Where                                    | Database                                                           | Providers                                                                    | Secrets                       |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------- |
| development | `pnpm dev` (Vite + tsx)                  | Local Docker Postgres (`infrastructure/docker/docker-compose.yml`) | fake (default)                                                               | Ephemeral per process         |
| test        | Vitest, Playwright (`start:test`), CI    | In-process PGlite                                                  | fake only (`gemini` refused)                                                 | Throwaway values              |
| staging     | The production image, `NODE_ENV=staging` | Separate database, never real user data                            | fake allowed (nothing is sent), or `disabled`                                | Host secret store, own values |
| production  | The same image, `NODE_ENV=production`    | Neon, TLS required                                                 | Real only: email real (blocker), audio `gemini`/`disabled`, video `disabled` | Host secret store             |

The image defaults to `NODE_ENV=production`; staging must be asked for explicitly. Local image
validation (`validate-image.sh`) is a throwaway staging.

## Runtime configuration

| Variable                                         | production                           | Notes                                                         |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------- |
| `NODE_ENV`                                       | `production` (image default)         |                                                               |
| `PORT`                                           | `3000` (image default)               | Or what the host injects.                                     |
| `APP_VERSION`                                    | Baked at build (`<version>+<sha12>`) | Shown by `/health`.                                           |
| `WEB_DIST_DIR`, `CONTENT_DIR`                    | Baked (`/app/web`, `/app/content`)   |                                                               |
| `DATABASE_URL`                                   | Secret; app role; `sslmode=require`+ | Loopback hosts refused.                                       |
| `AUTH_SESSION_SECRET`, `EMAIL_LINK_SECRET`       | Secrets, ≥ 32 chars                  |                                                               |
| `APP_BASE_URL`                                   | `https://<domain>`                   | Email links, Origin check. Loopback refused.                  |
| `TRUST_PROXY`                                    | Host's proxy range                   | Must come from the provider's documentation.                  |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Real provider (none exists yet)      | `fake` refused.                                               |
| `AUDIO_GENERATION_PROVIDER`                      | `disabled` (or `gemini` + key)       | `fake` refused.                                               |
| `VIDEO_GENERATION_PROVIDER`                      | `disabled`                           | `fake`, `hyperframes` refused.                                |
| `AI_COACH_PROVIDER`                              | `disabled` (or `gemini` + key)       | M23, ADR-034. `fake` refused.                                 |
| `AI_COACH_MODEL`, `GEMINI_AGENT_API_KEY`         | Optional (model default is GA)       | Own key keeps learner traffic off the media pipeline's quota. |

`pnpm --filter @tfm-bic/config`'s `loadEnv` validates all of it at start-up and lists every problem
at once without printing values. There are no frontend (`VITE_*`) variables: the SPA calls its own
origin, so no API URL, key or secret can end up in the bundle.

## Start-up (production)

1. `loadEnv()` — invalid configuration: the process exits with the list of problems.
2. Compositions are built (content is loaded and validated from `CONTENT_DIR`; the SPA is read from
   `WEB_DIST_DIR` — missing `index.html` exits).
3. The database must answer `SELECT 1`: 6 attempts, 1→2→4→8→10 s backoff (≈ 25 s), then exit 1.
4. The server listens; `server.started` is logged with version and start-up time.
5. `/ready` turns 200 when the database answers (checked per request, 2 s timeout).

Migrations are **not** run by the application (see below).

## Health checks

| Probe     | Path      | Meaning                                                                                  | Use for                                   |
| --------- | --------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| Liveness  | `/health` | The process answers. Never touches the database or a provider. Reports `version`.        | Restart decisions (Docker `HEALTHCHECK`). |
| Readiness | `/ready`  | The database answers `SELECT 1` within 2 s. 503 `{ready:false}`, reason never disclosed. | Routing traffic, deployment success gate. |

Providers are deliberately **not** in readiness: an email or Gemini outage must not take the whole
application out of rotation; those failures are handled per request (safe 503/502 messages).

## Shutdown

SIGTERM/SIGINT → Fastify stops accepting connections and answers 503 while closing → in-flight
requests finish → the shared pool is closed → exit 0 (exit 1 if anything failed). Idempotent; a hard
8 s limit forces exit 1 — below Docker's 10 s default grace period. Measured: 0.68 s.

## Database

- One shared `pg` pool per process: `max` 10, connect timeout 5 s, idle timeout 30 s, statement
  timeout 15 s; idle-connection errors are logged (SQLSTATE only) and never crash the process.
- Budget: instances × 10 + migrator + operators must stay under the plan's connection limit. Use the
  provider's pooled endpoint if one exists (Neon's connection limits were not verified in M17).
- Roles (verified with `validate-image.sh`):
  - **migrator** — owns the `public` schema and can `CREATE` in the database (for the `drizzle`
    tracking schema). Used only by the migration step.
  - **app** — `CONNECT`, `USAGE` on `public`, `SELECT/INSERT/UPDATE/DELETE` on tables and
    `USAGE/SELECT` on sequences via default privileges. Not a superuser, owns nothing, no DDL.
  - Neither role is a superuser; the provider's owner/admin role is used only to create them.

```sql
-- once, as the provider's admin role
CREATE ROLE tfm_migrator LOGIN PASSWORD '…';
CREATE ROLE tfm_app LOGIN PASSWORD '…';
GRANT CONNECT, CREATE ON DATABASE tfm_bic TO tfm_migrator;
GRANT CONNECT ON DATABASE tfm_bic TO tfm_app;
ALTER SCHEMA public OWNER TO tfm_migrator;
GRANT USAGE ON SCHEMA public TO tfm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tfm_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tfm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tfm_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO tfm_app;
```

## Migrations

`node dist/migrate.js --migrations-root /app/migrations` (in the image) or `pnpm db:migrate`
(repository), with the **migrator** role's `DATABASE_URL`:

- Applies the ten context sets in a fixed order (Identity first); each set is one transaction.
- Takes a Postgres advisory lock (30 × 2 s bounded wait) — concurrent runs wait, then find nothing to
  do. Jenkins also uses `disableConcurrentBuilds()`.
- `lock_timeout = 15s`: DDL never queues the live API behind it indefinitely.
- Tracking tables are the ones drizzle-kit always used → databases migrated before M17 are compatible.
- No migration in the repository is destructive (checked: no `DROP`/`TRUNCATE`/`DELETE`).

### Deployment order

1. Build once → validate → (push) the image `tfm-bic:<sha12>`.
2. **Run migrations with the new image** (one-off container/release command).
3. Replace the running container with the new image (recreate).
4. Wait for `/ready` = 200 (timeout, e.g. 60 s), then run the smoke test.
5. On failure: roll back the application (previous image tag). See [runbook](M17-PRODUCTION-RUNBOOK.md#rollback).

Because step 2 precedes step 3, **every migration must be backward compatible with the running
(previous) version** — expand/contract:

- Additive changes (new table, nullable column, new index) ship in release N.
- Code that stops using a column ships in N; the column is dropped in N+1 or later, never together.
- Renames = add new + backfill + switch + drop later.
- A destructive or data-rewriting migration needs a backup/branch taken immediately before, a
  review, and is never part of an automatic deploy.

### Migration naming and rollback limits

- Files are generated by `drizzle-kit generate` (per context, `NNNN_<name>.sql` + `meta/_journal.json`);
  order within a set is the journal's; order across sets is `MIGRATION_SETS`. A guard test fails
  if a context's folder is not in the list or its tracking table disagrees with its drizzle config.
- There are **no down migrations**. Database rollback = restore/branch from backup
  ([backup and recovery](M17-BACKUP-AND-RECOVERY.md)), which loses writes made after the restore
  point. Application rollback is independent and safe as long as the rule above held.

## Content

Course content (`content/`) is **bundled in the image** and validated at build time
(`pnpm content:validate`) and again at start-up. It is never written to the database, so a deploy
can never overwrite user data or progress; user progress references content by permanent ids.
There is no seed step: no development or test fixture can reach production (test fixtures live
only in the PGlite test composition, which the production bundle excludes and the build checks).

## Scaling

- **Single instance.** Stateless for sessions (stored in Postgres), but **stateful** for: rate-limit
  counters, the audio cache, and in-process video jobs (all in memory). Two instances would each
  allow the full rate limit and could not see each other's video jobs.
- Multi-instance would first need a shared rate-limit store and durable background work — not in M17.

## Deployment strategy

**Single-instance recreate**: stop N, start N+1. Simple, no dual-version window for the in-memory
state — at the cost of a short outage per release. **No zero-downtime claim** is made; a rolling or
blue/green strategy depends on the chosen host's capabilities.

## Artifact promotion and versioning

- Build once: Jenkins builds `tfm-bic:<first 12 hex of the commit>`; the same image is validated,
  then (once a registry exists) pushed and deployed to staging and later production. Never rebuilt
  per environment, never `latest`.
- `APP_VERSION = <package.json version>+<sha12>` (semver build metadata), shown by `/health`.
- Traceability: `release-candidate.json` (archived by Jenkins) records commit, version, image tag,
  image id and the migration files included; OCI labels carry version and revision.

## Proxy trust, HTTPS, headers, CORS

- `TRUST_PROXY` must name the host's proxy range (from its documentation — not verified for any
  provider yet). Leaving it empty is safe but makes all clients share one per-IP rate-limit bucket.
- HTTPS and certificates belong to the host (automatic TLS on the managed options). The app sends
  HSTS (`max-age=31536000; includeSubDomains`, no preload) in staging/production; the host should
  redirect HTTP→HTTPS (verify per provider).
- SPA responses carry the M16 SPA headers (single source: `@tfm-bic/contracts/web-security-headers`),
  API responses the API headers. No exceptions were needed.
- CORS: **none configured** — the app is same-origin, so no `Access-Control-Allow-*` header is ever
  sent and browsers deny cross-origin reads. State-changing requests from another Origin get 403.

## Network

| Endpoint            | Exposure                                                 |
| ------------------- | -------------------------------------------------------- |
| App (443 via host)  | Public                                                   |
| Container port 3000 | Only to the host's proxy                                 |
| Postgres            | Provider-managed, TLS; restrict by IP if the plan allows |
| Email/Gemini APIs   | Outbound HTTPS only                                      |

## Logging

Pino JSON lines on stdout: `level` (numeric), `time` (epoch ms), `reqId` (random UUID, also the
`X-Request-Id` response header), request method/URL **without query string**, status and response
time. Cookies, authorization and `set-cookie` are redacted; errors go through an allowlisting
serializer; bound SQL parameters are scrubbed (M15/M16). Log retention is whatever the host provides
(not verified for any provider). No error-tracking service (M18).

## Scheduled and background jobs

None scheduled. Video generation (when enabled) is an in-process, non-durable task; no worker is
deployed, and production keeps video `disabled`.
