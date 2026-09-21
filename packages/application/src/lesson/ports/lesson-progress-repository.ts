import type { LessonId, LessonProgress } from "@tfm-bic/domain";

/**
 * Where a student's lesson progress is kept. Owned by this layer, implemented
 * in `packages/data` (Drizzle/Postgres). It stores progress only: the lesson
 * itself — text, order, language, whether it is published — lives in content
 * and is reached through `ContentRepository`, so the two never mix.
 *
 * `lessonId` is a content id that the use cases have already resolved to a
 * published lesson; a repository never decides what a student may see. Times
 * come from the caller (the `Clock` port), never from the database, so a test
 * and a production run agree on what "now" is.
 *
 * `start` and `complete` are single atomic operations that follow the domain's
 * transition rules (`startLesson`, `completeLesson`): they only move forward
 * and repeating them changes nothing. Being atomic is what keeps two racing
 * requests from producing a duplicate row or moving a completed lesson back to
 * "in progress" — a read-then-write in the use case could not promise that.
 */
export interface LessonProgressRepository {
  findByUserAndLesson(userId: string, lessonId: LessonId): Promise<LessonProgress | null>;
  /**
   * The user's progress for several lessons in one round trip (a lesson list
   * must not cost one query per lesson). Lessons with no record are simply
   * absent from the result, which is in no guaranteed order.
   */
  findByUserAndLessons(
    userId: string,
    lessonIds: readonly LessonId[],
  ): Promise<readonly LessonProgress[]>;
  /** Creates an in-progress record if there is none; otherwise returns the existing one unchanged. */
  start(userId: string, lessonId: LessonId, now: Date): Promise<LessonProgress>;
  /** Completes the lesson. An already completed lesson is returned as it is, with its original completion time. */
  complete(userId: string, lessonId: LessonId, now: Date): Promise<LessonProgress>;
}
