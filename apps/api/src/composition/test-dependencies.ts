import { createLessonsTestDb } from "@tfm-bic/data/testing";

import { buildAuthDependencies, type AuthDependencies } from "./auth-dependencies.js";
import { createContentDependencies, type ContentDependencies } from "./content-dependencies.js";
import { buildLessonDependencies, type LessonDependencies } from "./lesson-dependencies.js";
import { buildProfileDependencies, type ProfileDependencies } from "./profile-dependencies.js";

/**
 * Same real adapters as the production composition, except the database is
 * one in-process PGlite instance (a real, WASM-compiled Postgres — not a
 * mock) instead of a live Postgres connection — see
 * docs/adr/adr-005-database.md. Used only when `NODE_ENV=test`
 * (apps/api/src/index.ts) so E2E tests run against the real server/HTTP
 * stack with no Docker or network database.
 *
 * Auth, profile and lessons deliberately share that single instance: in
 * production they are one database, and both `student_profiles` and
 * `lesson_progress` have a foreign key to `users`, so they can only exist
 * alongside the user they belong to. The instance is closed once, via
 * `auth.close`; the other `close`s are no-ops so shutting everything down
 * never closes it twice.
 */
export async function createTestDependencies(contentDir?: string): Promise<{
  auth: AuthDependencies;
  profile: ProfileDependencies;
  content: ContentDependencies;
  lessons: LessonDependencies;
}> {
  const { db, identityDb, profileDb, close } = await createLessonsTestDb();

  return {
    auth: buildAuthDependencies(identityDb, close),
    profile: buildProfileDependencies(profileDb, () => Promise.resolve()),
    // The real content tree, so E2E exercises the shipped Polish A1 content end to end.
    content: await createContentDependencies(contentDir),
    lessons: buildLessonDependencies(db, () => Promise.resolve()),
  };
}
