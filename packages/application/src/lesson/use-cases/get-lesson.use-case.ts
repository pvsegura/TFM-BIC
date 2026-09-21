import type { ContentItem, LessonId } from "@tfm-bic/domain";

import type { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { findVisibleLesson } from "../find-visible-lesson.js";
import type { LessonProgressRepository } from "../ports/lesson-progress-repository.js";
import { toProgressView, type LessonProgressView } from "../progress-view.js";

export interface GetLessonInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  lessonId: LessonId;
}

export interface LessonDetail {
  /** The lesson exactly as the content defines it, blocks included. */
  lesson: ContentItem;
  /** This student's progress, kept apart from the lesson so content is never per-student. */
  progress: LessonProgressView;
}

/**
 * One visible lesson with its body and the student's own progress. Opening a
 * lesson is a read: it never records progress (starting is its own action), so
 * a `GET` has no side effects.
 */
export class GetLessonUseCase {
  constructor(
    private readonly getContent: GetContentUseCase,
    private readonly progressRepository: LessonProgressRepository,
  ) {}

  async execute(input: GetLessonInput): Promise<LessonDetail> {
    const lesson = await findVisibleLesson(this.getContent, input.lessonId);
    const progress = await this.progressRepository.findByUserAndLesson(input.userId, lesson.id);
    return { lesson, progress: toProgressView(progress) };
  }
}
