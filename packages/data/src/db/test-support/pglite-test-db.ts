import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as identitySchema from "../../identity/db/schema.js";
import { MIGRATION_SETS } from "../../migrations/run-migrations.js";

const dataSrc = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export interface PgliteTestDb {
  /**
   * The database viewed as one context's handle type. `PgliteDatabase` implements the same
   * query-builder surface as `NodePgDatabase` at runtime — only the driver-specific
   * `QueryResultHKT` differs at the type level, which repository code never inspects (see
   * identity/db/client.ts) — so this is the one place the test driver is cast.
   */
  as: <Db>() => Db;
  /** Inserts a real `users` row and returns its id — most per-user tables have a foreign key to
   * `users`, so their rows can only exist for a real user. */
  seedUser: (email?: string, role?: "STUDENT" | "TEACHER" | "ADMIN") => Promise<string>;
  /** Clears the listed tables — cheaper between tests than booting a fresh WASM Postgres each
   * time. `CASCADE` also clears everything that references them. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (deleting a user to exercise
   * `ON DELETE CASCADE`, writing a value the application never would to prove a CHECK).
   * Test-only — repositories never use this. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with Identity's migrations applied first (the FK target `users`
 * must exist), then each listed context's, in the order given — each set tracked in its own
 * table exactly as production's migration runner does (MIGRATION_SETS). See
 * docs/adr/adr-005-database.md. Test-only: every context's test-support builds on this.
 */
export async function createPgliteTestDb(options: {
  /** Context names from MIGRATION_SETS, other than Identity (always applied first). */
  contexts: readonly string[];
  schema: Record<string, unknown>;
  /** Tables `reset` empties. Constants of the calling test-support, never input. */
  truncate: readonly string[];
}): Promise<PgliteTestDb> {
  const client = new PGlite();
  const pgliteDb = drizzle(client, { schema: options.schema });

  for (const context of ["identity", ...options.contexts]) {
    const set = MIGRATION_SETS.find((candidate) => candidate.context === context);
    if (!set) {
      throw new Error(`No migration set for context "${context}".`);
    }
    await migrate(pgliteDb, {
      migrationsFolder: path.join(dataSrc, set.folder),
      migrationsTable: set.table,
    });
  }

  const truncate = sql.raw(
    `TRUNCATE TABLE ${options.truncate.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE;`,
  );
  let seededUsers = 0;

  return {
    as: <Db>() => pgliteDb as unknown as Db,
    seedUser: async (email, role = "STUDENT") => {
      seededUsers += 1;
      const address = email ?? `student-${String(seededUsers)}@example.com`;
      const [row] = await pgliteDb
        .insert(identitySchema.users)
        .values({
          email: address,
          normalizedEmail: address.toLowerCase(),
          passwordHash: "test-only-not-a-real-hash",
          role,
        })
        .returning({ id: identitySchema.users.id });
      if (!row) {
        throw new Error("Seeding a test user returned no row.");
      }
      return row.id;
    },
    reset: async () => {
      await pgliteDb.execute(truncate);
    },
    rawExecute: (query: SQL) => pgliteDb.execute(query),
    close: () => client.close(),
  };
}
