import type {
  Clock,
  UserVocabularyRepository,
  VocabularyEventPublisher,
} from "@tfm-bic/application";
import {
  createVocabularyDb,
  DrizzleUserVocabularyRepository,
  NoopVocabularyEventPublisher,
  SystemClock,
  type VocabularyDb,
} from "@tfm-bic/data";

/**
 * Everything the vocabulary routes need beyond the content dependencies (vocabulary content is
 * the M9 files, reached through `ContentDependencies`): the student's own state store, the clock
 * that stamps it, and the event publisher a future milestone can replace to react to a learned
 * word without vocabulary depending on it. One bag so `server.ts` doesn't hand-wire constructors
 * and tests can substitute fakes (see apps/api/src/test-support/build-test-deps.ts).
 * Composition-root wiring only, so it is excluded from coverage like exercise-dependencies.ts
 * (see vitest.config.ts).
 */
export interface VocabularyDependencies {
  userVocabularyRepository: UserVocabularyRepository;
  clock: Clock;
  events: VocabularyEventPublisher;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

export function buildVocabularyDependencies(
  db: VocabularyDb,
  close: () => Promise<void>,
): VocabularyDependencies {
  return {
    userVocabularyRepository: new DrizzleUserVocabularyRepository(db),
    clock: new SystemClock(),
    events: new NoopVocabularyEventPublisher(),
    close,
  };
}

/** The real, production adapter — Drizzle/Postgres over `DATABASE_URL`. */
export function createVocabularyDependencies(databaseUrl: string): VocabularyDependencies {
  const { db, close } = createVocabularyDb(databaseUrl);
  return buildVocabularyDependencies(db, close);
}
