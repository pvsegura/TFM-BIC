import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as identitySchema from "../../../identity/db/schema.js";
import type { ProfileDb } from "../client.js";
import * as profileSchema from "../schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const identityMigrationsFolder = path.join(here, "..", "..", "..", "identity", "db", "migrations");
const profileMigrationsFolder = path.join(here, "..", "migrations");

/** Must match `migrations.table` in drizzle.profile.config.ts. */
const PROFILE_MIGRATIONS_TABLE = "__drizzle_migrations_profile";

export interface ProfileTestDbHandle {
  db: ProfileDb;
  /** Inserts a real `users` row and returns its id — `student_profiles` has
   * a foreign key to `users`, so a profile can only exist for a real user. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM
   * Postgres each time. `CASCADE` also clears everything that references
   * `users`. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (e.g.
   * deleting a user to exercise `ON DELETE CASCADE`, or inserting a value the
   * application would never write to prove a CHECK constraint). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with Identity's migrations applied first
 * (the FK target `users` must exist) and then Student Profile's, each set
 * tracked in its own table exactly as `drizzle-kit migrate` does. Same
 * approach as identity/db/test-support/create-test-db.ts — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createProfileTestDb(): Promise<ProfileTestDbHandle> {
  const client = new PGlite();
  const pgliteDb = drizzle(client, { schema: { ...identitySchema, ...profileSchema } });

  await migrate(pgliteDb, { migrationsFolder: identityMigrationsFolder });
  await migrate(pgliteDb, {
    migrationsFolder: profileMigrationsFolder,
    migrationsTable: PROFILE_MIGRATIONS_TABLE,
  });

  let seededUsers = 0;

  return {
    // See identity/db/client.ts: PgliteDatabase matches NodePgDatabase at
    // runtime; only driver-specific result types differ.
    db: pgliteDb as unknown as ProfileDb,
    seedUser: async (email) => {
      seededUsers += 1;
      const address = email ?? `student-${seededUsers}@example.com`;
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
        sql`TRUNCATE TABLE "student_profiles", "users" RESTART IDENTITY CASCADE;`,
      );
    },
    rawExecute: (query: SQL) => pgliteDb.execute(query),
    close: () => client.close(),
  };
}
