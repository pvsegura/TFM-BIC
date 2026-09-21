import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { InvalidExerciseConfigurationError } from "../errors/invalid-exercise-configuration.error.js";
import { presentBase, type ExerciseOfType, type PresentedExerciseBase } from "../exercise-base.js";
import type { ExerciseEvaluator, ExercisePresenter } from "../exercise-evaluator.js";

/** An option's stable id: a short lowercase slug, so it is safe to store, compare and send. */
const OPTION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_OPTION_ID_LENGTH = 32;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;

export function isValidOptionId(value: string): boolean {
  return value.length <= MAX_OPTION_ID_LENGTH && OPTION_ID_PATTERN.test(value);
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

/** What the exercise expects: the options, and exactly one correct option's id. */
export interface MultipleChoiceConfiguration {
  options: readonly MultipleChoiceOption[];
  correctOptionId: string;
}

export type MultipleChoiceExercise = ExerciseOfType<"multiple-choice", MultipleChoiceConfiguration>;

/** The answer is the id of the chosen option. */
export type MultipleChoiceAnswer = string;

export type PresentedMultipleChoice = PresentedExerciseBase & {
  type: "multiple-choice";
  options: readonly MultipleChoiceOption[];
};

export const multipleChoiceEvaluator: ExerciseEvaluator<
  MultipleChoiceExercise,
  MultipleChoiceAnswer
> = {
  type: "multiple-choice",

  parseAnswer(exercise, input) {
    // An id the exercise does not offer is not a wrong answer, it is not an
    // answer: no student interface can produce it, so it is refused.
    if (
      typeof input !== "string" ||
      !exercise.configuration.options.some((option) => option.id === input)
    ) {
      throw new InvalidExerciseAnswerError();
    }
    return input;
  },

  evaluate(exercise, answer) {
    const { options, correctOptionId } = exercise.configuration;
    if (!options.some((option) => option.id === correctOptionId)) {
      throw new InvalidExerciseConfigurationError(
        exercise.id,
        "the correct option is not one of its options.",
      );
    }
    return {
      correct: answer === correctOptionId,
      feedback: exercise.explanation ?? null,
      correctAnswer: correctOptionId,
    };
  },
};

export const multipleChoicePresenter: ExercisePresenter<
  MultipleChoiceExercise,
  PresentedMultipleChoice
> = {
  type: "multiple-choice",

  present(exercise) {
    return {
      ...presentBase(exercise),
      type: "multiple-choice",
      // Copied option by option: only id and text are ever shown.
      options: exercise.configuration.options.map((option) => ({
        id: option.id,
        text: option.text,
      })),
    };
  },
};
