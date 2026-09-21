import type { LessonProgressRepository } from "@tfm-bic/application";
import { createContentId, type LessonId, type LessonProgress } from "@tfm-bic/domain";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { LessonsDb } from "./db/client.js";
import { lessonProgress } from "./db/schema.js";

function toLessonProgress(row: typeof lessonProgress.$inferSelect): LessonProgress {
  return {
    userId: row.userId,
    // Validated again on the way out: a row that somehow holds a malformed id
    // fails loudly here instead of leaking an unchecked string to callers.
    lessonId: createContentId(row.lessonId),
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Lesson progress in Postgres. `start` and `complete` are each one atomic
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, so they need no separate
 * read: two racing requests cannot create a duplicate row, and a `start` that
 * loses a race to a `complete` cannot move the lesson back to "in progress".
 * The rules they implement are the domain's `startLesson` / `completeLesson`
 * (the in-memory fake applies those functions directly; the tests in this
 * package prove the SQL behaves the same). Every timestamp is the caller's,
 * never the database's `now()`.
 */
export class DrizzleLessonProgressRepository implements LessonProgressRepository {
  constructor(private readonly db: LessonsDb) {}

  async findByUserAndLesson(userId: string, lessonId: LessonId): Promise<LessonProgress | null> {
    const [row] = await this.db
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    return row ? toLessonProgress(row) : null;
  }

  async findByUserAndLessons(
    userId: string,
    lessonIds: readonly LessonId[],
  ): Promise<readonly LessonProgress[]> {
    if (lessonIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(lessonProgress)
      .where(
        and(eq(lessonProgress.userId, userId), inArray(lessonProgress.lessonId, [...lessonIds])),
      );
    return rows.map(toLessonProgress);
  }

  async start(userId: string, lessonId: LessonId, now: Date): Promise<LessonProgress> {
    // A conflict means a record already exists — in progress or completed —
    // and starting must leave it alone. The no-op update exists only so
    // RETURNING yields that existing row in the same statement.
    const [row] = await this.db
      .insert(lessonProgress)
      .values({
        userId,
        lessonId,
        status: "in_progress",
        startedAt: now,
        completedAt: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: { updatedAt: sql`${lessonProgress.updatedAt}` },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into lesson_progress returned no row.");
    }
    return toLessonProgress(row);
  }

  async complete(userId: string, lessonId: LessonId, now: Date): Promise<LessonProgress> {
    // On a first completion the row is inserted as completed. On a conflict
    // the status becomes completed, `started_at` is untouched, and an existing
    // `completed_at` / `updated_at` is kept — that is what makes repeating it
    // change nothing.
    const [row] = await this.db
      .insert(lessonProgress)
      .values({
        userId,
        lessonId,
        status: "completed",
        startedAt: now,
        completedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          status: "completed",
          completedAt: sql`COALESCE(${lessonProgress.completedAt}, excluded.completed_at)`,
          updatedAt: sql`CASE WHEN ${lessonProgress.status} = 'completed' THEN ${lessonProgress.updatedAt} ELSE excluded.updated_at END`,
        },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into lesson_progress returned no row.");
    }
    return toLessonProgress(row);
  }
}
