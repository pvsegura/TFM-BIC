import {
  CompleteLessonUseCase,
  CompleteLessonWithRewardsUseCase,
  GetLessonUseCase,
  ListLessonsUseCase,
  StartLessonUseCase,
} from "@tfm-bic/application";

import type { ContentUseCases } from "./content-use-cases.js";
import type { GamificationUseCases } from "./gamification-use-cases.js";
import type { LessonDependencies } from "./lesson-dependencies.js";

export interface LessonUseCases {
  listLessons: ListLessonsUseCase;
  getLesson: GetLessonUseCase;
  startLesson: StartLessonUseCase;
  /** M6's completion flow, followed by the M8 reward for the first completion. */
  completeLesson: CompleteLessonWithRewardsUseCase;
}

/**
 * Composition-root wiring only. The lesson use cases are built on the content
 * use cases — visibility rules are M5's and are reused, not restated — and add
 * only the student's progress store and the clock. Completing is wrapped, not
 * changed: the M6 use case persists the completion, then the reward use case grants
 * what the first completion earns.
 */
export function createLessonUseCases(
  content: ContentUseCases,
  deps: LessonDependencies,
  gamification: GamificationUseCases,
): LessonUseCases {
  const { lessonProgressRepository: progress, clock } = deps;
  return {
    listLessons: new ListLessonsUseCase(content.listContent, progress),
    getLesson: new GetLessonUseCase(content.getContent, progress),
    startLesson: new StartLessonUseCase(content.getContent, progress, clock),
    completeLesson: new CompleteLessonWithRewardsUseCase(
      new CompleteLessonUseCase(content.getContent, progress, clock),
      gamification.awardRewards,
      gamification.achievementTexts,
    ),
  };
}
