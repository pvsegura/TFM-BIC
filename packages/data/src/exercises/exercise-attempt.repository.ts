import type { ExerciseAttemptRepository } from "@tfm-bic/application";
import {
  createExerciseId,
  type ExerciseAttempt,
  type ExerciseAttemptSummary,
  type ExerciseId,
  type NewExerciseAttempt,
} from "@tfm-bic/domain";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { ExercisesDb } from "./db/client.js";
import { exerciseAttempts } from "./db/schema.js";

function toAttempt(row: typeof exerciseAttempts.$inferSelect): ExerciseAttempt {
  return {
    id: row.id,
    userId: row.userId,
    // Validated again on the way out: a row that somehow holds a malformed id fails
    // loudly here instead of leaking an unchecked string to callers.
    exerciseId: createExerciseId(row.exerciseId),
    submittedAnswer: row.submittedAnswer,
    correct: row.correct,
    answeredAt: row.answeredAt,
  };
}

/**
 * Exercise attempts in Postgres — append-only. `record` is one `INSERT`, so it is
 * atomic on its own; nothing here updates or deletes an attempt, and the class
 * has no method that could. Every value written is the caller's (the session's
 * user, the evaluator's verdict, the `Clock`'s time): the database's `now()` is
 * never used and nothing is decided here.
 */
export class DrizzleExerciseAttemptRepository implements ExerciseAttemptRepository {
  constructor(private readonly db: ExercisesDb) {}

  async record(attempt: NewExerciseAttempt): Promise<ExerciseAttempt> {
    const [row] = await this.db
      .insert(exerciseAttempts)
      .values({
        userId: attempt.userId,
        exerciseId: attempt.exerciseId,
        submittedAnswer: attempt.submittedAnswer,
        correct: attempt.correct,
        answeredAt: attempt.answeredAt,
      })
      .returning();
    if (!row) {
      throw new Error("Insert into exercise_attempts returned no row.");
    }
    return toAttempt(row);
  }

  async findSummaries(
    userId: string,
    exerciseIds: readonly ExerciseId[],
  ): Promise<readonly ExerciseAttemptSummary[]> {
    if (exerciseIds.length === 0) {
      return [];
    }

    // One query for the whole list. `count(*) OVER (PARTITION BY exercise_id)` is
    // computed over the student's own rows before `DISTINCT ON` keeps one row per
    // exercise, and the ORDER BY makes that row the latest attempt: greatest
    // `answered_at`, ties broken by the greater (later-inserted) id — the same
    // definition as the domain's `summarizeAttempts`.
    const rows = await this.db
      .selectDistinctOn([exerciseAttempts.exerciseId], {
        exerciseId: exerciseAttempts.exerciseId,
        correct: exerciseAttempts.correct,
        answeredAt: exerciseAttempts.answeredAt,
        attemptCount:
          sql<number>`count(*) OVER (PARTITION BY ${exerciseAttempts.exerciseId})`.mapWith(Number),
      })
      .from(exerciseAttempts)
      .where(
        and(
          eq(exerciseAttempts.userId, userId),
          inArray(exerciseAttempts.exerciseId, [...exerciseIds]),
        ),
      )
      .orderBy(
        exerciseAttempts.exerciseId,
        desc(exerciseAttempts.answeredAt),
        desc(exerciseAttempts.id),
      );

    return rows.map((row) => ({
      exerciseId: createExerciseId(row.exerciseId),
      attemptCount: row.attemptCount,
      latestCorrect: row.correct,
      latestAnsweredAt: row.answeredAt,
    }));
  }
}
