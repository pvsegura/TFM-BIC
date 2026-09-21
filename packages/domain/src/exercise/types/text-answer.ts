import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { InvalidExerciseConfigurationError } from "../errors/invalid-exercise-configuration.error.js";
import { presentBase, type ExerciseOfType, type PresentedExerciseBase } from "../exercise-base.js";
import type { ExerciseEvaluator, ExercisePresenter } from "../exercise-evaluator.js";

const CONTROL_CHARACTER = /\p{Cc}/u;

/** Bounds what is stored for an attempt; accepted answers in content are far shorter. */
export const MAX_TEXT_ANSWER_LENGTH = 500;

/**
 * What the exercise expects: the answers it accepts, listed explicitly, and
 * whether capitalisation matters. The first accepted answer is the one shown as
 * "the" correct answer. A variant (a trailing full stop, an alternative word) is
 * accepted only if it is listed — nothing is inferred.
 */
export interface TextAnswerConfiguration {
  acceptedAnswers: readonly string[];
  caseSensitive: boolean;
}

export type TextAnswerExercise = ExerciseOfType<"text-answer", TextAnswerConfiguration>;

/** The answer is the typed text without its surrounding whitespace; nothing else is altered. */
export type TextAnswer = string;

export type PresentedTextAnswer = PresentedExerciseBase & { type: "text-answer" };

export interface TextNormalization {
  caseSensitive: boolean;
  /** BCP 47 tag whose case rules apply (the exercise's language), e.g. `tr`. */
  locale: string;
}

/**
 * The whole comparison policy for a text answer, in one place. It is
 * deliberately small, because linguistic content is not to be "cleaned up":
 *
 * - Unicode NFC, so a letter typed as a base character plus a combining mark
 *   equals the same letter typed as one character (both are the same text);
 * - surrounding whitespace is trimmed; whitespace inside is left alone;
 * - lower-casing in the language's own locale — only when the exercise is not
 *   case-sensitive. (This is lower-casing both sides, not full Unicode case
 *   folding.)
 *
 * Nothing else: diacritics are kept (`żółty` is never `zolty`), punctuation is
 * kept, there is no fuzzy matching and no transliteration. It returns a new
 * string and never touches its input.
 */
export function normalizeTextAnswer(value: string, options: TextNormalization): string {
  const canonical = value.normalize("NFC").trim();
  return options.caseSensitive ? canonical : canonical.toLocaleLowerCase(options.locale);
}

export const textAnswerEvaluator: ExerciseEvaluator<TextAnswerExercise, TextAnswer> = {
  type: "text-answer",

  parseAnswer(_exercise, input) {
    if (typeof input !== "string" || input.length > MAX_TEXT_ANSWER_LENGTH) {
      throw new InvalidExerciseAnswerError();
    }
    // Whitespace around the text (a stray tab or line break from pasting) is not part of the
    // answer; a control character or line break *inside* it is not something a text box produces.
    const trimmed = input.trim();
    if (trimmed.length === 0 || CONTROL_CHARACTER.test(trimmed)) {
      throw new InvalidExerciseAnswerError();
    }
    return trimmed;
  },

  evaluate(exercise, answer) {
    const { acceptedAnswers, caseSensitive } = exercise.configuration;
    const [primary] = acceptedAnswers;
    if (primary === undefined) {
      throw new InvalidExerciseConfigurationError(exercise.id, "it accepts no answers.");
    }

    const normalization = { caseSensitive, locale: exercise.languageId };
    const submitted = normalizeTextAnswer(answer, normalization);
    const correct = acceptedAnswers.some(
      (accepted) => normalizeTextAnswer(accepted, normalization) === submitted,
    );

    return { correct, feedback: exercise.explanation ?? null, correctAnswer: primary };
  },
};

export const textAnswerPresenter: ExercisePresenter<TextAnswerExercise, PresentedTextAnswer> = {
  type: "text-answer",

  present(exercise) {
    return { ...presentBase(exercise), type: "text-answer" };
  },
};
