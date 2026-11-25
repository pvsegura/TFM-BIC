import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { presentBase, type ExerciseOfType, type PresentedExerciseBase } from "../exercise-base.js";
import type { ExerciseEvaluator, ExercisePresenter } from "../exercise-evaluator.js";
import { seededShuffle } from "./seeded-shuffle.js";

export const MIN_MATCHING_PAIRS = 2;
export const MAX_MATCHING_PAIRS = 8;

export interface MatchingPair {
  left: string;
  right: string;
}

/** Match each item on the left with one on the right (word ↔ translation, question ↔ answer). */
export interface MatchingConfiguration {
  pairs: readonly MatchingPair[];
}

export type MatchingExercise = ExerciseOfType<"matching", MatchingConfiguration>;
/** For each left item, in order, the right item the learner chose. */
export type MatchingAnswer = readonly string[];

export type PresentedMatching = PresentedExerciseBase & {
  type: "matching";
  left: readonly string[];
  /** The right-hand items, shuffled. */
  right: readonly string[];
};

export const matchingEvaluator: ExerciseEvaluator<MatchingExercise, MatchingAnswer> = {
  type: "matching",

  parseAnswer(exercise, input) {
    const rights = new Set(exercise.configuration.pairs.map((pair) => pair.right));
    if (
      !Array.isArray(input) ||
      input.length !== exercise.configuration.pairs.length ||
      !input.every((item): item is string => typeof item === "string" && rights.has(item))
    ) {
      throw new InvalidExerciseAnswerError();
    }
    return input;
  },

  evaluate(exercise, answer) {
    const { pairs } = exercise.configuration;
    return {
      correct: pairs.every((pair, index) => answer[index] === pair.right),
      feedback: exercise.explanation ?? null,
      correctAnswer: pairs.map((pair) => `${pair.left} → ${pair.right}`).join("; "),
    };
  },
};

export const matchingPresenter: ExercisePresenter<MatchingExercise, PresentedMatching> = {
  type: "matching",

  present(exercise) {
    const { pairs } = exercise.configuration;
    return {
      ...presentBase(exercise),
      type: "matching",
      left: pairs.map((pair) => pair.left),
      right: seededShuffle(
        pairs.map((pair) => pair.right),
        exercise.id,
      ),
    };
  },
};
