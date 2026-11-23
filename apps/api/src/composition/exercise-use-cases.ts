import {
  AnonymousExerciseAttempts,
  GetExerciseUseCase,
  ListLessonExercisesUseCase,
  SubmitExerciseAnswerUseCase,
  SubmitExerciseAnswerWithRewardsUseCase,
} from "@verbysia/application";

import type { ContentDependencies } from "./content-dependencies.js";
import type { ContentUseCases } from "./content-use-cases.js";
import type { ExerciseDependencies } from "./exercise-dependencies.js";
import type { GamificationUseCases } from "./gamification-use-cases.js";

export interface ExerciseUseCases {
  listLessonExercises: ListLessonExercisesUseCase;
  getExercise: GetExerciseUseCase;
  /** M7's submit-answer flow, followed by the M8 reward for a correct answer. */
  submitAnswer: SubmitExerciseAnswerWithRewardsUseCase;
  /** Verbysia free demo: the same use cases over attempts that are evaluated but never stored. */
  demo: {
    listLessonExercises: ListLessonExercisesUseCase;
    getExercise: GetExerciseUseCase;
    submitAnswer: SubmitExerciseAnswerUseCase;
  };
}

/**
 * Composition-root wiring only. The exercise use cases are built on the content
 * use cases — lesson visibility is M5/M6's rule and is reused, not restated —
 * and add the exercise repository, the student's attempt store, the clock and the
 * registry of exercise types. Answering is wrapped, not changed: the M7 use case
 * judges the answer and records the attempt, then the reward use case grants what a
 * correct answer earns.
 */
export function createExerciseUseCases(
  content: ContentUseCases,
  contentDeps: ContentDependencies,
  deps: ExerciseDependencies,
  gamification: GamificationUseCases,
): ExerciseUseCases {
  const { exerciseRepository } = contentDeps;
  const { exerciseAttemptRepository: attempts, clock, typeRegistry } = deps;
  const anonymous = new AnonymousExerciseAttempts();
  return {
    demo: {
      listLessonExercises: new ListLessonExercisesUseCase(
        content.getContent,
        exerciseRepository,
        anonymous,
      ),
      getExercise: new GetExerciseUseCase(
        content.getContent,
        exerciseRepository,
        anonymous,
        typeRegistry,
      ),
      submitAnswer: new SubmitExerciseAnswerUseCase(
        content.getContent,
        exerciseRepository,
        anonymous,
        typeRegistry,
        clock,
      ),
    },
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
    submitAnswer: new SubmitExerciseAnswerWithRewardsUseCase(
      new SubmitExerciseAnswerUseCase(
        content.getContent,
        exerciseRepository,
        attempts,
        typeRegistry,
        clock,
      ),
      gamification.awardRewards,
      gamification.achievementTexts,
    ),
  };
}
