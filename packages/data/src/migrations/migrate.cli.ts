import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

import { runMigrations, type MigrationSession } from "./run-migrations.js";

/**
 * `pnpm db:migrate:all` (repository) / `node migrate.js` (runtime image): applies every context's
 * migrations to DATABASE_URL — the controlled deployment step of ADR-028, run once per release
 * before the new version starts, never by the API itself. Bootstrap only: the ordering and
 * locking logic is `runMigrations`, which is unit-tested, so this file is excluded from coverage
 * like the other entry points.
 *
 * `--migrations-root <dir>`: where the `<context>/db/migrations` folders live. Defaults to this
 * package's `src/` (repository layout); the runtime image passes its own copy.
 *
 * Never prints DATABASE_URL (it carries the password). Exit code 0 = everything applied (or
 * nothing pending), 1 = failure, 2 = usage error.
 */

/** Postgres advisory-lock key for "a migration run is in progress" (any stable 32-bit value). */
const MIGRATION_LOCK_KEY = 170_017;

/** DDL waiting longer than this for a table lock fails instead of queueing the API behind it. */
const MIGRATION_LOCK_TIMEOUT = "15s";

function log(level: "info" | "warn" | "error", obj: object, msg: string): void {
  process.stdout.write(
    `${JSON.stringify({ level, time: new Date().toISOString(), msg, ...obj })}\n`,
  );
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl)) {
  process.stderr.write("DATABASE_URL must be set to a postgres:// or postgresql:// URL.\n");
  process.exit(2);
}

const migrationsRoot = path.resolve(
  argValue("--migrations-root") ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
);

const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
const startedAt = Date.now();

try {
  await client.connect();
  await client.query(`SET lock_timeout = '${MIGRATION_LOCK_TIMEOUT}'`);
  const db = drizzle(client);

  const session: MigrationSession = {
    tryLock: async () =>
      (
        await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [
          MIGRATION_LOCK_KEY,
        ])
      ).rows[0]?.locked === true,
    unlock: async () => {
      await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    },
    apply: (set) =>
      migrate(db, {
        migrationsFolder: path.join(migrationsRoot, set.folder),
        migrationsTable: set.table,
      }),
  };

  await runMigrations(session, {
    log: {
      info: (obj, msg) => log("info", obj, msg),
      warn: (obj, msg) => log("warn", obj, msg),
    },
  });
  log("info", { durationMs: Date.now() - startedAt }, "migrations.completed");
} catch (error) {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  log(
    "error",
    { error: error instanceof Error ? error.message : "unknown error", cause },
    "migrations.failed",
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
