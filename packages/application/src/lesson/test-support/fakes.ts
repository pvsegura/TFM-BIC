import {
  completeLesson,
  startLesson,
  type ContentCatalog,
  type LessonId,
  type LessonProgress,
} from "@tfm-bic/domain";

import { makeContentItem, makeSampleCatalog } from "../../content/test-support/fakes.js";
import type { LessonProgressRepository } from "../ports/lesson-progress-repository.js";

/** In-memory `LessonProgressRepository` for application and HTTP-layer tests.
 * It applies the same domain transition rules the real adapter implements in
 * SQL (packages/data has its own tests against a real Postgres), and counts
 * calls so a test can prove a read never wrote, a rejected request never
 * reached persistence, and a list needed one lookup rather than one per lesson.
 * Test-only. */
export class FakeLessonProgressRepository implements LessonProgressRepository {
  readonly records: LessonProgress[] = [];
  writeCalls = 0;
  batchLookups = 0;

  findByUserAndLesson(userId: string, lessonId: LessonId): Promise<LessonProgress | null> {
    return Promise.resolve(this.find(userId, lessonId));
  }

  findByUserAndLessons(
    userId: string,
    lessonIds: readonly LessonId[],
  ): Promise<readonly LessonProgress[]> {
    this.batchLookups += 1;
    return Promise.resolve(
      this.records.filter((r) => r.userId === userId && lessonIds.includes(r.lessonId)),
    );
  }

  start(userId: string, lessonId: LessonId, now: Date): Promise<LessonProgress> {
    this.writeCalls += 1;
    return Promise.resolve(
      this.save(startLesson(this.find(userId, lessonId), userId, lessonId, now)),
    );
  }

  complete(userId: string, lessonId: LessonId, now: Date): Promise<LessonProgress> {
    this.writeCalls += 1;
    return Promise.resolve(
      this.save(completeLesson(this.find(userId, lessonId), userId, lessonId, now)),
    );
  }

  /** Puts a record in place directly, without going through a use case. */
  seed(progress: LessonProgress): LessonProgress {
    return this.save(progress);
  }

  private find(userId: string, lessonId: LessonId): LessonProgress | null {
    return this.records.find((r) => r.userId === userId && r.lessonId === lessonId) ?? null;
  }

  private save(progress: LessonProgress): LessonProgress {
    const index = this.records.findIndex(
      (r) => r.userId === progress.userId && r.lessonId === progress.lessonId,
    );
    if (index === -1) {
      this.records.push(progress);
    } else {
      this.records[index] = progress;
    }
    return progress;
  }
}

/**
 * `makeSampleCatalog()` plus the two cases only lessons care about: a
 * published item that is an explanation, not a lesson, and a published lesson
 * hidden behind a level that is not available (which catalog validation rejects
 * for real content, but a use case must never rely on that to stay safe).
 */
export function makeLessonCatalog(): ContentCatalog {
  const catalog = makeSampleCatalog();
  return {
    ...catalog,
    content: [
      ...catalog.content,
      makeContentItem("pl-note", "pl", "a1", { type: "explanation", order: 50 }),
      makeContentItem("pl-planned", "pl", "a2", { order: 20 }),
    ],
  };
}
