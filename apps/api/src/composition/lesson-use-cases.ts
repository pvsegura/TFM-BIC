import {
  CompleteLessonUseCase,
  GetLessonUseCase,
  ListLessonsUseCase,
  StartLessonUseCase,
} from "@tfm-bic/application";

import type { ContentUseCases } from "./content-use-cases.js";
import type { LessonDependencies } from "./lesson-dependencies.js";

export interface LessonUseCases {
  listLessons: ListLessonsUseCase;
  getLesson: GetLessonUseCase;
  startLesson: StartLessonUseCase;
  completeLesson: CompleteLessonUseCase;
}

/**
 * Composition-root wiring only. The lesson use cases are built on the content
 * use cases — visibility rules are M5's and are reused, not restated — and add
 * only the student's progress store and the clock.
 */
export function createLessonUseCases(
  content: ContentUseCases,
  deps: LessonDependencies,
): LessonUseCases {
  const { lessonProgressRepository: progress, clock } = deps;
  return {
    listLessons: new ListLessonsUseCase(content.listContent, progress),
    getLesson: new GetLessonUseCase(content.getContent, progress),
    startLesson: new StartLessonUseCase(content.getContent, progress, clock),
    completeLesson: new CompleteLessonUseCase(content.getContent, progress, clock),
  };
}
