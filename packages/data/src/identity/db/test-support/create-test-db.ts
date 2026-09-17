import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { IdentityDb } from "../client.js";
import * as schema from "../schema.js";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);

export interface TestDbHandle {
  db: IdentityDb;
  /** Clears every Identity table — much faster between tests than booting
   * a fresh WASM Postgres each time, while still giving each test a clean
   * slate. `RESTART IDENTITY CASCADE` also handles the FK-dependent
   * tables (sessions/tokens reference users). */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for test setup that needs something outside the
   * `IdentityDb` query-builder surface (e.g. deleting a row to exercise an
   * FK `ON DELETE CASCADE`). Test-only — repositories never use this. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres instance, with M3's migrations already
 * applied — see docs/adr/adr-005-database.md for why this replaces a
 * hand-rolled repository fake for M3's repository tests. Not exported from
 * the package's public index; test-only.
 */
export async function createTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  const pgliteDb = drizzle(client, { schema });
  await migrate(pgliteDb, { migrationsFolder });

  // `PgliteDatabase` implements the same query-builder surface as
  // `NodePgDatabase` at runtime — only the driver-specific `QueryResultHKT`
  // (e.g. `pg`'s row metadata) differs at the type level, which repository
  // code never inspects. See db/client.ts for the full rationale.
  const db = pgliteDb as unknown as IdentityDb;

  return {
    db,
    reset: async () => {
      await pgliteDb.execute(
        sql`TRUNCATE TABLE "users", "sessions", "email_verification_tokens", "password_reset_tokens" RESTART IDENTITY CASCADE;`,
      );
    },
    rawExecute: (query: SQL) => pgliteDb.execute(query),
    close: () => client.close(),
  };
}
