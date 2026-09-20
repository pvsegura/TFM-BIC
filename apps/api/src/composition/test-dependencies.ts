import { createProfileTestDb } from "@tfm-bic/data/testing";

import { buildAuthDependencies, type AuthDependencies } from "./auth-dependencies.js";
import { createContentDependencies, type ContentDependencies } from "./content-dependencies.js";
import { buildProfileDependencies, type ProfileDependencies } from "./profile-dependencies.js";

/**
 * Same real adapters as the production composition, except the database is
 * one in-process PGlite instance (a real, WASM-compiled Postgres — not a
 * mock) instead of a live Postgres connection — see
 * docs/adr/adr-005-database.md. Used only when `NODE_ENV=test`
 * (apps/api/src/index.ts) so E2E tests run against the real server/HTTP
 * stack with no Docker or network database.
 *
 * Auth and profile deliberately share that single instance: in production
 * they are one database, and `student_profiles` has a foreign key to
 * `users`, so a profile can only exist alongside the user it belongs to. The
 * instance is closed once, via `auth.close`; `profile.close` is a no-op so
 * shutting both down never closes it twice.
 */
export async function createTestDependencies(contentDir?: string): Promise<{
  auth: AuthDependencies;
  profile: ProfileDependencies;
  content: ContentDependencies;
}> {
  const { db, identityDb, close } = await createProfileTestDb();

  return {
    auth: buildAuthDependencies(identityDb, close),
    profile: buildProfileDependencies(db, () => Promise.resolve()),
    // The real content tree, so E2E exercises the shipped Polish A1 content end to end.
    content: await createContentDependencies(contentDir),
  };
}
