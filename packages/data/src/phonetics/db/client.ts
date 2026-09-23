import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

/**
 * The real production type the user-phonetic-progress repository is written against — see
 * identity/db/client.ts for why the PGlite test driver is cast to this once (in
 * db/test-support/create-test-db.ts) rather than every repository accepting a looser type.
 */
export type PhoneticsDb = NodePgDatabase<typeof schema>;

export interface PhoneticsDbHandle {
  db: PhoneticsDb;
  close: () => Promise<void>;
}

/**
 * Same plain Postgres connection string as the other contexts (one `DATABASE_URL`, one database —
 * Neon in production, local Docker Postgres in dev). A separate small pool per bounded context,
 * not a second database.
 */
export function createPhoneticsDb(databaseUrl: string): PhoneticsDbHandle {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, close: () => pool.end() };
}
