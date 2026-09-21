import {
  GetExerciseUseCase,
  ListLessonExercisesUseCase,
  SubmitExerciseAnswerUseCase,
} from "@tfm-bic/application";

import type { ContentDependencies } from "./content-dependencies.js";
import type { ContentUseCases } from "./content-use-cases.js";
import type { ExerciseDependencies } from "./exercise-dependencies.js";

export interface ExerciseUseCases {
  listLessonExercises: ListLessonExercisesUseCase;
  getExercise: GetExerciseUseCase;
  submitAnswer: SubmitExerciseAnswerUseCase;
}

/**
 * Composition-root wiring only. The exercise use cases are built on the content
 * use cases — lesson visibility is M5/M6's rule and is reused, not restated —
 * and add the exercise repository, the student's attempt store, the clock and the
 * registry of exercise types.
 */
export function createExerciseUseCases(
  content: ContentUseCases,
  contentDeps: ContentDependencies,
  deps: ExerciseDependencies,
): ExerciseUseCases {
  const { exerciseRepository } = contentDeps;
  const { exerciseAttemptRepository: attempts, clock, typeRegistry } = deps;
  return {
    listLessonExercises: new ListLessonExercisesUseCase(
      content.getContent,
      exerciseRepository,
      attempts,
    ),
    getExercise: new GetExerciseUseCase(
      content.getContent,
      exerciseRepository,
      attempts,
      typeRegistry,
    ),
    submitAnswer: new SubmitExerciseAnswerUseCase(
      content.getContent,
      exerciseRepository,
      attempts,
      typeRegistry,
      clock,
    ),
  };
}
