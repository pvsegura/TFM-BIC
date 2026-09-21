import {
  ContentNotFoundError,
  isLesson,
  LessonNotFoundError,
  type ContentItem,
  type LessonId,
} from "@tfm-bic/domain";

import type { GetContentUseCase } from "../content/use-cases/get-content.use-case.js";

/**
 * The one place that decides whether a student may see a lesson. It builds on
 * `GetContentUseCase`, so a lesson is visible under exactly the rules M5 already
 * enforces for content (published, active language, available level) — those
 * rules are not restated here — plus one of its own: the item must be a
 * `lesson`. Every reason it is not visible is the same `LessonNotFoundError`,
 * so a caller cannot tell a draft from a typo.
 */
export async function findVisibleLesson(
  getContent: GetContentUseCase,
  lessonId: LessonId,
): Promise<ContentItem> {
  let item: ContentItem;
  try {
    item = await getContent.execute({ contentId: lessonId });
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      throw new LessonNotFoundError(lessonId);
    }
    throw error;
  }
  if (!isLesson(item)) {
    throw new LessonNotFoundError(lessonId);
  }
  return item;
}
