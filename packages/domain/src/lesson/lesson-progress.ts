import type { LessonId } from "./lesson.js";

/**
 * What is stored. "Not started" is deliberately absent: it is the absence of a
 * record, so it is derived (`progressStatusOf`) instead of being a redundant
 * row per student per lesson.
 */
export const LESSON_PROGRESS_STATUSES = ["in_progress", "completed"] as const;
export type StoredLessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number];

/** What a student sees for a lesson: the stored statuses plus the derived `not_started`. */
export type LessonProgressStatus = "not_started" | StoredLessonProgressStatus;

/**
 * One student's state in one lesson. It belongs to the student; the lesson
 * itself (its text, order, language) belongs to the content and is never
 * duplicated here. Kept to what M6 needs — scores, points and time spent are
 * later milestones and can be added as further fields or tables without
 * touching lesson content.
 *
 * Invariant: `completedAt` is set if and only if `status` is `completed`.
 */
export interface LessonProgress {
  userId: string;
  lessonId: LessonId;
  status: StoredLessonProgressStatus;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

export function progressStatusOf(progress: LessonProgress | null): LessonProgressStatus {
  return progress === null ? "not_started" : progress.status;
}

/**
 * Opening a lesson starts it. The transition only ever moves forward: starting
 * a lesson that is already in progress or completed changes nothing, so
 * re-opening a finished lesson can never take it back to "in progress".
 */
export function startLesson(
  existing: LessonProgress | null,
  userId: string,
  lessonId: LessonId,
  now: Date,
): LessonProgress {
  if (existing !== null) {
    return existing;
  }
  return {
    userId,
    lessonId,
    status: "in_progress",
    startedAt: now,
    completedAt: null,
    updatedAt: now,
  };
}

/**
 * Completing is the only way a lesson becomes completed, and it is idempotent:
 * an already completed lesson is returned as it is, keeping its original
 * completion time, so repeating the action changes nothing. A lesson that was
 * never started is started and completed at the same moment.
 */
export function completeLesson(
  existing: LessonProgress | null,
  userId: string,
  lessonId: LessonId,
  now: Date,
): LessonProgress {
  if (existing?.status === "completed") {
    return existing;
  }
  return {
    userId,
    lessonId,
    status: "completed",
    startedAt: existing?.startedAt ?? now,
    completedAt: now,
    updatedAt: now,
  };
}
