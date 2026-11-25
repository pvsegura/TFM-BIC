import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { presentBase, type ExerciseOfType, type PresentedExerciseBase } from "../exercise-base.js";
import type { ExerciseEvaluator, ExercisePresenter } from "../exercise-evaluator.js";
import { seededShuffle } from "./seeded-shuffle.js";

export const MIN_ORDERING_ITEMS = 2;
export const MAX_ORDERING_ITEMS = 10;

/**
 * Put items in the right order: words into a sentence, lines into a dialogue, steps into a
 * sequence. `items` is stored in the correct order; learners see them shuffled.
 */
export interface OrderingConfiguration {
  items: readonly string[];
  /** How the ordered items are joined to show the answer: " " for words, " / " for lines. */
  joiner: string;
}

export type OrderingExercise = ExerciseOfType<"ordering", OrderingConfiguration>;
/** The items, in the order the learner put them. */
export type OrderingAnswer = readonly string[];

export type PresentedOrdering = PresentedExerciseBase & {
  type: "ordering";
  items: readonly string[];
  joiner: string;
};

const sortedKey = (items: readonly string[]) => [...items].sort().join("|");

export const orderingEvaluator: ExerciseEvaluator<OrderingExercise, OrderingAnswer> = {
  type: "ordering",

  parseAnswer(exercise, input) {
    const expected = exercise.configuration.items;
    // The answer must be a permutation of the offered items — anything else no interface sends.
    if (
      !Array.isArray(input) ||
      input.length !== expected.length ||
      !input.every((item): item is string => typeof item === "string") ||
      sortedKey(input) !== sortedKey(expected)
    ) {
      throw new InvalidExerciseAnswerError();
    }
    return input;
  },

  evaluate(exercise, answer) {
    const { items, joiner } = exercise.configuration;
    return {
      correct: answer.every((item, index) => item === items[index]),
      feedback: exercise.explanation ?? null,
      correctAnswer: items.join(joiner),
    };
  },
};

export const orderingPresenter: ExercisePresenter<OrderingExercise, PresentedOrdering> = {
  type: "ordering",

  present(exercise) {
    return {
      ...presentBase(exercise),
      type: "ordering",
      items: seededShuffle(exercise.configuration.items, exercise.id),
      joiner: exercise.configuration.joiner,
    };
  },
};
