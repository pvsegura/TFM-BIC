import type {
  LearnerActivityRecord,
  LearnerAttemptRecord,
  LearnerExerciseStats,
  LearnerInsightsReadModel,
  LearnerProgressSummary,
} from "@tfm-bic/application";
import type { ExerciseAnswerValue, StoredLessonProgressStatus } from "@tfm-bic/domain";
import { sql, type SQL } from "drizzle-orm";

import type { CoachDb } from "./db/client.js";

/**
 * The AI Coach's learner aggregates (M23, ADR-034), in SQL.
 *
 * Authorisation is structural: **every statement below begins from one bound `user_id` parameter**
 * that the caller took from the session, and no method accepts anything else that identifies a
 * person. There is no teacher id, no roster, no "all users" branch and no way to widen the scope
 * from an argument — a crafted tool call cannot reach another learner's rows because no statement
 * here can express that. Each is one round trip with an explicit `LIMIT`, served by the
 * `user_id`-leading index each table already has.
 *
 * Nothing here writes, and nothing here reads a column the coach does not need: no email, no name,
 * no password hash, no session, no token.
 */

type Row = Record<string, unknown>;

/** Counts come back as `int`/`bigint` and sums as `numeric`; cast in SQL, coerce here. */
const num = (value: unknown): number => Number(value ?? 0);
const date = (value: unknown): Date =>
  value instanceof Date ? value : new Date(value as string | number);
const dateOrNull = (value: unknown): Date | null =>
  value === null || value === undefined ? null : date(value);

/** Rows a single tool call may ever pull, whatever it asks for. */
const HARD_LIMIT = 25;

function bounded(limit: number): number {
  return Math.min(HARD_LIMIT, Math.max(1, Math.trunc(limit)));
}

export class DrizzleLearnerInsightsReadModel implements LearnerInsightsReadModel {
  constructor(private readonly db: CoachDb) {}

  private async rows(query: SQL): Promise<Row[]> {
    const result = await this.db.execute(query);
    return result.rows;
  }

  /**
   * One statement for the whole summary: each table is scanned once for this user through its own
   * index, and the results are combined by the outer SELECT. Counting in SQL rather than fetching
   * rows keeps the cost independent of how much the learner has done.
   */
  async loadProgressSummary(userId: string): Promise<LearnerProgressSummary> {
    const [row = {}] = await this.rows(sql`
      WITH lessons AS (
        SELECT
          count(*) FILTER (WHERE status = 'completed')::int AS completed,
          count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
          max(updated_at) AS last_at
        FROM lesson_progress WHERE user_id = ${userId}::uuid
      ),
      attempts AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE correct)::int AS correct,
          count(DISTINCT exercise_id) FILTER (WHERE correct)::int AS ever_correct,
          max(answered_at) AS last_at
        FROM exercise_attempts WHERE user_id = ${userId}::uuid
      ),
      vocabulary AS (
        SELECT
          count(*) FILTER (WHERE status = 'saved')::int AS saved,
          count(*) FILTER (WHERE status = 'learning')::int AS learning,
          count(*) FILTER (WHERE status = 'learned')::int AS learned
        FROM user_vocabulary WHERE user_id = ${userId}::uuid
      ),
      points AS (
        SELECT coalesce(sum(amount), 0)::int AS total
        FROM point_transactions WHERE user_id = ${userId}::uuid
      )
      SELECT
        lessons.completed, lessons.in_progress,
        attempts.total AS attempts, attempts.correct, attempts.ever_correct,
        vocabulary.saved, vocabulary.learning, vocabulary.learned,
        points.total AS points,
        greatest(lessons.last_at, attempts.last_at) AS last_activity_at
      FROM lessons, attempts, vocabulary, points`);

    return {
      lessonsCompleted: num(row.completed),
      lessonsInProgress: num(row.in_progress),
      exerciseAttempts: num(row.attempts),
      correctAttempts: num(row.correct),
      exercisesEverCorrect: num(row.ever_correct),
      vocabularySaved: num(row.saved),
      vocabularyLearning: num(row.learning),
      vocabularyLearned: num(row.learned),
      points: num(row.points),
      lastActivityAt: dateOrNull(row.last_activity_at),
    };
  }

  /**
   * Lessons and attempts interleaved by time. Each half is limited before the union, so the
   * database never sorts a learner's whole history to return six rows.
   */
  async loadRecentActivity(
    userId: string,
    limit: number,
  ): Promise<readonly LearnerActivityRecord[]> {
    const capped = bounded(limit);
    const rows = await this.rows(sql`
      WITH recent_lessons AS (
        SELECT 'lesson' AS kind, lesson_id AS content_id, status, NULL::boolean AS correct,
               updated_at AS at
        FROM lesson_progress WHERE user_id = ${userId}::uuid
        ORDER BY updated_at DESC LIMIT ${capped}
      ),
      recent_attempts AS (
        SELECT 'exercise' AS kind, exercise_id AS content_id, NULL AS status, correct,
               answered_at AS at
        FROM exercise_attempts WHERE user_id = ${userId}::uuid
        ORDER BY answered_at DESC, id DESC LIMIT ${capped}
      )
      SELECT * FROM (SELECT * FROM recent_lessons UNION ALL SELECT * FROM recent_attempts) AS events
      ORDER BY at DESC LIMIT ${capped}`);

    return rows.map((row) => ({
      kind: row.kind === "lesson" ? "lesson" : "exercise",
      contentId: String(row.content_id),
      lessonStatus:
        typeof row.status === "string" ? (row.status as StoredLessonProgressStatus) : undefined,
      correct: typeof row.correct === "boolean" ? row.correct : undefined,
      at: date(row.at),
    }));
  }

  /**
   * The learner's own attempt counts per exercise, worst first: never-correct exercises before
   * ones they have eventually got right, then the most-attempted. This is an ordering of **stored
   * counts**, not a model — the coach reports the counts and says what they mean (ADR-034).
   */
  async loadWeakestExercises(
    userId: string,
    limit: number,
  ): Promise<readonly LearnerExerciseStats[]> {
    const rows = await this.rows(sql`
      SELECT exercise_id,
             count(*)::int AS attempts,
             count(*) FILTER (WHERE correct)::int AS correct_attempts,
             bool_or(correct) AS ever_correct,
             max(answered_at) AS last_attempt_at
      FROM exercise_attempts
      WHERE user_id = ${userId}::uuid
      GROUP BY exercise_id
      ORDER BY bool_or(correct) ASC, count(*) DESC, max(answered_at) DESC
      LIMIT ${bounded(limit)}`);

    return rows.map((row) => ({
      exerciseId: String(row.exercise_id),
      attempts: num(row.attempts),
      correctAttempts: num(row.correct_attempts),
      everCorrect: row.ever_correct === true,
      lastAttemptAt: date(row.last_attempt_at),
    }));
  }

  /**
   * This learner's attempts at one exercise, newest first. `id DESC` breaks ties on
   * `answered_at`, so "the latest attempt" is the later insert — the same rule M7's own
   * summarisation uses.
   */
  async loadExerciseAttempts(
    userId: string,
    exerciseId: string,
    limit: number,
  ): Promise<readonly LearnerAttemptRecord[]> {
    const rows = await this.rows(sql`
      SELECT submitted_answer, correct, answered_at
      FROM exercise_attempts
      WHERE user_id = ${userId}::uuid AND exercise_id = ${exerciseId}
      ORDER BY answered_at DESC, id DESC
      LIMIT ${bounded(limit)}`);

    return rows.map((row) => ({
      submittedAnswer: row.submitted_answer as ExerciseAnswerValue,
      correct: row.correct === true,
      answeredAt: date(row.answered_at),
    }));
  }
}
