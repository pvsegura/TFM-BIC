import type { ProfileRepository } from "@tfm-bic/application";
import { createProfileDb, DrizzleProfileRepository, type ProfileDb } from "@tfm-bic/data";

/**
 * Everything the profile routes need, behind one bag so `server.ts` doesn't
 * hand-wire constructors and tests can substitute fakes (see
 * apps/api/src/test-support/build-test-deps.ts). Composition-root wiring
 * only, so it is excluded from coverage like auth-dependencies.ts (see
 * vitest.config.ts).
 */
export interface ProfileDependencies {
  profileRepository: ProfileRepository;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

export function buildProfileDependencies(
  db: ProfileDb,
  close: () => Promise<void>,
): ProfileDependencies {
  return { profileRepository: new DrizzleProfileRepository(db), close };
}

/** The real, production adapter — Drizzle/Postgres over `DATABASE_URL`. */
export function createProfileDependencies(databaseUrl: string): ProfileDependencies {
  const { db, close } = createProfileDb(databaseUrl);
  return buildProfileDependencies(db, close);
}
