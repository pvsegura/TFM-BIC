import type { EvaluationResult, ExerciseId, ExerciseTypeRegistry } from "@tfm-bic/domain";

import type { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import type { Clock } from "../../ports/clock.js";
import { findVisibleExercise } from "../find-visible-exercise.js";
import type { ExerciseAttemptRepository } from "../ports/exercise-attempt-repository.js";
import type { ExerciseRepository } from "../ports/exercise-repository.js";
import { toResultView, type ExerciseResultView } from "../result-view.js";

export interface SubmitExerciseAnswerInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  exerciseId: ExerciseId;
  /** Untrusted: its shape is checked against the exercise by the exercise type's evaluator. */
  answer: unknown;
}

export interface SubmitExerciseAnswerResult {
  evaluation: EvaluationResult;
  /** The student's standing after this attempt. */
  result: ExerciseResultView;
}

/**
 * Judges one submitted answer and records it. The caller supplies *an answer* —
 * nothing else about the outcome: which evaluator runs comes from the exercise's
 * own type, the verdict from that evaluator, the user from the session and the
 * time from the `Clock`. Every accepted submission is an attempt, appended to the
 * student's history; a retry never touches an earlier one.
 *
 * The order matters: the exercise must be visible, then the answer must be a
 * well-formed answer for it (otherwise it is refused, not judged), and only then
 * is an attempt written — so nothing is ever recorded for a request that was not
 * a real answer to a real, visible exercise.
 */
export class SubmitExerciseAnswerUseCase {
  constructor(
    private readonly getContent: GetContentUseCase,
    private readonly exercises: ExerciseRepository,
    private readonly attempts: ExerciseAttemptRepository,
    private readonly registry: ExerciseTypeRegistry,
    private readonly clock: Clock,
  ) {}

  async execute(input: SubmitExerciseAnswerInput): Promise<SubmitExerciseAnswerResult> {
    const exercise = await findVisibleExercise(this.getContent, this.exercises, input.exerciseId);

    const { answer, evaluation } = this.registry.evaluate(exercise, input.answer);

    await this.attempts.record({
      userId: input.userId,
      exerciseId: exercise.id,
      submittedAnswer: answer,
      correct: evaluation.correct,
      answeredAt: this.clock.now(),
    });

    const [summary] = await this.attempts.findSummaries(input.userId, [exercise.id]);
    return { evaluation, result: toResultView(summary ?? null) };
  }
}
