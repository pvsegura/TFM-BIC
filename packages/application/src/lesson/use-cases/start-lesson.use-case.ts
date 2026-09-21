import type { LessonId } from "@tfm-bic/domain";

import type { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import type { Clock } from "../../ports/clock.js";
import { findVisibleLesson } from "../find-visible-lesson.js";
import type { LessonProgressRepository } from "../ports/lesson-progress-repository.js";
import { toProgressView, type LessonProgressView } from "../progress-view.js";

export interface StartLessonInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  lessonId: LessonId;
}

/**
 * Records that the student has opened a lesson, so it shows as in progress
 * afterwards. The lesson must be one the student can see. Safe to repeat: a
 * lesson already in progress keeps its start time, and one already completed
 * stays completed. There is no "resume position" — only this status is kept.
 */
export class StartLessonUseCase {
  constructor(
    private readonly getContent: GetContentUseCase,
    private readonly progressRepository: LessonProgressRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: StartLessonInput): Promise<LessonProgressView> {
    const lesson = await findVisibleLesson(this.getContent, input.lessonId);
    const progress = await this.progressRepository.start(input.userId, lesson.id, this.clock.now());
    return toProgressView(progress);
  }
}
