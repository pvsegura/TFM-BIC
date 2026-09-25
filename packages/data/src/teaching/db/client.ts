import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

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
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, close: () => pool.end() };
}
