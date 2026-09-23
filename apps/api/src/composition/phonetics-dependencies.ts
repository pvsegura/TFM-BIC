import type { Clock, UserPhoneticProgressRepository } from "@tfm-bic/application";
import {
  createPhoneticsDb,
  DrizzleUserPhoneticProgressRepository,
  SystemClock,
  type PhoneticsDb,
} from "@tfm-bic/data";

/**
 * Everything the phonetics routes need beyond the content dependencies (phonetics content is the
 * M10 files, reached through `ContentDependencies`): the student's own progress store and the
 * clock that stamps it. One bag so `server.ts` doesn't hand-wire constructors and tests can
 * substitute fakes (see apps/api/src/test-support/build-test-deps.ts). Composition-root wiring
 * only, so it is excluded from coverage like vocabulary-dependencies.ts (see vitest.config.ts).
 */
export interface PhoneticsDependencies {
  userPhoneticProgressRepository: UserPhoneticProgressRepository;
  clock: Clock;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

export function buildPhoneticsDependencies(
  db: PhoneticsDb,
  close: () => Promise<void>,
): PhoneticsDependencies {
  return {
    userPhoneticProgressRepository: new DrizzleUserPhoneticProgressRepository(db),
    clock: new SystemClock(),
    close,
  };
}

/** The real, production adapter — Drizzle/Postgres over `DATABASE_URL`. */
export function createPhoneticsDependencies(databaseUrl: string): PhoneticsDependencies {
  const { db, close } = createPhoneticsDb(databaseUrl);
  return buildPhoneticsDependencies(db, close);
}
