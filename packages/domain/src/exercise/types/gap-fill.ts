import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { InvalidExerciseConfigurationError } from "../errors/invalid-exercise-configuration.error.js";
import { presentBase, type ExerciseOfType, type PresentedExerciseBase } from "../exercise-base.js";
import type { ExerciseEvaluator, ExercisePresenter } from "../exercise-evaluator.js";
import { MAX_TEXT_ANSWER_LENGTH, normalizeTextAnswer } from "./text-answer.js";

/** Where a gap goes in the text. */
export const GAP_MARKER = "___";
export const MAX_GAPS = 8;
export const MAX_GAP_ANSWER_LENGTH = 100;

/** A text with several gaps; each gap accepts one or more answers. */
export interface GapFillConfiguration {
  /** Plain text with one `___` per gap. */
  text: string;
  gaps: readonly { accepted: readonly string[] }[];
  caseSensitive: boolean;
}

export type GapFillExercise = ExerciseOfType<"gap-fill", GapFillConfiguration>;
/** One answer per gap, in order. */
export type GapFillAnswer = readonly string[];

export type PresentedGapFill = PresentedExerciseBase & {
  type: "gap-fill";
  /** The text around the gaps: `segments.length === gaps + 1`. */
  segments: readonly string[];
};

export function gapSegments(text: string): string[] {
  return text.split(GAP_MARKER);
}

export const gapFillEvaluator: ExerciseEvaluator<GapFillExercise, GapFillAnswer> = {
  type: "gap-fill",

  parseAnswer(exercise, input) {
    if (
      !Array.isArray(input) ||
      input.length !== exercise.configuration.gaps.length ||
      !input.every(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0 &&
          item.length <= MAX_GAP_ANSWER_LENGTH,
      ) ||
      input.join("").length > MAX_TEXT_ANSWER_LENGTH
    ) {
      throw new InvalidExerciseAnswerError();
    }
    return input.map((item) => item.trim());
  },

  evaluate(exercise, answer) {
    const { text, gaps, caseSensitive } = exercise.configuration;
    const segments = gapSegments(text);
    if (segments.length !== gaps.length + 1 || gaps.some((gap) => gap.accepted.length === 0)) {
      throw new InvalidExerciseConfigurationError(exercise.id, "its gaps do not match the text.");
    }
    const normalization = { caseSensitive, locale: exercise.languageId };
    const correct = gaps.every((gap, index) =>
      gap.accepted.some(
        (accepted) =>
          normalizeTextAnswer(accepted, normalization) ===
          normalizeTextAnswer(answer[index] ?? "", normalization),
      ),
    );
    const filled = segments
      .map((segment, index) => segment + (gaps[index]?.accepted[0] ?? ""))
      .join("");
    return { correct, feedback: exercise.explanation ?? null, correctAnswer: filled };
  },
};

export const gapFillPresenter: ExercisePresenter<GapFillExercise, PresentedGapFill> = {
  type: "gap-fill",

  present(exercise) {
    return {
      ...presentBase(exercise),
      type: "gap-fill",
      segments: gapSegments(exercise.configuration.text),
    };
  },
};
