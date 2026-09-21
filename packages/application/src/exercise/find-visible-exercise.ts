import {
  ExerciseNotFoundError,
  isPublished,
  LessonNotFoundError,
  type Exercise,
  type ExerciseId,
} from "@tfm-bic/domain";

import type { GetContentUseCase } from "../content/use-cases/get-content.use-case.js";
import { findVisibleLesson } from "../lesson/find-visible-lesson.js";
import type { ExerciseRepository } from "./ports/exercise-repository.js";

/**
 * The one place that decides whether a student may see (and answer) an exercise.
 * It has two conditions and restates neither of the rules behind them: the
 * exercise itself is `published` (the content lifecycle every item shares), and
 * its lesson is visible under `findVisibleLesson` — which is M5's content
 * visibility plus "it is a lesson". So a published exercise of a draft lesson, of
 * a lesson in a level that is not available, or attached to content that is not
 * a lesson is not visible either. Every reason it is not visible is the same
 * `ExerciseNotFoundError`, so a caller cannot tell a draft from a typo.
 */
export async function findVisibleExercise(
  getContent: GetContentUseCase,
  exercises: ExerciseRepository,
  exerciseId: ExerciseId,
): Promise<Exercise> {
  const exercise = await exercises.findById(exerciseId);
  if (!exercise || !isPublished(exercise)) {
    throw new ExerciseNotFoundError(exerciseId);
  }

  try {
    await findVisibleLesson(getContent, exercise.lessonId);
  } catch (error) {
    if (error instanceof LessonNotFoundError) {
      throw new ExerciseNotFoundError(exerciseId);
    }
    throw error;
  }
  return exercise;
}
