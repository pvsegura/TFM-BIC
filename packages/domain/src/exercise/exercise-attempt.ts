import type { ExerciseAnswerValue } from "./exercise-answer.js";
import type { ExerciseId } from "./exercise-id.js";

/**
 * One submitted answer. **Every submission is an attempt** and attempts are
 * history: they are only ever added — never updated, replaced or deleted — so a
 * retry leaves the earlier attempts exactly as they were, and future progress,
 * points or adaptive features can be computed from the raw record without a
 * redesign. Nothing here is computed for them (no score, points or streak).
 *
 * Everything but the answer is the server's: the user comes from the session,
 * `correct` from the evaluator and `answeredAt` from the clock.
 */
export interface ExerciseAttempt {
  /** Assigned by storage, ascending: a later insert always has a greater id. */
  id: number;
  userId: string;
  exerciseId: ExerciseId;
  submittedAnswer: ExerciseAnswerValue;
  correct: boolean;
  answeredAt: Date;
}

/** An attempt about to be stored: everything except the id storage assigns. */
export type NewExerciseAttempt = Omit<ExerciseAttempt, "id">;

/**
 * A student's standing on one exercise, derived from their attempts (never
 * stored twice): how many they made and how the most recent one went.
 */
export interface ExerciseAttemptSummary {
  exerciseId: ExerciseId;
  attemptCount: number;
  latestCorrect: boolean;
  latestAnsweredAt: Date;
}

/** `unanswered` is derived (no attempts), never stored — like a lesson's "not started". */
export const EXERCISE_RESULT_STATUSES = ["unanswered", "correct", "incorrect"] as const;
export type ExerciseResultStatus = (typeof EXERCISE_RESULT_STATUSES)[number];

export function resultStatusOf(summary: ExerciseAttemptSummary | null): ExerciseResultStatus {
  if (summary === null) {
    return "unanswered";
  }
  return summary.latestCorrect ? "correct" : "incorrect";
}

/**
 * The one definition of "latest": the greatest `answeredAt`, and among equal
 * times the greatest id (the later insert). The SQL repository implements the
 * same ordering, and its tests hold it to this.
 */
export function summarizeAttempts(
  exerciseId: ExerciseId,
  attempts: readonly ExerciseAttempt[],
): ExerciseAttemptSummary | null {
  let latest: ExerciseAttempt | null = null;
  let attemptCount = 0;

  for (const candidate of attempts) {
    if (candidate.exerciseId !== exerciseId) {
      continue;
    }
    attemptCount += 1;
    const isLater =
      latest === null ||
      candidate.answeredAt.getTime() > latest.answeredAt.getTime() ||
      (candidate.answeredAt.getTime() === latest.answeredAt.getTime() && candidate.id > latest.id);
    if (isLater) {
      latest = candidate;
    }
  }

  return latest === null
    ? null
    : {
        exerciseId,
        attemptCount,
        latestCorrect: latest.correct,
        latestAnsweredAt: latest.answeredAt,
      };
}
