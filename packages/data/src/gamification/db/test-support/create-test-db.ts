import type { SQL } from "drizzle-orm";

import { createPgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import * as exercisesSchema from "../../../exercises/db/schema.js";
import type { ExercisesDb } from "../../../exercises/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { IdentityDb } from "../../../identity/db/client.js";
import * as lessonsSchema from "../../../lessons/db/schema.js";
import type { NewsletterDb } from "../../../newsletter/db/client.js";
import * as newsletterSchema from "../../../newsletter/db/schema.js";
import type { LessonsDb } from "../../../lessons/db/client.js";
import type { PhoneticsDb } from "../../../phonetics/db/client.js";
import * as phoneticsSchema from "../../../phonetics/db/schema.js";
import type { TeachingDb } from "../../../teaching/db/client.js";
import * as teachingSchema from "../../../teaching/db/schema.js";
import * as profileSchema from "../../../profile/db/schema.js";
import type { ProfileDb } from "../../../profile/db/client.js";
import type { GamificationDb } from "../client.js";
import * as gamificationSchema from "../schema.js";
import type { VocabularyDb } from "../../../vocabulary/db/client.js";
import * as vocabularySchema from "../../../vocabulary/db/schema.js";
import type { CommerceDb } from "../../../commerce/db/client.js";
import * as commerceSchema from "../../../commerce/db/schema.js";
import type { MemoryDb } from "../../../memory/db/client.js";
import * as memorySchema from "../../../memory/db/schema.js";

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
  teachingDb: TeachingDb;
  newsletterDb: NewsletterDb;
  commerceDb: CommerceDb;
  memoryDb: MemoryDb;
  /** Inserts a real `users` row and returns its id — every gamification row has a foreign key to `users`. */
  seedUser: (email?: string, role?: "STUDENT" | "TEACHER" | "ADMIN") => Promise<string>;
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
 * Exercises, Gamification, Vocabulary, Phonetics, Video (retired: created, then dropped), Teaching and
 * Newsletter, each set tracked in its own table
 * exactly as `drizzle-kit migrate` does. It is the whole application's schema, which is what the E2E
 * composition needs; the gamification repository tests use it too. Same approach as the other
 * contexts' test-support —
 * see docs/adr/adr-005-database.md. Test-only.
 */
export async function createGamificationTestDb(): Promise<GamificationTestDbHandle> {
  const base = await createPgliteTestDb({
    contexts: [
      "profile",
      "lessons",
      "exercises",
      "gamification",
      "vocabulary",
      "phonetics",
      // Retired (M11): its migrations still run — create, then drop `video_generation_jobs` — so
      // the drop is exercised exactly as on a deployed database.
      "video",
      "teaching",
      "newsletter",
      "commerce",
      "memory",
    ],
    schema: {
      ...identitySchema,
      ...profileSchema,
      ...lessonsSchema,
      ...exercisesSchema,
      ...gamificationSchema,
      ...vocabularySchema,
      ...phoneticsSchema,
      ...teachingSchema,
      ...newsletterSchema,
      ...commerceSchema,
      ...memorySchema,
    },
    truncate: [
      "memory_reviews",
      "memory_cards",
      "payment_events",
      "payment_customers",
      "licences",
      "purchases",
      "subscriptions",
      "admin_audit_log",
      "newsletter_subscriptions",
      "teacher_students",
      "point_transactions",
      "user_achievements",
      "user_vocabulary",
      "user_phonetic_progress",
      "exercise_attempts",
      "lesson_progress",
      "student_profiles",
      "users",
    ],
  });

  return {
    db: base.as<GamificationDb>(),
    identityDb: base.as<IdentityDb>(),
    profileDb: base.as<ProfileDb>(),
    lessonsDb: base.as<LessonsDb>(),
    exercisesDb: base.as<ExercisesDb>(),
    vocabularyDb: base.as<VocabularyDb>(),
    phoneticsDb: base.as<PhoneticsDb>(),
    teachingDb: base.as<TeachingDb>(),
    newsletterDb: base.as<NewsletterDb>(),
    commerceDb: base.as<CommerceDb>(),
    memoryDb: base.as<MemoryDb>(),
    seedUser: base.seedUser,
    reset: base.reset,
    rawExecute: base.rawExecute,
    close: base.close,
  };
}
