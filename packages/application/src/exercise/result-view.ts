import {
  resultStatusOf,
  type ExerciseAttemptSummary,
  type ExerciseResultStatus,
} from "@tfm-bic/domain";

/**
 * A student's standing on one exercise as the rest of the system sees it: always
 * present, with `unanswered` (and no time) standing in for "no attempts yet".
 * Derived from the attempts, never stored a second time.
 */
export interface ExerciseResultView {
  status: ExerciseResultStatus;
  attemptCount: number;
  lastAnsweredAt: Date | null;
}

export function toResultView(summary: ExerciseAttemptSummary | null): ExerciseResultView {
  return {
    status: resultStatusOf(summary),
    attemptCount: summary?.attemptCount ?? 0,
    lastAnsweredAt: summary?.latestAnsweredAt ?? null,
  };
}
