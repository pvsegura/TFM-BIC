#!/usr/bin/env bash
# Validates a built TFM-BIC image end to end (M17) — the Jenkins "Validate Image" stage, and what an
# operator runs before promoting an image. Everything is ephemeral: a private Docker network, a
# throwaway Postgres 17, generated one-time secrets; all removed on exit.
#
#   infrastructure/docker/validate-image.sh tfm-bic:<git-sha> [expected-app-version]
#
# Checks: migrations on a clean database (as a non-superuser migrator role), idempotent re-run,
# start-up in NODE_ENV=staging as a least-privilege app role, the smoke test (with writes, on a
# disposable account), readiness during a database outage and recovery without a restart,
# non-root execution with read-only code, no secrets or package managers in the image, production
# refusing the fake providers, and a graceful stop within Docker's grace period.
#
# Needs: docker, node (for the smoke test). On Windows Git Bash, set MSYS_NO_PATHCONV=1.
set -euo pipefail

IMAGE="${1:?usage: validate-image.sh <image> [expected-app-version]}"
EXPECTED_VERSION="${2:-}"
RUN_ID="tfmv-$$-$RANDOM"
NET="$RUN_ID-net"
DB="$RUN_ID-db"
APP="$RUN_ID-app"
PORT="${VALIDATE_PORT:-18099}"
BASE="http://127.0.0.1:$PORT"
ORIGIN="https://staging.validate.invalid"
PG_IMAGE="${VALIDATE_PG_IMAGE:-postgres:17-bookworm}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
secret() { node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"; }
http_get() { # prints "<status> <body>" (body truncated), never fails
  node -e "fetch(process.argv[1],{signal:AbortSignal.timeout(5000)}).then(async r=>console.log(r.status,(await r.text()).slice(0,200)),()=>console.log('000'))" "$1"
}

cleanup() {
  docker rm -f "$APP" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ADMIN_PW="$(secret)"; MIGRATOR_PW="$(secret)"; APP_PW="$(secret)"
MIGRATOR_URL="postgres://tfm_migrator:$MIGRATOR_PW@$DB:5432/tfm_bic"
APP_URL="postgres://tfm_app:$APP_PW@$DB:5432/tfm_bic"

step "Ephemeral Postgres with separate migrator (DDL) and app (DML only) roles"
docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" -e POSTGRES_USER=admin -e POSTGRES_PASSWORD="$ADMIN_PW" \
  -e POSTGRES_DB=tfm_bic "$PG_IMAGE" >/dev/null
# Over TCP: during initialisation the image runs a temporary server on the Unix socket only.
for _ in $(seq 1 60); do
  docker exec "$DB" pg_isready -h 127.0.0.1 -U admin -d tfm_bic >/dev/null 2>&1 && break
  sleep 1
done
docker exec -i "$DB" psql -q -v ON_ERROR_STOP=1 -U admin -d tfm_bic \
  -v mpw="$MIGRATOR_PW" -v apw="$APP_PW" <<'SQL'
CREATE ROLE tfm_migrator LOGIN PASSWORD :'mpw';
CREATE ROLE tfm_app LOGIN PASSWORD :'apw';
GRANT CONNECT, CREATE ON DATABASE tfm_bic TO tfm_migrator;
GRANT CONNECT ON DATABASE tfm_bic TO tfm_app;
ALTER SCHEMA public OWNER TO tfm_migrator;
GRANT USAGE ON SCHEMA public TO tfm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tfm_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tfm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tfm_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO tfm_app;
SQL

migrate() {
  docker run --rm --network "$NET" -e DATABASE_URL="$MIGRATOR_URL" "$IMAGE" \
    node dist/migrate.js --migrations-root /app/migrations
}

step "Migrations on a clean database"
migrate | tee /dev/stderr | grep -q '"migrations.completed"' || fail "migrations did not complete"
step "Migrations again (must be a no-op)"
before="$(docker exec "$DB" psql -tAU admin -d tfm_bic -c 'SELECT count(*) FROM drizzle.__drizzle_migrations')"
migrate >/dev/null || fail "second migration run failed"
after="$(docker exec "$DB" psql -tAU admin -d tfm_bic -c 'SELECT count(*) FROM drizzle.__drizzle_migrations')"
[ "$before" = "$after" ] || fail "second run changed the migration history ($before -> $after)"

step "Production configuration refuses the fake providers (fail fast, no secret printed)"
out="$(docker run --rm -e DATABASE_URL="postgres://app:$APP_PW@db.example.invalid:5432/x?sslmode=require" \
  -e AUTH_SESSION_SECRET="$(secret)" -e EMAIL_LINK_SECRET="$(secret)" \
  -e APP_BASE_URL=https://app.validate.invalid "$IMAGE" 2>&1 || true)"
grep -q "EMAIL_PROVIDER=fake is not allowed" <<<"$out" || fail "production accepted the fake email provider"
grep -q "$APP_PW" <<<"$out" && fail "a secret appeared in the configuration error"

step "Start in NODE_ENV=staging as the least-privilege app role"
started=$(date +%s)
docker run -d --name "$APP" --network "$NET" -p "127.0.0.1:$PORT:3000" \
  -e NODE_ENV=staging -e DATABASE_URL="$APP_URL" -e AUTH_SESSION_SECRET="$(secret)" \
  -e EMAIL_LINK_SECRET="$(secret)" -e APP_BASE_URL="$ORIGIN" "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  [ "$(http_get "$BASE/ready")" = '200 {"ready":true}' ] && break
  sleep 1
done
[ "$(http_get "$BASE/ready")" = '200 {"ready":true}' ] || { docker logs "$APP"; fail "not ready"; }
echo "ready after ~$(( $(date +%s) - started ))s"

step "Smoke test (disposable account, with writes)"
SMOKE_BASE_URL="$BASE" SMOKE_ORIGIN="$ORIGIN" SMOKE_EXPECTED_VERSION="$EXPECTED_VERSION" \
  SMOKE_REGISTER=true SMOKE_ALLOW_WRITES=true \
  bash -c 'cd "$1/../deployment" && node smoke-test.mjs' _ "$HERE"

step "Database outage: liveness stays up, readiness goes 503, recovery without a restart"
docker stop "$DB" >/dev/null
sleep 2
[ "$(docker inspect -f '{{.State.Running}}' "$APP")" = true ] || { docker logs "$APP" | tail -20; fail "the app died with the database"; }
[[ "$(http_get "$BASE/health")" == 200* ]] || fail "liveness failed during the outage"
[[ "$(http_get "$BASE/ready")" == 503* ]] || fail "readiness did not report the outage"
docker start "$DB" >/dev/null
for _ in $(seq 1 60); do [ "$(http_get "$BASE/ready")" = '200 {"ready":true}' ] && break; sleep 1; done
[ "$(http_get "$BASE/ready")" = '200 {"ready":true}' ] || fail "did not recover after the database came back"

step "Runtime user, read-only code, no package managers, no secrets"
docker exec "$APP" sh -c '[ "$(id -u)" != 0 ]' || fail "running as root"
docker exec "$APP" sh -c 'touch /app/dist/index.js 2>/dev/null' && fail "the app can modify its own code"
docker exec "$APP" sh -c 'command -v npm || command -v npx || command -v corepack || command -v yarn' \
  && fail "a package manager is present"
docker exec "$APP" sh -c 'find /app -name ".env*" -o -name "*.pem" -o -name "*.key" | grep .' \
  && fail "secret-like files in /app"
docker exec "$APP" sh -c 'grep -rIlE "BEGIN [A-Z ]*PRIVATE KEY|postgres(ql)?://[^:@/ ]+:[^@/ ]+@" /app/dist /app/web /app/content' \
  && fail "credentials embedded in the image"
docker image inspect "$IMAGE" --format '{{json .Config.Env}}' | grep -qiE 'SECRET|PASSWORD|API_KEY|DATABASE_URL' \
  && fail "secret-like variable baked into the image"

step "Graceful stop (SIGTERM) within Docker's 10 s grace period"
t0=$(date +%s%3N)
docker stop -t 10 "$APP" >/dev/null
elapsed=$(( $(date +%s%3N) - t0 ))
code="$(docker inspect -f '{{.State.ExitCode}}' "$APP")"
docker logs "$APP" 2>&1 | grep -q '"shutdown.completed"' || fail "no shutdown.completed log"
[ "$code" = 0 ] || fail "exit code $code after SIGTERM"
echo "stopped in ${elapsed} ms, exit code $code"

printf '\nIMAGE VALID: %s\n' "$IMAGE"
