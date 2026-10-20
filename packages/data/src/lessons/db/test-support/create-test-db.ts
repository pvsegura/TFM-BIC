import type { SQL } from "drizzle-orm";

import { createPgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { ProfileDb } from "../../../profile/db/client.js";
import * as profileSchema from "../../../profile/db/schema.js";
import type { LessonsDb } from "../client.js";
import * as lessonsSchema from "../schema.js";

export interface LessonsTestDbHandle {
  db: LessonsDb;
  /** The same database instance viewed as the other contexts' handles — lets a
   * NODE_ENV=test composition root build auth, profile and lesson repositories
   * over one shared database (both `student_profiles` and `lesson_progress`
   * have a foreign key to `users`). */
  identityDb: IdentityDb;
  profileDb: ProfileDb;
  /** Inserts a real `users` row and returns its id — `lesson_progress` has a
   * foreign key to `users`, so progress can only exist for a real user. */
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
 * A real (WASM-compiled) Postgres with every bounded context's migrations
 * applied in dependency order — Identity first (the FK target `users` must
 * exist), then Student Profile and Lessons, each set tracked in its own table
 * exactly as `drizzle-kit migrate` does. It is the whole application's schema,
 * which is what the E2E composition needs; the lesson repository tests use it
 * too. Same approach as the other contexts' test-support — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createLessonsTestDb(): Promise<LessonsTestDbHandle> {
  const base = await createPgliteTestDb({
    contexts: ["profile", "lessons"],
    schema: { ...identitySchema, ...profileSchema, ...lessonsSchema },
    truncate: ["lesson_progress", "student_profiles", "users"],
  });

  return {
    db: base.as<LessonsDb>(),
    identityDb: base.as<IdentityDb>(),
    profileDb: base.as<ProfileDb>(),
    seedUser: base.seedUser,
    reset: base.reset,
    rawExecute: base.rawExecute,
    close: base.close,
  };
}
