import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

/**
 * The real production type — repositories are written against exactly
 * this. `drizzle-orm/pglite` (the in-process WASM driver used by
 * automated tests, see docs/adr/adr-005-database.md) produces a
 * `PgliteDatabase`, which implements the same query-builder surface at
 * runtime but is not structurally assignable to `NodePgDatabase` (each
 * driver's `QueryResultHKT` carries driver-specific row metadata, e.g.
 * `pg`'s `oid`, baked deep into the builder chain's types under
 * `exactOptionalPropertyTypes`). `db/test-support/create-test-db.ts` casts
 * across that boundary once, in one documented place, rather than every
 * repository accepting a looser type.
 */
export type IdentityDb = NodePgDatabase<typeof schema>;

export interface IdentityDbHandle {
  db: IdentityDb;
  close: () => Promise<void>;
}

/**
 * The one place `pg`/`drizzle-orm` connect to a real Postgres — Neon in
 * production, local Docker Postgres in dev (see ADR-005). `databaseUrl` is
 * a plain Postgres connection string, so this works identically against
 * either.
 */
export function createIdentityDb(databaseUrl: string): IdentityDbHandle {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, close: () => pool.end() };
}
