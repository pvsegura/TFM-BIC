# M17 — Production Runbook

Date: 2026-09-27 · Every command here exists in the repository and was run during M17, unless it is
marked **PROVIDER-SPECIFIC** (hosting is PENDING: those steps are done in the chosen platform's
console/CLI, and are filled in once it is selected). Never paste real secrets into a shell history
you share; export them from your password manager in the current shell only.

Conventions: `IMAGE=tfm-bic:<sha12>`, `BASE=https://<public-origin>`. On Windows Git Bash prefix
`docker` commands that pass container paths with `MSYS_NO_PATHCONV=1` (otherwise `/app/...` is
rewritten to a Windows path — seen in M17).

## Build and validate an image

```sh
SHA=$(git rev-parse --short=12 HEAD)
docker build -f infrastructure/docker/app.Dockerfile \
  --build-arg APP_VERSION="0.1.0+$SHA" --build-arg GIT_COMMIT="$(git rev-parse HEAD)" \
  -t tfm-bic:$SHA .
infrastructure/docker/validate-image.sh tfm-bic:$SHA "0.1.0+$SHA"     # must end with IMAGE VALID
```

Jenkins does the same (stages Build Image → Validate Image → Record Release Candidate).

## Pre-deployment checklist

- [ ] Jenkins build of the commit is green (tests, coverage, E2E, audit, secret scan, SonarQube gate, image validation).
- [ ] New migrations reviewed: additive/backward compatible? any destructive statement? (`git diff <deployed-sha>..<new-sha> -- packages/data/src/*/db/migrations`)
- [ ] Backup taken just before migrating (below) — or a provider branch/restore point noted.
- [ ] The previous image tag is known (for rollback).

## Migrate

With the **migrator** role (never the app role):

```sh
export DATABASE_URL='postgres://tfm_migrator:…@<host>/tfm_bic?sslmode=require'
docker run --rm -e DATABASE_URL "$IMAGE" node dist/migrate.js --migrations-root /app/migrations
# or, from a checkout: pnpm db:migrate
```

Expected: one `migrations.set_up_to_date` per set and `migrations.completed`; exit code 0. A
`migrations.lock_busy` line means another run is in progress — it waits up to ~60 s, then fails
without applying anything.

On failure: sets before the failing one stay applied (each is its own transaction); the failing set
is rolled back. Do **not** deploy the new version. Fix forward with a new migration, or restore
(see [backup and recovery](M17-BACKUP-AND-RECOVERY.md)).

## Deploy (single-instance recreate)

1. Migrate (above) with the new image.
2. **PROVIDER-SPECIFIC:** deploy `IMAGE` (or the commit) replacing the running instance; the platform
   must send SIGTERM and wait ≥ 10 s.
3. Wait for readiness and run the smoke test (read-only in production):

```sh
curl -fsS "$BASE/health"      # {"status":"ok",…,"version":"0.1.0+<sha12>"}
curl -fsS "$BASE/ready"       # {"ready":true}
SMOKE_BASE_URL="$BASE" SMOKE_EXPECTED_VERSION="0.1.0+<sha12>" \
  SMOKE_EMAIL="$SMOKE_EMAIL" SMOKE_PASSWORD="$SMOKE_PASSWORD" \
  node infrastructure/deployment/smoke-test.mjs
```

"Container started" is not success: success = `/ready` 200 **and** the smoke test passes **and** the
logs show `server.started` with the expected version and no error lines. Never set
`SMOKE_REGISTER` or `SMOKE_ALLOW_WRITES` against production.

## Rollback

Application rollback = deploy the **previous image tag** (it is immutable; nothing is rebuilt).
Safe because every migration is backward compatible with the previous version (expand/contract).
The database is **not** rolled back; if a migration itself must be undone, that is a restore
(data written after the restore point is lost) — a separate, deliberate decision.

Drill performed on 2026-09-27 (throwaway staging on the laptop, generic Docker commands a VPS
would use):

```sh
docker rename app app-previous && docker stop app-previous      # stop version N
docker run -d --name app … tfm-bic:<N+1>                        # start N+1
# N+1 never became ready (exited 1: "WEB_DIST_DIR has no index.html")
docker rm -f app && docker rename app-previous app && docker start app   # restore N
```

Result: N passed 8/8 smoke checks before and after; total disruption 86 s (30 s readiness timeout

- laptop overhead). On a managed platform the equivalent is **PROVIDER-SPECIFIC** ("redeploy
  previous deployment"/image tag) — verify the provider supports it before choosing it.

## Health, readiness, logs

```sh
curl -sS -w ' %{http_code}\n' "$BASE/health"
curl -sS -w ' %{http_code}\n' "$BASE/ready"       # 503 = the database does not answer
docker logs --since 15m <container>             # PROVIDER-SPECIFIC on a managed platform
```

Useful log messages: `server.started`, `database.unreachable_at_startup`,
`database.unreachable_giving_up`, `database.idle_connection_lost`, `shutdown.started|completed|timed_out`,
`request.rejected`, `Unhandled request error`, `email.delivery_failed`. Correlate a user report with
the `X-Request-Id` response header (`reqId` in logs).

## Restart

**PROVIDER-SPECIFIC** restart, or `docker restart -t 10 <container>`. Expected: `shutdown.completed`
(exit 0) then `server.started`.

## Database restore

Follow [backup and recovery — restore procedure](M17-BACKUP-AND-RECOVERY.md#restore-procedure).
Take a dump before any risky operation:

```sh
docker run --rm -e SRC_URL -v tfm-backups:/backup postgres:17-bookworm \
  sh -c 'pg_dump --format=custom --no-owner --no-privileges --dbname="$SRC_URL" --file=/backup/tfm_bic-$(date +%Y%m%dT%H%M).dump'
```

Practice: `infrastructure/deployment/restore-drill.sh "$IMAGE"` (optionally with
`SOURCE_DATABASE_URL` = a read-only staging URL).

## Secret rotation

See [secrets management — rotation](M17-SECRETS-MANAGEMENT.md#rotation-procedure). Remember:
`AUTH_SESSION_SECRET` logs everyone out; `EMAIL_LINK_SECRET` breaks sent unsubscribe links.

## Provider configuration

| Feature | Switch it off (production-safe)      | Notes                                                         |
| ------- | ------------------------------------ | ------------------------------------------------------------- |
| Audio   | `AUDIO_GENERATION_PROVIDER=disabled` | Route answers 503; Gemini never called.                       |
| Video   | `VIDEO_GENERATION_PROVIDER=disabled` | The only production value until Hyperframes + storage exist.  |
| Email   | — (no off switch)                    | Needed for verification/reset; a real adapter is blocker B-2. |

Change the variable, restart, check `/ready` and the smoke test.

## Emergency shutdown

Stop serving immediately (suspected compromise, runaway cost): **PROVIDER-SPECIFIC** "stop/scale to
zero", or `docker stop -t 10 <container>`. The database stays intact. To also cut database access:
`ALTER ROLE tfm_app NOLOGIN;` then terminate its sessions
(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'tfm_app';`) as the admin
role. Reverse with `ALTER ROLE tfm_app LOGIN;`.

## Base image upgrade

Edit `ARG NODE_IMAGE` in `infrastructure/docker/app.Dockerfile` to the new **patch** tag of Node 24
(same major as `.nvmrc`/`engines`), rebuild, run `validate-image.sh`, commit. Follow-up: pin by digest
(`node:24.19.0-bookworm-slim@sha256:…`) once the registry/process for updating digests exists.

## Gitleaks upgrade

Update `GITLEAKS_IMAGE` in the `Jenkinsfile` to a released tag (check the gitleaks releases page),
run it once locally over `.git` before committing.
