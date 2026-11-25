import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { presentBase, type ExerciseOfType, type PresentedExerciseBase } from "../exercise-base.js";
import type { ExerciseEvaluator, ExercisePresenter } from "../exercise-evaluator.js";

export const MAX_OPEN_WRITING_LENGTH = 1500;

/**
 * A free writing task. It cannot be marked automatically, and it is not pretended to be: the
 * attempt counts as done when the text has the requested length, and the learner compares it with
 * the model answer and the checklist (the AI coach can comment on it).
 */
export interface OpenWritingConfiguration {
  modelAnswer: string;
  /** What a good answer contains — the learner's self-check list. */
  checklist: readonly string[];
  minWords: number;
  maxWords: number;
}

export type OpenWritingExercise = ExerciseOfType<"open-writing", OpenWritingConfiguration>;
export type OpenWritingAnswer = string;

export type PresentedOpenWriting = PresentedExerciseBase & {
  type: "open-writing";
  checklist: readonly string[];
  minWords: number;
  maxWords: number;
};

export function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export const openWritingEvaluator: ExerciseEvaluator<OpenWritingExercise, OpenWritingAnswer> = {
  type: "open-writing",

  parseAnswer(_exercise, input) {
    if (typeof input !== "string" || input.length > MAX_OPEN_WRITING_LENGTH) {
      throw new InvalidExerciseAnswerError();
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) throw new InvalidExerciseAnswerError();
    return trimmed;
  },

  evaluate(exercise, answer) {
    const { minWords, maxWords, modelAnswer } = exercise.configuration;
    const words = countWords(answer);
    return {
      // "Done", not "right": the length is the only thing a program can check here.
      correct: words >= minWords && words <= maxWords,
      feedback: exercise.explanation ?? null,
      correctAnswer: modelAnswer,
    };
  },
};

export const openWritingPresenter: ExercisePresenter<OpenWritingExercise, PresentedOpenWriting> = {
  type: "open-writing",

  present(exercise) {
    const { checklist, minWords, maxWords } = exercise.configuration;
    return { ...presentBase(exercise), type: "open-writing", checklist, minWords, maxWords };
  },
};
