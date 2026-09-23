import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { PhoneticsDb } from "../client.js";
import * as phoneticsSchema from "../schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataSrc = path.join(here, "..", "..", "..");
const identityMigrationsFolder = path.join(dataSrc, "identity", "db", "migrations");
const phoneticsMigrationsFolder = path.join(here, "..", "migrations");

/** Must match `migrations.table` in drizzle.phonetics.config.ts. */
const PHONETICS_MIGRATIONS_TABLE = "__drizzle_migrations_phonetics";

export interface PhoneticsTestDbHandle {
  db: PhoneticsDb;
  /** The same database instance viewed as Identity's handle — lets a NODE_ENV=test composition
   * root build auth and phonetics repositories over one shared database
   * (`user_phonetic_progress` has a foreign key to `users`). */
  identityDb: IdentityDb;
  /** Inserts a real `users` row and returns its id — `user_phonetic_progress` has a foreign key to
   * `users`, so a record can only exist for a real user. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM Postgres each time.
   * `CASCADE` also clears everything that references `users`. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (e.g. deleting a user to
   * exercise `ON DELETE CASCADE`, or inserting a value the application would never write to prove
   * a CHECK constraint). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with Identity's and Phonetics' migrations applied in dependency
 * order — Identity first (the FK target `users` must exist), each set tracked in its own table
 * exactly as `drizzle-kit migrate` does. Same approach as the other contexts' test-support — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createPhoneticsTestDb(): Promise<PhoneticsTestDbHandle> {
  const client = new PGlite();
  const pgliteDb = drizzle(client, {
    schema: { ...identitySchema, ...phoneticsSchema },
  });

  await migrate(pgliteDb, { migrationsFolder: identityMigrationsFolder });
  await migrate(pgliteDb, {
    migrationsFolder: phoneticsMigrationsFolder,
    migrationsTable: PHONETICS_MIGRATIONS_TABLE,
  });

  let seededUsers = 0;

  return {
    // See identity/db/client.ts: PgliteDatabase matches NodePgDatabase at runtime; only
    // driver-specific result types differ.
    db: pgliteDb as unknown as PhoneticsDb,
    identityDb: pgliteDb as unknown as IdentityDb,
    seedUser: async (email) => {
      seededUsers += 1;
      const address = email ?? `student-${String(seededUsers)}@example.com`;
      const [row] = await pgliteDb
        .insert(identitySchema.users)
        .values({
          email: address,
          normalizedEmail: address.toLowerCase(),
          passwordHash: "test-only-not-a-real-hash",
        })
        .returning({ id: identitySchema.users.id });
      if (!row) {
        throw new Error("Seeding a test user returned no row.");
      }
      return row.id;
    },
    reset: async () => {
      await pgliteDb.execute(
        sql`TRUNCATE TABLE "user_phonetic_progress", "users" RESTART IDENTITY CASCADE;`,
      );
    },
    rawExecute: (query: SQL) => pgliteDb.execute(query),
    close: () => client.close(),
  };
}
