import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { InvalidExerciseConfigurationError } from "../errors/invalid-exercise-configuration.error.js";
import { presentBase, type ExerciseOfType, type PresentedExerciseBase } from "../exercise-base.js";
import type { ExerciseEvaluator, ExercisePresenter } from "../exercise-evaluator.js";

/** What the exercise expects: whether its statement (the prompt) is true. */
export interface TrueFalseConfiguration {
  correctAnswer: boolean;
}

export type TrueFalseExercise = ExerciseOfType<"true-false", TrueFalseConfiguration>;

/** The answer is a boolean. The strings "true" / "false" are not answers. */
export type TrueFalseAnswer = boolean;

export type PresentedTrueFalse = PresentedExerciseBase & { type: "true-false" };

export const trueFalseEvaluator: ExerciseEvaluator<TrueFalseExercise, TrueFalseAnswer> = {
  type: "true-false",

  parseAnswer(_exercise, input) {
    if (typeof input !== "boolean") {
      throw new InvalidExerciseAnswerError();
    }
    return input;
  },

  evaluate(exercise, answer) {
    const { correctAnswer } = exercise.configuration;
    if (typeof correctAnswer !== "boolean") {
      throw new InvalidExerciseConfigurationError(
        exercise.id,
        "its correct answer is not a boolean.",
      );
    }
    return {
      correct: answer === correctAnswer,
      feedback: exercise.explanation ?? null,
      correctAnswer,
    };
  },
};

export const trueFalsePresenter: ExercisePresenter<TrueFalseExercise, PresentedTrueFalse> = {
  type: "true-false",

  present(exercise) {
    return { ...presentBase(exercise), type: "true-false" };
  },
};
