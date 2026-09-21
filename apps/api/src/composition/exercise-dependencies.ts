import type { Clock, ExerciseAttemptRepository } from "@tfm-bic/application";
import {
  createExercisesDb,
  DrizzleExerciseAttemptRepository,
  SystemClock,
  type ExercisesDb,
} from "@tfm-bic/data";
import { createDefaultExerciseTypeRegistry, type ExerciseTypeRegistry } from "@tfm-bic/domain";

/**
 * Everything the exercise routes need beyond the content dependencies (exercise
 * content is the validated files, reached through `ContentDependencies`): the
 * store for a student's attempts, the clock that stamps them, and the registry of
 * exercise types the application can evaluate. One bag so `server.ts` doesn't
 * hand-wire constructors and tests can substitute fakes (see
 * apps/api/src/test-support/build-test-deps.ts). Composition-root wiring only,
 * so it is excluded from coverage like lesson-dependencies.ts (see
 * vitest.config.ts).
 */
export interface ExerciseDependencies {
  exerciseAttemptRepository: ExerciseAttemptRepository;
  clock: Clock;
  /** Only types registered here can ever be evaluated; nothing in a request or in content can add one. */
  typeRegistry: ExerciseTypeRegistry;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

export function buildExerciseDependencies(
  db: ExercisesDb,
  close: () => Promise<void>,
): ExerciseDependencies {
  return {
    exerciseAttemptRepository: new DrizzleExerciseAttemptRepository(db),
    clock: new SystemClock(),
    typeRegistry: createDefaultExerciseTypeRegistry(),
    close,
  };
}

/** The real, production adapter — Drizzle/Postgres over `DATABASE_URL`. */
export function createExerciseDependencies(databaseUrl: string): ExerciseDependencies {
  const { db, close } = createExercisesDb(databaseUrl);
  return buildExerciseDependencies(db, close);
}
