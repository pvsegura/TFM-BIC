import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { VideoDb } from "../client.js";
import * as videoSchema from "../schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataSrc = path.join(here, "..", "..", "..");
const identityMigrationsFolder = path.join(dataSrc, "identity", "db", "migrations");
const videoMigrationsFolder = path.join(here, "..", "migrations");

/** Must match `migrations.table` in drizzle.video.config.ts. */
const VIDEO_MIGRATIONS_TABLE = "__drizzle_migrations_video";

export interface VideoTestDbHandle {
  db: VideoDb;
  /** The same database instance viewed as Identity's handle — lets a NODE_ENV=test composition
   * root build auth and video repositories over one shared database (`video_generation_jobs` has
   * a foreign key to `users`). */
  identityDb: IdentityDb;
  /** Inserts a real `users` row and returns its id — `video_generation_jobs` has a foreign key to
   * `users`, so a job can only exist for a real user. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM Postgres each time.
   * `CASCADE` also clears everything that references `users`. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (e.g. inserting a value the
   * application would never write to prove a CHECK constraint). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with Identity's and Video's migrations applied in dependency
 * order — Identity first (the FK target `users` must exist), each set tracked in its own table
 * exactly as `drizzle-kit migrate` does. Same approach as the other contexts' test-support — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createVideoTestDb(): Promise<VideoTestDbHandle> {
  const client = new PGlite();
  const pgliteDb = drizzle(client, {
    schema: { ...identitySchema, ...videoSchema },
  });

  await migrate(pgliteDb, { migrationsFolder: identityMigrationsFolder });
  await migrate(pgliteDb, {
    migrationsFolder: videoMigrationsFolder,
    migrationsTable: VIDEO_MIGRATIONS_TABLE,
  });

  let seededUsers = 0;

  return {
    // See identity/db/client.ts: PgliteDatabase matches NodePgDatabase at runtime; only
    // driver-specific result types differ.
    db: pgliteDb as unknown as VideoDb,
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
        sql`TRUNCATE TABLE "video_generation_jobs", "users" RESTART IDENTITY CASCADE;`,
      );
    },
    rawExecute: (query: SQL) => pgliteDb.execute(query),
    close: () => client.close(),
  };
}
