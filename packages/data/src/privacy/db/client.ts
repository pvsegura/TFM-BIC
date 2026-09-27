import { drizzle } from "drizzle-orm/node-postgres";

import { sharedPostgresPools } from "../../db/shared-pool.js";

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
 * Exports and deletions are rare, rate-limited, user-initiated operations; since M17 they share
 * the process's one bounded pool instead of opening a small one of their own.
 */
export function createPrivacyDb(databaseUrl: string): PrivacyDbHandle {
  // One bounded, shared pool for the whole process (M17) — see db/shared-pool.ts.
  const { pool, release } = sharedPostgresPools.acquire(databaseUrl);
  const db = drizzle(pool, { schema: identitySchema });
  return { db, close: release };
}
