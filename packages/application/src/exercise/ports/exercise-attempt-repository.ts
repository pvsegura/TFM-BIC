import type {
  ExerciseAttempt,
  ExerciseAttemptSummary,
  ExerciseId,
  NewExerciseAttempt,
} from "@tfm-bic/domain";

/**
 * Where a student's exercise attempts are kept. Owned by this layer, implemented
 * in `packages/data` (Drizzle/Postgres). It stores attempts only: the exercise
 * itself — prompt, options, answer key — lives in content and is reached through
 * `ExerciseRepository`, so the two never mix.
 *
 * Attempts are **append-only history**. The port has one write, `record`, and no
 * way to update or delete an attempt, so a student's history — and the
 * correctness stored with each attempt — cannot be altered through it. Every
 * value in a `NewExerciseAttempt` is decided by the server (the session's user,
 * the evaluator's verdict, the `Clock`'s time); a repository never decides
 * correctness or what a student may see.
 */
export interface ExerciseAttemptRepository {
  /** Appends one attempt, atomically, and returns it with its assigned id. */
  record(attempt: NewExerciseAttempt): Promise<ExerciseAttempt>;
  /**
   * Each named exercise's standing for one student — number of attempts and how
   * the latest went — in one round trip (a list must not cost a query per
   * exercise). Exercises the student has not attempted are absent from the
   * result, which is in no guaranteed order. Only the given student's attempts
   * are ever considered.
   */
  findSummaries(
    userId: string,
    exerciseIds: readonly ExerciseId[],
  ): Promise<readonly ExerciseAttemptSummary[]>;
}
