import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { LessonsDb } from "../../../lessons/db/client.js";
import * as lessonsSchema from "../../../lessons/db/schema.js";
import type { ProfileDb } from "../../../profile/db/client.js";
import * as profileSchema from "../../../profile/db/schema.js";
import type { ExercisesDb } from "../client.js";
import * as exercisesSchema from "../schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataSrc = path.join(here, "..", "..", "..");
const identityMigrationsFolder = path.join(dataSrc, "identity", "db", "migrations");
const profileMigrationsFolder = path.join(dataSrc, "profile", "db", "migrations");
const lessonsMigrationsFolder = path.join(dataSrc, "lessons", "db", "migrations");
const exercisesMigrationsFolder = path.join(here, "..", "migrations");

/** Must match `migrations.table` in each context's drizzle.*.config.ts. */
const PROFILE_MIGRATIONS_TABLE = "__drizzle_migrations_profile";
const LESSONS_MIGRATIONS_TABLE = "__drizzle_migrations_lessons";
const EXERCISES_MIGRATIONS_TABLE = "__drizzle_migrations_exercises";

export interface ExercisesTestDbHandle {
  db: ExercisesDb;
  /** The same database instance viewed as the other contexts' handles — lets a
   * NODE_ENV=test composition root build every repository over one shared
   * database (profiles, lesson progress and exercise attempts all have a
   * foreign key to `users`). */
  identityDb: IdentityDb;
  profileDb: ProfileDb;
  lessonsDb: LessonsDb;
  /** Inserts a real `users` row and returns its id — `exercise_attempts` has a
   * foreign key to `users`, so attempts can only exist for a real user. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM
   * Postgres each time. `CASCADE` also clears everything that references `users`. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (deleting a
   * user to exercise `ON DELETE CASCADE`, inserting a value the application would
   * never write to prove a CHECK constraint). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with every bounded context's migrations
 * applied in dependency order — Identity first (the FK target `users` must
 * exist), then Student Profile, Lessons and Exercises, each set tracked in its
 * own table exactly as `drizzle-kit migrate` does. It is the whole application's
 * schema, which is what the E2E composition needs; the attempt repository tests
 * use it too. Same approach as the other contexts' test-support — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createExercisesTestDb(): Promise<ExercisesTestDbHandle> {
  const client = new PGlite();
  const pgliteDb = drizzle(client, {
    schema: { ...identitySchema, ...profileSchema, ...lessonsSchema, ...exercisesSchema },
  });

  await migrate(pgliteDb, { migrationsFolder: identityMigrationsFolder });
  await migrate(pgliteDb, {
    migrationsFolder: profileMigrationsFolder,
    migrationsTable: PROFILE_MIGRATIONS_TABLE,
  });
  await migrate(pgliteDb, {
    migrationsFolder: lessonsMigrationsFolder,
    migrationsTable: LESSONS_MIGRATIONS_TABLE,
  });
  await migrate(pgliteDb, {
    migrationsFolder: exercisesMigrationsFolder,
    migrationsTable: EXERCISES_MIGRATIONS_TABLE,
  });

  let seededUsers = 0;

  return {
    // See identity/db/client.ts: PgliteDatabase matches NodePgDatabase at
    // runtime; only driver-specific result types differ.
    db: pgliteDb as unknown as ExercisesDb,
    identityDb: pgliteDb as unknown as IdentityDb,
    profileDb: pgliteDb as unknown as ProfileDb,
    lessonsDb: pgliteDb as unknown as LessonsDb,
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
        sql`TRUNCATE TABLE "exercise_attempts", "lesson_progress", "student_profiles", "users" RESTART IDENTITY CASCADE;`,
      );
    },
    rawExecute: (query: SQL) => pgliteDb.execute(query),
    close: () => client.close(),
  };
}
