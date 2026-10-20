import type { SQL } from "drizzle-orm";

import { createPgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { LessonsDb } from "../../../lessons/db/client.js";
import * as lessonsSchema from "../../../lessons/db/schema.js";
import type { ProfileDb } from "../../../profile/db/client.js";
import * as profileSchema from "../../../profile/db/schema.js";
import type { ExercisesDb } from "../client.js";
import * as exercisesSchema from "../schema.js";

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
  const base = await createPgliteTestDb({
    contexts: ["profile", "lessons", "exercises"],
    schema: { ...identitySchema, ...profileSchema, ...lessonsSchema, ...exercisesSchema },
    truncate: ["exercise_attempts", "lesson_progress", "student_profiles", "users"],
  });

  return {
    db: base.as<ExercisesDb>(),
    identityDb: base.as<IdentityDb>(),
    profileDb: base.as<ProfileDb>(),
    lessonsDb: base.as<LessonsDb>(),
    seedUser: base.seedUser,
    reset: base.reset,
    rawExecute: base.rawExecute,
    close: base.close,
  };
}
