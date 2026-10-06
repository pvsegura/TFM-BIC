import type { ExerciseAnswerValue, StoredLessonProgressStatus } from "@tfm-bic/domain";

/**
 * Aggregates of **one learner's own** stored records (M6 lesson progress, M7 attempts, M9
 * vocabulary, M8 points), for the AI Coach's tools (M23, ADR-034).
 *
 * Why a read model rather than the existing repositories: the coach asks questions none of them
 * answer — "which exercises does this learner keep getting wrong", "what did they do recently" —
 * and answering those by fetching everything and reducing it in TypeScript would cost a query per
 * exercise. Each method below is one statement with a bound `LIMIT`, served by the `user_id`-leading
 * index each table already has. It is the same technique as M13's teacher read model, with a
 * different authorisation boundary: **the session's own user id, always passed in, never a
 * parameter the model or the client can choose** (ADR-034, decision 3).
 *
 * Nothing here reads another user's rows, and nothing here writes.
 */

export interface LearnerProgressSummary {
  readonly lessonsCompleted: number;
  readonly lessonsInProgress: number;
  /** Every stored attempt (M7: every well-formed submission is an attempt), retries included. */
  readonly exerciseAttempts: number;
  readonly correctAttempts: number;
  /** How many distinct exercises the learner has ever answered correctly at least once. */
  readonly exercisesEverCorrect: number;
  readonly vocabularySaved: number;
  readonly vocabularyLearning: number;
  readonly vocabularyLearned: number;
  /** Sum of `point_transactions.amount` — M8's own derivation, never a stored balance. */
  readonly points: number;
  /** Latest of lesson progress and attempt times; `null` when the learner has done nothing yet. */
  readonly lastActivityAt: Date | null;
}

/** One thing the learner did, newest first, across lessons and exercises. */
export interface LearnerActivityRecord {
  readonly kind: "lesson" | "exercise";
  /** A content id (lesson or exercise). The caller turns it into a title from the catalog. */
  readonly contentId: string;
  /** For a lesson, its stored status; for an exercise, `undefined`. */
  readonly lessonStatus: StoredLessonProgressStatus | undefined;
  /** For an exercise, the evaluator's verdict for that attempt; for a lesson, `undefined`. */
  readonly correct: boolean | undefined;
  readonly at: Date;
}

/** How one exercise has gone for this learner — the basis of "weak areas", counted, not scored. */
export interface LearnerExerciseStats {
  readonly exerciseId: string;
  readonly attempts: number;
  readonly correctAttempts: number;
  /** Whether the learner has ever got it right; the coach treats "never" differently from "slowly". */
  readonly everCorrect: boolean;
  readonly lastAttemptAt: Date;
}

/** One stored attempt, for explaining a specific mistake. */
export interface LearnerAttemptRecord {
  readonly submittedAnswer: ExerciseAnswerValue;
  readonly correct: boolean;
  readonly answeredAt: Date;
}

export interface LearnerInsightsReadModel {
  /** Counts for the whole account. Language filtering happens on content ids in the caller. */
  loadProgressSummary(userId: string): Promise<LearnerProgressSummary>;
  /** The most recent `limit` lesson and exercise events, newest first. */
  loadRecentActivity(userId: string, limit: number): Promise<readonly LearnerActivityRecord[]>;
  /**
   * Per-exercise standing for the exercises this learner has attempted, worst first (never correct
   * before partly correct, then by attempts), capped at `limit`. Exercises never attempted are
   * absent — the coach must not report a weakness in something untouched.
   */
  loadWeakestExercises(userId: string, limit: number): Promise<readonly LearnerExerciseStats[]>;
  /** This learner's attempts at one exercise, newest first, capped at `limit`. */
  loadExerciseAttempts(
    userId: string,
    exerciseId: string,
    limit: number,
  ): Promise<readonly LearnerAttemptRecord[]>;
}
