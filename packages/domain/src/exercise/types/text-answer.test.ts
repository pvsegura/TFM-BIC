import { describe, expect, it } from "vitest";

import { createLanguageId } from "../../language/language-id.js";
import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { InvalidExerciseConfigurationError } from "../errors/invalid-exercise-configuration.error.js";
import { makeTextAnswerExercise, snapshot } from "../test-support/exercise-fixtures.js";
import {
  MAX_TEXT_ANSWER_LENGTH,
  normalizeTextAnswer,
  textAnswerEvaluator,
  textAnswerPresenter,
} from "./text-answer.js";

/** Invisible characters are built explicitly so they cannot be lost or altered in the source. */
const COMBINING_DOT_ABOVE = String.fromCharCode(0x307);
const NO_BREAK_SPACE = String.fromCharCode(0xa0);
const TAB = String.fromCharCode(9);

const exercise = makeTextAnswerExercise();

function exerciseAccepting(
  acceptedAnswers: string[],
  options: { caseSensitive?: boolean; languageId?: string } = {},
) {
  return makeTextAnswerExercise({
    ...(options.languageId ? { languageId: createLanguageId(options.languageId) } : {}),
    configuration: { acceptedAnswers, caseSensitive: options.caseSensitive ?? false },
  });
}

function judge(candidate: typeof exercise, input: string) {
  return textAnswerEvaluator.evaluate(candidate, textAnswerEvaluator.parseAnswer(candidate, input));
}

describe("normalizeTextAnswer", () => {
  const insensitive = { caseSensitive: false, locale: "pl" };
  const sensitive = { caseSensitive: true, locale: "pl" };

  it("trims surrounding whitespace, including tabs and no-break spaces", () => {
    expect(normalizeTextAnswer(`${TAB} ${NO_BREAK_SPACE}kot  `, sensitive)).toBe("kot");
  });

  it("leaves whitespace inside the text alone (no collapsing)", () => {
    expect(normalizeTextAnswer("Dzień  dobry", sensitive)).toBe("Dzień  dobry");
  });

  it("lower-cases only when the comparison is case-insensitive", () => {
    expect(normalizeTextAnswer("Dobranoc", insensitive)).toBe("dobranoc");
    expect(normalizeTextAnswer("Dobranoc", sensitive)).toBe("Dobranoc");
  });

  it("keeps every Polish diacritic: nothing is stripped or transliterated", () => {
    expect(normalizeTextAnswer("żółty", insensitive)).toBe("żółty");
    expect(normalizeTextAnswer("ąćęłńóśźż", sensitive)).toBe("ąćęłńóśźż");
    expect(normalizeTextAnswer("żółty", insensitive)).not.toBe("zolty");
  });

  it("treats a letter and its decomposed form as the same text (canonical equivalence, not stripping)", () => {
    const decomposed = `z${COMBINING_DOT_ABOVE}ółty`;

    expect(decomposed).not.toBe("żółty");
    expect(normalizeTextAnswer(decomposed, sensitive)).toBe("żółty");
  });

  it("does not remove punctuation", () => {
    expect(normalizeTextAnswer("Dobranoc.", insensitive)).toBe("dobranoc.");
  });

  it("lower-cases by the rules of the given language's locale", () => {
    expect(normalizeTextAnswer("I", { caseSensitive: false, locale: "tr" })).toBe("ı");
    expect(normalizeTextAnswer("I", { caseSensitive: false, locale: "pl" })).toBe("i");
  });
});

describe("textAnswerEvaluator.parseAnswer", () => {
  it("accepts a non-empty string and returns it without the whitespace around it", () => {
    expect(textAnswerEvaluator.parseAnswer(exercise, ` ${TAB} Dobranoc `)).toBe("Dobranoc");
  });

  it.each([
    ["an empty string", ""],
    ["only whitespace", `  ${TAB}${NO_BREAK_SPACE} `],
    ["a line break", "Dobra\nnoc"],
    ["a control character", "Dobra\x00noc"],
    ["a number", 42],
    ["a boolean", false],
    ["null", null],
    ["undefined", undefined],
    ["an object", { text: "Dobranoc" }],
    ["an array", ["Dobranoc"]],
    ["an over-long text", "a".repeat(MAX_TEXT_ANSWER_LENGTH + 1)],
  ])("rejects %s", (_name, input) => {
    expect(() => textAnswerEvaluator.parseAnswer(exercise, input)).toThrow(
      InvalidExerciseAnswerError,
    );
  });

  it("accepts a text of exactly the maximum length", () => {
    const longest = "a".repeat(MAX_TEXT_ANSWER_LENGTH);

    expect(textAnswerEvaluator.parseAnswer(exercise, longest)).toBe(longest);
  });
});

describe("textAnswerEvaluator.evaluate", () => {
  it("accepts an exact match", () => {
    expect(judge(exercise, "Dobranoc")).toEqual({
      correct: true,
      feedback: "Dobranoc is said when saying goodnight.",
      correctAnswer: "Dobranoc",
    });
  });

  it("is case-insensitive unless the exercise says otherwise", () => {
    expect(judge(exercise, "dobranoc").correct).toBe(true);
    expect(judge(exercise, "DOBRANOC").correct).toBe(true);
  });

  it("honours case sensitivity when the exercise asks for it", () => {
    const strict = exerciseAccepting(["Warszawa"], { caseSensitive: true });

    expect(judge(strict, "Warszawa").correct).toBe(true);
    expect(judge(strict, "warszawa").correct).toBe(false);
  });

  it("ignores whitespace around the answer", () => {
    expect(judge(exercise, "   Dobranoc \t").correct).toBe(true);
  });

  it("does not ignore whitespace inside the answer", () => {
    expect(judge(exerciseAccepting(["Dzień dobry"]), "Dzień  dobry").correct).toBe(false);
  });

  it("accepts each explicitly listed variant and nothing else", () => {
    expect(judge(exercise, "Dobranoc.").correct).toBe(true);
    expect(judge(exercise, "Dobranoc!").correct).toBe(false);
    expect(judge(exercise, "Dobranoc, dobranoc").correct).toBe(false);
  });

  it("does not accept a punctuation variant that was not listed", () => {
    expect(judge(exerciseAccepting(["jestem"]), "jestem.").correct).toBe(false);
  });

  it("preserves diacritics: an answer without them is incorrect", () => {
    const yellow = exerciseAccepting(["żółty"]);

    expect(judge(yellow, "żółty").correct).toBe(true);
    expect(judge(yellow, "ŻÓŁTY").correct).toBe(true);
    expect(judge(yellow, "zolty").correct).toBe(false);
    expect(judge(yellow, "żólty").correct).toBe(false);
  });

  it("accepts a decomposed (combining-mark) spelling of an accepted answer", () => {
    const yellow = exerciseAccepting(["żółty"]);

    expect(judge(yellow, `z${COMBINING_DOT_ABOVE}ółty`).correct).toBe(true);
  });

  it("compares by the exercise language's case rules", () => {
    const turkish = exerciseAccepting(["ışık"], { languageId: "tr" });

    expect(judge(turkish, "IŞIK").correct).toBe(true);
  });

  it("reports the first accepted answer as the correct answer, whatever was submitted", () => {
    expect(judge(exercise, "wrong").correctAnswer).toBe("Dobranoc");
    expect(judge(exercise, "Dobranoc.").correctAnswer).toBe("Dobranoc");
  });

  it("gives null feedback when there is no explanation", () => {
    const bare = makeTextAnswerExercise({ explanation: undefined });

    expect(judge(bare, "Dobranoc").feedback).toBeNull();
  });

  it("does not reveal the other accepted answers in its result", () => {
    expect(JSON.stringify(judge(exercise, "wrong"))).not.toContain("Dobranoc.");
  });

  it("is deterministic and does not mutate the exercise", () => {
    const before = snapshot(exercise);

    expect(judge(exercise, "nope")).toEqual(judge(exercise, "nope"));
    expect(exercise).toEqual(before);
  });

  it("refuses an exercise with no accepted answers", () => {
    const malformed = exerciseAccepting([]);

    expect(() => textAnswerEvaluator.evaluate(malformed, "anything")).toThrow(
      InvalidExerciseConfigurationError,
    );
  });
});

describe("textAnswerPresenter.present", () => {
  it("shows only the prompt: no accepted answers and no settings", () => {
    const presented = textAnswerPresenter.present(exercise);

    expect(presented).toEqual({
      id: exercise.id,
      lessonId: exercise.lessonId,
      languageId: "pl",
      levelId: "a1",
      type: "text-answer",
      order: 20,
      instructionLanguage: "en",
      prompt: exercise.prompt,
    });
    const serialised = JSON.stringify(presented);
    expect(serialised).not.toContain("acceptedAnswers");
    expect(serialised).not.toContain("caseSensitive");
    expect(serialised).not.toContain("Dobranoc");
  });
});
