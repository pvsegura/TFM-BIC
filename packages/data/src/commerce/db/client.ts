import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { sharedPostgresPools } from "../../db/shared-pool.js";
import * as identitySchema from "../../identity/db/schema.js";

import * as schema from "./schema.js";

/** Commerce reads `users` for the admin directory, so its handle includes Identity's schema. */
const fullSchema = { ...identitySchema, ...schema };
export type CommerceDb = NodePgDatabase<typeof fullSchema>;

export interface CommerceDbHandle {
  db: CommerceDb;
  close: () => Promise<void>;
}

export function createCommerceDb(databaseUrl: string): CommerceDbHandle {
  const { pool, release } = sharedPostgresPools.acquire(databaseUrl);
  return { db: drizzle(pool, { schema: fullSchema }), close: release };
}
