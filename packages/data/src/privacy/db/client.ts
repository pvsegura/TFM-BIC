import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { IdentityDb } from "../../identity/db/client.js";
import * as identitySchema from "../../identity/db/schema.js";

/**
 * The privacy adapters (M15) read and erase across every context's tables with raw SQL, so they
 * need no schema of their own; they are typed against the identity handle because `users` is
 * the table they are anchored on. Same `DATABASE_URL` and database as every other context.
 */
export type PrivacyDb = IdentityDb;

export interface PrivacyDbHandle {
  db: PrivacyDb;
  close: () => Promise<void>;
}

/**
 * A deliberately small pool: exports and deletions are rare, rate-limited, user-initiated
 * operations — they do not need the pool size of a request-path context.
 */
export function createPrivacyDb(databaseUrl: string): PrivacyDbHandle {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const db = drizzle(pool, { schema: identitySchema });
  return { db, close: () => pool.end() };
}
