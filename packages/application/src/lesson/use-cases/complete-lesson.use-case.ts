import type { LessonId } from "@tfm-bic/domain";

import type { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import type { Clock } from "../../ports/clock.js";
import { findVisibleLesson } from "../find-visible-lesson.js";
import type { LessonProgressRepository } from "../ports/lesson-progress-repository.js";
import { toProgressView, type LessonProgressView } from "../progress-view.js";

export interface CompleteLessonInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  lessonId: LessonId;
}

/**
 * The one way a lesson becomes completed: an explicit request from the student
 * for a lesson they can see. Opening or reading a lesson never completes it.
 * The completion time is the server's clock, never the client's, and the
 * operation is idempotent — repeating it leaves one completed record with its
 * original completion time. It awards nothing: no points, scores or
 * achievements exist yet, and this stays a clean foundation for them.
 */
export class CompleteLessonUseCase {
  constructor(
    private readonly getContent: GetContentUseCase,
    private readonly progressRepository: LessonProgressRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CompleteLessonInput): Promise<LessonProgressView> {
    const lesson = await findVisibleLesson(this.getContent, input.lessonId);
    const progress = await this.progressRepository.complete(
      input.userId,
      lesson.id,
      this.clock.now(),
    );
    return toProgressView(progress);
  }
}
