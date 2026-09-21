import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

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
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, close: () => pool.end() };
}
