import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { sharedPostgresPools } from "../../db/shared-pool.js";

import * as schema from "./schema.js";

/**
 * The real production type the lesson-progress repository is written against —
 * see identity/db/client.ts for why the PGlite test driver is cast to this once
 * (in db/test-support/create-test-db.ts) rather than every repository accepting
 * a looser type.
 */
export type LessonsDb = NodePgDatabase<typeof schema>;

export interface LessonsDbHandle {
  db: LessonsDb;
  close: () => Promise<void>;
}

/**
 * Same plain Postgres connection string as Identity and Profile (one
 * `DATABASE_URL`, one database — Neon in production, local Docker Postgres in
 * dev). A separate small pool per bounded context, not a second database.
 */
export function createLessonsDb(databaseUrl: string): LessonsDbHandle {
  // One bounded, shared pool for the whole process (M17) — see db/shared-pool.ts.
  const { pool, release } = sharedPostgresPools.acquire(databaseUrl);
  const db = drizzle(pool, { schema });
  return { db, close: release };
}
