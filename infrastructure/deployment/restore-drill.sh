#!/usr/bin/env bash
# Backup-and-restore drill (M17, docs/production/M17-BACKUP-AND-RECOVERY.md). Proves a logical
# backup can be restored and used — it never writes to the source database.
#
#   infrastructure/deployment/restore-drill.sh <image>
#
# Source:
#   - SOURCE_DATABASE_URL unset (default): a throwaway Postgres is created, migrated with the image
#     and filled through the app itself (the smoke test registers an account and records progress).
#   - SOURCE_DATABASE_URL set: that database is dumped READ-ONLY (pg_dump) — e.g. staging, or a
#     production branch/replica. Use a read-only role. Nothing is ever restored into it.
#
# Then: pg_dump (custom format) → restore into a NEW throwaway Postgres → compare row counts of every
# table → start the image against the restored copy → /ready and the drill account's login work.
# Everything is removed on exit; the dump lives in a throwaway Docker volume, deleted with it.
#
# Needs: docker, node. On Windows Git Bash, set MSYS_NO_PATHCONV=1.
set -euo pipefail

IMAGE="${1:?usage: restore-drill.sh <image>}"
PG_IMAGE="${DRILL_PG_IMAGE:-postgres:17-bookworm}"
RUN_ID="tfmr-$$-$RANDOM"
NET="$RUN_ID-net"; SRC="$RUN_ID-src"; DST="$RUN_ID-dst"; APP="$RUN_ID-app"
PORT="${DRILL_PORT:-18098}"
BASE="http://127.0.0.1:$PORT"
ORIGIN="https://restore-drill.invalid"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VOL="$RUN_ID-backup"

step() { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
secret() { node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('base64url'))"; }
cleanup() {
  docker rm -f "$APP" "$SRC" "$DST" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker volume rm "$VOL" >/dev/null 2>&1 || true
}
trap cleanup EXIT

start_pg() { # name password
  docker run -d --name "$1" --network "$NET" -e POSTGRES_USER=admin -e POSTGRES_PASSWORD="$2" \
    -e POSTGRES_DB=tfm_bic "$PG_IMAGE" >/dev/null
  for _ in $(seq 1 60); do
    docker exec "$1" pg_isready -h 127.0.0.1 -U admin -d tfm_bic >/dev/null 2>&1 && return 0
    sleep 1
  done
  fail "$1 did not start"
}

wait_ready() {
  for _ in $(seq 1 60); do
    node -e "fetch(process.argv[1]).then(r=>{process.exitCode=r.status===200?0:1},()=>{process.exitCode=1})" \
      "$BASE/ready" && return 0
    sleep 1
  done
  docker logs "$APP" | tail -20
  fail "app not ready"
}

run_app() { # database-url
  docker rm -f "$APP" >/dev/null 2>&1 || true
  docker run -d --name "$APP" --network "$NET" -p "127.0.0.1:$PORT:3000" -e NODE_ENV=staging \
    -e DATABASE_URL="$1" -e AUTH_SESSION_SECRET="$(secret)$(secret)" -e EMAIL_LINK_SECRET="$(secret)$(secret)" \
    -e APP_BASE_URL="$ORIGIN" "$IMAGE" >/dev/null
  wait_ready
}

docker network create "$NET" >/dev/null
docker volume create "$VOL" >/dev/null
DST_PW="$(secret)"
DRILL_EMAIL="restore-drill-$RANDOM@example.invalid"
DRILL_PASSWORD="drill-$(secret)"

if [ -z "${SOURCE_DATABASE_URL:-}" ]; then
  step "Source: a throwaway database, migrated and filled through the app"
  SRC_PW="$(secret)"
  start_pg "$SRC" "$SRC_PW"
  SOURCE_DATABASE_URL="postgres://admin:$SRC_PW@$SRC:5432/tfm_bic"
  docker run --rm --network "$NET" -e DATABASE_URL="$SOURCE_DATABASE_URL" "$IMAGE" \
    node dist/migrate.js --migrations-root /app/migrations | grep -q migrations.completed
  run_app "$SOURCE_DATABASE_URL"
  node -e '
    const [base, origin, email, password] = process.argv.slice(1);
    const post = (p, body, cookie) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
    (async () => {
      await post("/auth/register", { email, password });
      const login = await post("/auth/login", { email, password });
      const cookie = login.headers.get("set-cookie").split(";")[0];
      const r = await post("/lessons/pl-greetings/start", {}, cookie);
      process.exitCode = login.ok && r.ok ? 0 : 1;
    })().catch(() => { process.exitCode = 1; });' "$BASE" "$ORIGIN" "$DRILL_EMAIL" "$DRILL_PASSWORD" \
    || fail "could not fill the source database"
  docker rm -f "$APP" >/dev/null
else
  step "Source: SOURCE_DATABASE_URL (read-only dump; nothing is written to it)"
  DRILL_EMAIL=""
fi

step "Backup: pg_dump --format=custom (runs in a $PG_IMAGE client container)"
t0=$(date +%s)
docker run --rm --network "$NET" -e SRC_URL="$SOURCE_DATABASE_URL" -v "$VOL:/backup" "$PG_IMAGE" \
  sh -c 'pg_dump --format=custom --no-owner --no-privileges --dbname="$SRC_URL" --file=/backup/tfm_bic.dump'
echo "dump: $(docker run --rm -v "$VOL:/backup" "$PG_IMAGE" du -h /backup/tfm_bic.dump | cut -f1) in $(( $(date +%s) - t0 ))s"

step "Restore into a NEW, empty database"
start_pg "$DST" "$DST_PW"
t0=$(date +%s)
docker run --rm --network "$NET" -e DST_URL="postgres://admin:$DST_PW@$DST:5432/tfm_bic" \
  -v "$VOL:/backup" "$PG_IMAGE" \
  sh -c 'pg_restore --no-owner --no-privileges --exit-on-error --dbname="$DST_URL" /backup/tfm_bic.dump'
echo "restored in $(( $(date +%s) - t0 ))s"

step "Validate: every table has the same row count in source and restore"
COUNT_SQL="SELECT string_agg(format('%s.%s=%s', schemaname, relname, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', schemaname, relname), false, true, '')))[1]::text), ' ' ORDER BY schemaname, relname) FROM pg_stat_user_tables"
count() { docker run --rm --network "$NET" -e URL="$1" "$PG_IMAGE" psql -tA --dbname="$1" -c "$COUNT_SQL"; }
src_counts="$(count "$SOURCE_DATABASE_URL")"
dst_counts="$(count "postgres://admin:$DST_PW@$DST:5432/tfm_bic")"
echo "$dst_counts" | tr ' ' '\n' | grep -v '=0$' || true
[ "$src_counts" = "$dst_counts" ] || fail "row counts differ between source and restore"

step "Validate: the application runs on the restored copy"
run_app "postgres://admin:$DST_PW@$DST:5432/tfm_bic"
if [ -n "$DRILL_EMAIL" ]; then
  node -e '
    const [base, origin, email, password] = process.argv.slice(1);
    fetch(base + "/auth/login", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, password }) })
      .then((r) => { process.exitCode = r.ok ? 0 : 1; }, () => { process.exitCode = 1; });' \
    "$BASE" "$ORIGIN" "$DRILL_EMAIL" "$DRILL_PASSWORD" || fail "the drill account cannot log in on the restore"
  echo "drill account logs in on the restored database"
fi

printf '\nRESTORE DRILL PASSED (%s)\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
