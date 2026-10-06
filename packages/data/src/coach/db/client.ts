import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { sharedPostgresPools } from "../../db/shared-pool.js";

/**
 * The database handle the AI Coach's read model uses (M23, ADR-034).
 *
 * Unlike every other context under `packages/data`, this one has **no `schema.ts` and no
 * `migrations/` folder** — deliberately. The coach owns no table: it only reads rows that M6
 * (`lesson_progress`), M7 (`exercise_attempts`), M8 (`point_transactions`) and M9
 * (`user_vocabulary`) already own, the same way M13's teacher read model reads them. Adding a
 * schema here would imply the coach owns data it must then export, retain and delete (ADR-026);
 * it owns none, so there is nothing to register.
 *
 * No typed schema is passed to Drizzle for the same reason: these are cross-context aggregate
 * reads expressed as parameterised SQL, not writes against this context's own tables.
 */
export type CoachDb = NodePgDatabase<Record<string, never>>;

export interface CoachDbHandle {
  db: CoachDb;
  close: () => Promise<void>;
}

/** Same `DATABASE_URL` and the same shared process pool as every other context (M17). */
export function createCoachDb(databaseUrl: string): CoachDbHandle {
  const { pool, release } = sharedPostgresPools.acquire(databaseUrl);
  const db = drizzle(pool);
  return { db, close: release };
}
