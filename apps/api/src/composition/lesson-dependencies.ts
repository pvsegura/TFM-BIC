import type { Clock, LessonProgressRepository } from "@tfm-bic/application";
import {
  createLessonsDb,
  DrizzleLessonProgressRepository,
  SystemClock,
  type LessonsDb,
} from "@tfm-bic/data";

/**
 * Everything the lesson routes need beyond the content dependencies (lesson
 * content is the M5 files, reached through `ContentDependencies`): the
 * student's progress store and the clock that stamps it. One bag so
 * `server.ts` doesn't hand-wire constructors and tests can substitute fakes
 * (see apps/api/src/test-support/build-test-deps.ts). Composition-root wiring
 * only, so it is excluded from coverage like profile-dependencies.ts (see
 * vitest.config.ts).
 */
export interface LessonDependencies {
  lessonProgressRepository: LessonProgressRepository;
  clock: Clock;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

export function buildLessonDependencies(
  db: LessonsDb,
  close: () => Promise<void>,
): LessonDependencies {
  return {
    lessonProgressRepository: new DrizzleLessonProgressRepository(db),
    clock: new SystemClock(),
    close,
  };
}

/** The real, production adapter — Drizzle/Postgres over `DATABASE_URL`. */
export function createLessonDependencies(databaseUrl: string): LessonDependencies {
  const { db, close } = createLessonsDb(databaseUrl);
  return buildLessonDependencies(db, close);
}
