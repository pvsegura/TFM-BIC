import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { sharedPostgresPools } from "../../db/shared-pool.js";

import * as schema from "./schema.js";

/**
 * The real production type the teaching repositories are written against — see
 * identity/db/client.ts for why the PGlite test driver is cast to this once rather than every
 * repository accepting a looser type.
 */
export type TeachingDb = NodePgDatabase<typeof schema>;

export interface TeachingDbHandle {
  db: TeachingDb;
  close: () => Promise<void>;
}

/** Same `DATABASE_URL` and database as every other context; a small pool of its own. */
export function createTeachingDb(databaseUrl: string): TeachingDbHandle {
  // One bounded, shared pool for the whole process (M17) — see db/shared-pool.ts.
  const { pool, release } = sharedPostgresPools.acquire(databaseUrl);
  const db = drizzle(pool, { schema });
  return { db, close: release };
}
