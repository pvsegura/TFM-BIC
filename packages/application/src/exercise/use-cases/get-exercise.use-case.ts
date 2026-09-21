import type { ExerciseId, ExerciseTypeRegistry, PresentedExercise } from "@tfm-bic/domain";

import type { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { findVisibleExercise } from "../find-visible-exercise.js";
import type { ExerciseAttemptRepository } from "../ports/exercise-attempt-repository.js";
import type { ExerciseRepository } from "../ports/exercise-repository.js";
import { toResultView, type ExerciseResultView } from "../result-view.js";

export interface GetExerciseInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  exerciseId: ExerciseId;
}

export interface ExerciseDetail {
  /** The exercise as a student may see it before answering — built by its type's presenter, never the answer key. */
  exercise: PresentedExercise;
  /** This student's own standing, kept apart from the exercise so content is never per-student. */
  result: ExerciseResultView;
}

/**
 * One visible exercise, ready to render, with the student's own result. What is
 * shown is decided by the exercise type's presenter (`ExerciseTypeRegistry`), so
 * the answer key — the correct option, the accepted answers, the explanation —
 * is left out by construction, not filtered afterwards. Opening an exercise is a
 * read: it never records an attempt.
 */
export class GetExerciseUseCase {
  constructor(
    private readonly getContent: GetContentUseCase,
    private readonly exercises: ExerciseRepository,
    private readonly attempts: ExerciseAttemptRepository,
    private readonly registry: ExerciseTypeRegistry,
  ) {}

  async execute(input: GetExerciseInput): Promise<ExerciseDetail> {
    const exercise = await findVisibleExercise(this.getContent, this.exercises, input.exerciseId);

    const [summary] = await this.attempts.findSummaries(input.userId, [exercise.id]);
    return {
      exercise: this.registry.present(exercise),
      result: toResultView(summary ?? null),
    };
  }
}
