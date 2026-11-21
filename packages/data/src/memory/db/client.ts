import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { sharedPostgresPools } from "../../db/shared-pool.js";

import * as schema from "./schema.js";

export type MemoryDb = NodePgDatabase<typeof schema>;

export interface MemoryDbHandle {
  db: MemoryDb;
  close: () => Promise<void>;
}

export function createMemoryDb(databaseUrl: string): MemoryDbHandle {
  const { pool, release } = sharedPostgresPools.acquire(databaseUrl);
  return { db: drizzle(pool, { schema }), close: release };
}
