import { createContentId } from "../../content/content-id.js";
import { createLanguageId } from "../../language/language-id.js";
import { createLevelId } from "../../language/level-id.js";
import { createExerciseId } from "../exercise-id.js";
import type { MultipleChoiceExercise } from "../types/multiple-choice.js";
import type { TextAnswerExercise } from "../types/text-answer.js";
import type { TrueFalseExercise } from "../types/true-false.js";

/**
 * Builders for well-formed exercises, shared by every layer's tests (through
 * `@tfm-bic/domain/testing`). Test-only: never import this from production code.
 */
const COMMON = {
  lessonId: createContentId("pl-greetings"),
  languageId: createLanguageId("pl"),
  levelId: createLevelId("a1"),
  status: "published",
  order: 10,
  instructionLanguage: createLanguageId("en"),
} as const;

export function makeMultipleChoiceExercise(
  overrides: Partial<MultipleChoiceExercise> = {},
): MultipleChoiceExercise {
  return {
    ...COMMON,
    id: createExerciseId("pl-greetings-polite-hello"),
    type: "multiple-choice",
    prompt: "Which greeting is polite and suits someone you do not know well?",
    explanation: "Dzień dobry is polite.",
    configuration: {
      options: [
        { id: "opt-a", text: "Dzień dobry" },
        { id: "opt-b", text: "Cześć" },
        { id: "opt-c", text: "Dobranoc" },
      ],
      correctOptionId: "opt-a",
    },
    ...overrides,
  };
}

export function makeTextAnswerExercise(
  overrides: Partial<TextAnswerExercise> = {},
): TextAnswerExercise {
  return {
    ...COMMON,
    id: createExerciseId("pl-greetings-goodnight"),
    order: 20,
    type: "text-answer",
    prompt: "Type the Polish for 'Good night'.",
    explanation: "Dobranoc is said when saying goodnight.",
    configuration: { acceptedAnswers: ["Dobranoc", "Dobranoc."], caseSensitive: false },
    ...overrides,
  };
}

export function makeTrueFalseExercise(
  overrides: Partial<TrueFalseExercise> = {},
): TrueFalseExercise {
  return {
    ...COMMON,
    id: createExerciseId("pl-greetings-informal-hi"),
    order: 30,
    type: "true-false",
    prompt: "Cześć is informal and can mean both hello and goodbye.",
    explanation: "Cześć is used with friends and family, to say hello and goodbye.",
    configuration: { correctAnswer: true },
    ...overrides,
  };
}

/** A deep, detached copy of plain data — for asserting that a call did not mutate its input. */
export function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
