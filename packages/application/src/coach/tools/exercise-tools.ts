import {
  createExerciseId,
  type ExerciseTypeRegistry,
  type PresentedExercise,
} from "@tfm-bic/domain";

import type { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { findVisibleExercise } from "../../exercise/find-visible-exercise.js";
import type { ExerciseRepository } from "../../exercise/ports/exercise-repository.js";
import type { LearnerInsightsReadModel } from "../ports/learner-insights-read-model.js";
import type { CoachTool, CoachToolContext } from "./coach-tool.js";
import { optionalCount, readArguments, requiredString } from "./tool-arguments.js";

/**
 * The "explain my mistake" tool (M23, ADR-034) — the one tool where what the coach may see depends
 * on what the learner has already done.
 *
 * The rule M7 enforces for the browser is enforced here too: **an answer key never exists before an
 * answer.** The exercise is handed over through its type's own presenter (the same code that builds
 * what a student sees), and the correct answer is added only when this learner has a stored attempt
 * — in which case they have already been told it by the application itself, so withholding it from
 * the coach would only stop it from teaching.
 *
 * The correct answer is not read out of the configuration by hand: the registry re-evaluates the
 * learner's own stored answer, so the answer key comes from the one authoritative evaluator and no
 * answer-key logic is duplicated here (ADR-020's "the server is authoritative").
 */

export interface ExerciseToolDependencies {
  readonly getContent: GetContentUseCase;
  readonly exercises: ExerciseRepository;
  readonly registry: ExerciseTypeRegistry;
  readonly insights: LearnerInsightsReadModel;
}

const MAX_ATTEMPTS = 5;

/** The presented exercise, minus the ordering/level fields a coach has no use for. */
function presentedFields(presented: PresentedExercise) {
  const { id, lessonId, prompt, instructionLanguage, ...rest } = presented;
  return {
    id,
    lessonId,
    prompt,
    instructionLanguage,
    // Whatever the type's presenter chose to show (options for a choice, nothing for text input).
    // Already answer-key-free by construction: this is the exact object the browser receives.
    presentation: rest,
  };
}

function exerciseContextTool(deps: ExerciseToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_exercise_context",
      description:
        "An exercise and this learner's own attempts at it: the question as they saw it, what they submitted, whether each attempt was correct, and — only once they have answered at least once — the correct answer and the authored feedback. Call this before explaining a mistake. If the learner has not answered yet, you will not be given the answer: help them think it through instead.",
      parameters: {
        type: "object",
        properties: {
          exerciseId: {
            type: "string",
            description: "The exercise's id, e.g. 'pl-greetings-choice-1'.",
          },
          attempts: { type: "integer", description: "How many past attempts (1-5). Default 3." },
        },
        required: ["exerciseId"],
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["exerciseId", "attempts"]);
      const exerciseId = createExerciseId(requiredString(record, "exerciseId", 64));
      const limit = optionalCount(record, "attempts", { min: 1, max: MAX_ATTEMPTS, fallback: 3 });

      // Visibility first, and it is M7's own rule: a draft exercise, an exercise of a draft lesson
      // or of a level that is not available is the same not-found it is for the browser.
      const exercise = await findVisibleExercise(deps.getContent, deps.exercises, exerciseId);
      const attempts = await deps.insights.loadExerciseAttempts(context.userId, exercise.id, limit);

      const presented = presentedFields(deps.registry.present(exercise));
      if (attempts.length === 0) {
        return {
          exercise: presented,
          learnerAttempts: [],
          correctAnswer: null,
          note: "This learner has not answered this exercise yet, so the correct answer is withheld. Guide them towards it; do not state it.",
        };
      }

      // Re-judging the learner's own stored answer is how the correct answer and the authored
      // feedback are obtained — from the authoritative evaluator, never from a second copy of the
      // rule. The verdict stored with the attempt stays the record; this is only for explaining.
      const latest = attempts[0]!;
      const evaluation = deps.registry.evaluate(exercise, latest.submittedAnswer).evaluation;
      return {
        exercise: presented,
        learnerAttempts: attempts.map((attempt) => ({
          submitted: attempt.submittedAnswer,
          correct: attempt.correct,
          at: attempt.answeredAt.toISOString(),
        })),
        correctAnswer: evaluation.correctAnswer,
        authoredFeedback: evaluation.feedback,
        note: "The learner has already seen the correct answer in the application. Explain why their answer does not work, then the correct form, then one new example.",
      };
    },
  };
}

export function createExerciseTools(deps: ExerciseToolDependencies): readonly CoachTool[] {
  return [exerciseContextTool(deps)];
}
