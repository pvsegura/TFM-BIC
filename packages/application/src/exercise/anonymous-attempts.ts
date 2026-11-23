import type { ExerciseAttempt, ExerciseId, NewExerciseAttempt } from "@verbysia/domain";

import type { ExerciseAttemptRepository } from "./ports/exercise-attempt-repository.js";

/**
 * Attempts for a visitor without an account (Verbysia's free demo): answers are evaluated by the
 * same server-side rules, but nothing is stored and there is no history — so the regular exercise
 * use cases can serve the demo unchanged. Only free lessons reach it (the route's licence gate).
 */
export class AnonymousExerciseAttempts implements ExerciseAttemptRepository {
  record(attempt: NewExerciseAttempt): Promise<ExerciseAttempt> {
    return Promise.resolve({ id: 0, ...attempt });
  }

  findSummaries(_userId: string, _exerciseIds: readonly ExerciseId[]) {
    return Promise.resolve([]);
  }
}

/** The pseudo user id the demo passes to the exercise use cases (never stored anywhere). */
export const ANONYMOUS_LEARNER = "anonymous";
