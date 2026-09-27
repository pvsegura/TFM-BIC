/**
 * Production migrations (M17, ADR-028): every bounded context's migration set, applied in one
 * deterministic order, by one runner at a time. Replaces running ten `drizzle-kit migrate`
 * commands by hand — drizzle-kit is a development tool and is not shipped in the runtime image.
 *
 * Each set keeps the tracking table its drizzle-kit config has always used, so a database migrated
 * with drizzle-kit before M17 is recognised and nothing is applied twice.
 */

export interface MigrationSet {
  /** The context folder under packages/data/src. */
  context: string;
  /** Migrations folder, relative to the migrations root (packages/data/src in the repository). */
  folder: string;
  /** Drizzle's tracking table for this set (in the `drizzle` schema). */
  table: string;
}

function set(context: string, table: string): MigrationSet {
  return { context, folder: `${context}/db/migrations`, table };
}

/** Identity first: every other set has foreign keys to `users`. The rest only depend on it. */
export const MIGRATION_SETS: readonly MigrationSet[] = [
  set("identity", "__drizzle_migrations"),
  set("profile", "__drizzle_migrations_profile"),
  set("lessons", "__drizzle_migrations_lessons"),
  set("exercises", "__drizzle_migrations_exercises"),
  set("gamification", "__drizzle_migrations_gamification"),
  set("vocabulary", "__drizzle_migrations_vocabulary"),
  set("phonetics", "__drizzle_migrations_phonetics"),
  set("video", "__drizzle_migrations_video"),
  set("teaching", "__drizzle_migrations_teaching"),
  set("newsletter", "__drizzle_migrations_newsletter"),
];

/** One database session: the lock and every set run on the same connection. */
export interface MigrationSession {
  /** Non-blocking attempt at the migration lock (a Postgres advisory lock). */
  tryLock: () => Promise<boolean>;
  unlock: () => Promise<void>;
  /** Applies the pending migrations of one set (each set in its own transaction). */
  apply: (set: MigrationSet) => Promise<void>;
}

export interface RunMigrationsOptions {
  log: { info: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void };
  sleep?: (ms: number) => Promise<void>;
  /** How many times to try the lock before giving up (bounded — never waits forever). */
  lockAttempts?: number;
  lockRetryDelayMs?: number;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Takes the migration lock (so two deployments can never migrate concurrently), applies every set
 * in `MIGRATION_SETS` order, and always releases the lock. Stops at the first failing set: sets
 * applied before it stay applied (each is its own transaction) — see
 * docs/production/M17-PRODUCTION-RUNBOOK.md for what to do then.
 */
export async function runMigrations(
  session: MigrationSession,
  options: RunMigrationsOptions,
): Promise<void> {
  const { log, sleep = defaultSleep, lockAttempts = 30, lockRetryDelayMs = 2_000 } = options;

  let locked = false;
  for (let attempt = 1; attempt <= lockAttempts && !locked; attempt += 1) {
    locked = await session.tryLock();
    if (!locked && attempt < lockAttempts) {
      log.warn({ attempt, lockAttempts }, "migrations.lock_busy");
      await sleep(lockRetryDelayMs);
    }
  }
  if (!locked) {
    throw new Error(
      "Another migration run holds the migration lock; nothing was applied. Retry once it has finished.",
    );
  }

  try {
    for (const migrationSet of MIGRATION_SETS) {
      try {
        await session.apply(migrationSet);
      } catch (error) {
        throw new Error(`Migration set "${migrationSet.context}" failed.`, { cause: error });
      }
      log.info({ set: migrationSet.context }, "migrations.set_applied");
    }
  } finally {
    await session.unlock();
  }
}
