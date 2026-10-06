import type {
  LearnerActivityRecord,
  LearnerAttemptRecord,
  LearnerExerciseStats,
  LearnerInsightsReadModel,
  LearnerProgressSummary,
} from "../ports/learner-insights-read-model.js";

/**
 * An in-memory `LearnerInsightsReadModel` for tests (M23, ADR-034).
 *
 * It keeps records **per user id** and refuses to be careless about it: a test can store data for
 * two learners and assert that a coaching turn for one never returns the other's rows, which is the
 * IDOR scenario the brief asks to be tested. Like the real adapter, nothing here is global state
 * that could leak between users by accident.
 */
export class FakeLearnerInsightsReadModel implements LearnerInsightsReadModel {
  readonly summaries = new Map<string, LearnerProgressSummary>();
  readonly activity = new Map<string, LearnerActivityRecord[]>();
  readonly weakest = new Map<string, LearnerExerciseStats[]>();
  /** Keyed by `${userId}|${exerciseId}`. */
  readonly attempts = new Map<string, LearnerAttemptRecord[]>();

  /** Calls made, so a test can prove a tool was (or was not) reached. */
  readonly calls: { method: string; userId: string }[] = [];

  static emptySummary(): LearnerProgressSummary {
    return {
      lessonsCompleted: 0,
      lessonsInProgress: 0,
      exerciseAttempts: 0,
      correctAttempts: 0,
      exercisesEverCorrect: 0,
      vocabularySaved: 0,
      vocabularyLearning: 0,
      vocabularyLearned: 0,
      points: 0,
      lastActivityAt: null,
    };
  }

  loadProgressSummary(userId: string): Promise<LearnerProgressSummary> {
    this.calls.push({ method: "loadProgressSummary", userId });
    return Promise.resolve(
      this.summaries.get(userId) ?? FakeLearnerInsightsReadModel.emptySummary(),
    );
  }

  loadRecentActivity(userId: string, limit: number): Promise<readonly LearnerActivityRecord[]> {
    this.calls.push({ method: "loadRecentActivity", userId });
    return Promise.resolve((this.activity.get(userId) ?? []).slice(0, limit));
  }

  loadWeakestExercises(userId: string, limit: number): Promise<readonly LearnerExerciseStats[]> {
    this.calls.push({ method: "loadWeakestExercises", userId });
    return Promise.resolve((this.weakest.get(userId) ?? []).slice(0, limit));
  }

  loadExerciseAttempts(
    userId: string,
    exerciseId: string,
    limit: number,
  ): Promise<readonly LearnerAttemptRecord[]> {
    this.calls.push({ method: "loadExerciseAttempts", userId });
    return Promise.resolve((this.attempts.get(`${userId}|${exerciseId}`) ?? []).slice(0, limit));
  }
}
