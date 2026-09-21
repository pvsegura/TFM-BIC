import type { ExerciseAnswerValue } from "./exercise-answer.js";

/**
 * The outcome of judging one submitted answer. Produced only by the server's
 * evaluators, never accepted from a client.
 *
 * `correctAnswer` is the answer that would have been correct, in the same shape
 * as a submitted answer (an option id, a piece of text or a boolean), so the
 * result stays language-neutral and each type's view decides how to show it.
 * `feedback` is the exercise's own static explanation, or `null` — nothing is
 * generated or personalised. Only what a student needs to understand the result
 * is here: no accepted-answer list, no evaluator settings.
 */
export interface EvaluationResult {
  correct: boolean;
  feedback: string | null;
  correctAnswer: ExerciseAnswerValue;
}
