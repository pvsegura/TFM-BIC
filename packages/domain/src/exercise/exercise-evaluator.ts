import type { EvaluationResult } from "./evaluation-result.js";
import type { ExerciseAnswerValue } from "./exercise-answer.js";
import type { ExerciseType } from "./exercise-type.js";

/**
 * How one exercise type judges an answer. Pure and deterministic: it depends on
 * nothing but its two arguments — no database, no HTTP, no React, no clock — so
 * the same exercise and answer always give the same result and it can be tested
 * with plain objects. It never mutates the exercise.
 *
 * Two steps, because an answer arrives as untrusted `unknown`:
 *  - `parseAnswer` checks the *shape* of the input against this exercise and
 *    throws `InvalidExerciseAnswerError` for anything that is not a well-formed
 *    answer to it (such an input is refused, not marked wrong);
 *  - `evaluate` judges a well-formed answer.
 */
export interface ExerciseEvaluator<
  TExercise extends { type: ExerciseType },
  TAnswer extends ExerciseAnswerValue,
> {
  readonly type: TExercise["type"];
  parseAnswer(exercise: TExercise, input: unknown): TAnswer;
  evaluate(exercise: TExercise, answer: TAnswer): EvaluationResult;
}

/** How one exercise type is shown before it is answered. It must leave out
 * everything that reveals the answer key. */
export interface ExercisePresenter<TExercise extends { type: ExerciseType }, TPresented> {
  readonly type: TExercise["type"];
  present(exercise: TExercise): TPresented;
}
