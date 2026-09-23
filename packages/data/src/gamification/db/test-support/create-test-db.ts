import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as exercisesSchema from "../../../exercises/db/schema.js";
import type { ExercisesDb } from "../../../exercises/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { IdentityDb } from "../../../identity/db/client.js";
import * as lessonsSchema from "../../../lessons/db/schema.js";
import type { LessonsDb } from "../../../lessons/db/client.js";
import type { PhoneticsDb } from "../../../phonetics/db/client.js";
import * as phoneticsSchema from "../../../phonetics/db/schema.js";
import * as profileSchema from "../../../profile/db/schema.js";
import type { ProfileDb } from "../../../profile/db/client.js";
import type { GamificationDb } from "../client.js";
import * as gamificationSchema from "../schema.js";
import type { VocabularyDb } from "../../../vocabulary/db/client.js";
import * as vocabularySchema from "../../../vocabulary/db/schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataSrc = path.join(here, "..", "..", "..");
const migrationsOf = (context: string) => path.join(dataSrc, context, "db", "migrations");

/** Must match `migrations.table` in each context's drizzle.*.config.ts. */
const CONTEXTS = [
  { folder: migrationsOf("profile"), table: "__drizzle_migrations_profile" },
  { folder: migrationsOf("lessons"), table: "__drizzle_migrations_lessons" },
  { folder: migrationsOf("exercises"), table: "__drizzle_migrations_exercises" },
  { folder: migrationsOf("gamification"), table: "__drizzle_migrations_gamification" },
  { folder: migrationsOf("vocabulary"), table: "__drizzle_migrations_vocabulary" },
  { folder: migrationsOf("phonetics"), table: "__drizzle_migrations_phonetics" },
] as const;

export interface GamificationTestDbHandle {
  db: GamificationDb;
  /** The same database instance viewed as the other contexts' handles — lets a NODE_ENV=test
   * composition root build every repository over one shared database (profiles, lesson
   * progress, exercise attempts, points, achievements and vocabulary all have a foreign key to
   * `users`). */
  identityDb: IdentityDb;
  profileDb: ProfileDb;
  lessonsDb: LessonsDb;
  exercisesDb: ExercisesDb;
  vocabularyDb: VocabularyDb;
  phoneticsDb: PhoneticsDb;
  /** Inserts a real `users` row and returns its id — every gamification row has a foreign key to `users`. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM Postgres each time. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (deleting a user to
   * exercise `ON DELETE CASCADE`, inserting a value the application would never write to prove
   * a CHECK, trying an `UPDATE` to prove the immutability trigger). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with every bounded context's migrations applied in dependency
 * order — Identity first (the FK target `users` must exist), then Student Profile, Lessons,
 * Exercises, Gamification, Vocabulary and Phonetics, each set tracked in its own table exactly as
 * `drizzle-kit migrate` does. It is the whole application's schema, which is what the E2E
 * composition needs; the gamification repository tests use it too. Same approach as the other
 * contexts' test-support —
 * see docs/adr/adr-005-database.md. Test-only.
 */
export async function createGamificationTestDb(): Promise<GamificationTestDbHandle> {
  const client = new PGlite();
  const pgliteDb = drizzle(client, {
    schema: {
      ...identitySchema,
      ...profileSchema,
      ...lessonsSchema,
      ...exercisesSchema,
      ...gamificationSchema,
      ...vocabularySchema,
      ...phoneticsSchema,
    },
  });

  await migrate(pgliteDb, { migrationsFolder: migrationsOf("identity") });
  for (const { folder, table } of CONTEXTS) {
    await migrate(pgliteDb, { migrationsFolder: folder, migrationsTable: table });
  }

  let seededUsers = 0;

  return {
    // See identity/db/client.ts: PgliteDatabase matches NodePgDatabase at runtime; only
    // driver-specific result types differ.
    db: pgliteDb as unknown as GamificationDb,
    identityDb: pgliteDb as unknown as IdentityDb,
    profileDb: pgliteDb as unknown as ProfileDb,
    lessonsDb: pgliteDb as unknown as LessonsDb,
    exercisesDb: pgliteDb as unknown as ExercisesDb,
    vocabularyDb: pgliteDb as unknown as VocabularyDb,
    phoneticsDb: pgliteDb as unknown as PhoneticsDb,
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
        sql`TRUNCATE TABLE "point_transactions", "user_achievements", "user_vocabulary", "user_phonetic_progress", "exercise_attempts", "lesson_progress", "student_profiles", "users" RESTART IDENTITY CASCADE;`,
      );
    },
    rawExecute: (query: SQL) => pgliteDb.execute(query),
    close: () => client.close(),
  };
}
