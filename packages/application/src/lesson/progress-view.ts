import { progressStatusOf, type LessonProgress, type LessonProgressStatus } from "@tfm-bic/domain";

/**
 * A student's progress in one lesson as the rest of the system sees it: always
 * present, with `not_started` (and no times) standing in for "no record yet".
 * Only what a student may be shown — never the user id, which is theirs already.
 */
export interface LessonProgressView {
  status: LessonProgressStatus;
  startedAt: Date | null;
  completedAt: Date | null;
}

export function toProgressView(progress: LessonProgress | null): LessonProgressView {
  return {
    status: progressStatusOf(progress),
    startedAt: progress?.startedAt ?? null,
    completedAt: progress?.completedAt ?? null,
  };
}
