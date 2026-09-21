import { describe, expect, it } from "vitest";

import { exerciseFileSchema } from "./exercise-file.schema.js";

const base = {
  schemaVersion: 1,
  id: "pl-greetings-polite-hello",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  status: "published",
  order: 10,
  instructionLanguage: "en",
  prompt: "Which greeting is polite?",
  explanation: "Dzień dobry is polite.",
};

const multipleChoice = {
  ...base,
  type: "multiple-choice",
  configuration: {
    options: [
      { id: "a", text: "Dzień dobry" },
      { id: "b", text: "Cześć" },
    ],
    correctOptionId: "a",
  },
};

const textAnswer = {
  ...base,
  id: "pl-greetings-goodnight",
  type: "text-answer",
  configuration: { acceptedAnswers: ["Dobranoc", "Dobranoc."], caseSensitive: false },
};

const trueFalse = {
  ...base,
  id: "pl-greetings-informal-hi",
  type: "true-false",
  configuration: { correctAnswer: true },
};

function valid(candidate: unknown) {
  return exerciseFileSchema.safeParse(candidate).success;
}

function without(file: Record<string, unknown>, key: string) {
  const copy = { ...file };
  delete copy[key];
  return copy;
}

describe("exerciseFileSchema — the exercise file format", () => {
  it.each([
    ["multiple choice", multipleChoice],
    ["text answer", textAnswer],
    ["true/false", trueFalse],
  ])("accepts a valid %s exercise", (_name, file) => {
    expect(valid(file)).toBe(true);
  });

  it("returns branded ids and the type-specific configuration", () => {
    const parsed = exerciseFileSchema.parse(multipleChoice);

    expect(parsed.id).toBe("pl-greetings-polite-hello");
    expect(parsed.lessonId).toBe("pl-greetings");
    expect(parsed.type === "multiple-choice" && parsed.configuration.correctOptionId).toBe("a");
  });

  it("does not require an explanation", () => {
    expect(valid(without(trueFalse, "explanation"))).toBe(true);
  });

  it("defaults case sensitivity to off when the text exercise does not say", () => {
    const parsed = exerciseFileSchema.parse({
      ...textAnswer,
      configuration: { acceptedAnswers: ["Dobranoc"] },
    });

    expect(parsed.type === "text-answer" && parsed.configuration.caseSensitive).toBe(false);
  });

  it.each([
    "schemaVersion",
    "id",
    "lessonId",
    "languageId",
    "levelId",
    "type",
    "status",
    "order",
    "instructionLanguage",
    "prompt",
    "configuration",
  ])("rejects a file missing %s", (key) => {
    expect(valid(without(trueFalse, key))).toBe(false);
  });

  describe("common fields", () => {
    it.each([
      ["an unsupported schemaVersion", { schemaVersion: 2 }],
      ["a prompt used as an id", { id: "Which greeting is polite?" }],
      ["an invalid lesson id", { lessonId: "Greetings lesson" }],
      ["an invalid language id", { languageId: "Polish" }],
      ["an invalid level id", { levelId: "A1" }],
      ["an unknown status", { status: "live" }],
      ["a zero order", { order: 0 }],
      ["a negative order", { order: -1 }],
      ["a fractional order", { order: 1.5 }],
      ["a string order", { order: "10" }],
      ["an order beyond the maximum", { order: 100_001 }],
      ["an empty prompt", { prompt: "" }],
      ["a whitespace-only prompt", { prompt: "   " }],
      ["a prompt with surrounding whitespace", { prompt: " Which greeting? " }],
      ["a prompt with HTML", { prompt: "Which <b>greeting</b>?" }],
      ["a prompt with a script tag", { prompt: "<script>alert(1)</script>" }],
      ["a prompt with a line break", { prompt: "Line one\nLine two" }],
      ["a prompt over the length limit", { prompt: "a".repeat(301) }],
      ["an explanation with markup", { explanation: "<img src=x onerror=alert(1)>" }],
      ["an empty explanation", { explanation: "" }],
      ["an explanation over the length limit", { explanation: "a".repeat(501) }],
    ])("rejects %s", (_name, patch) => {
      expect(valid({ ...trueFalse, ...patch })).toBe(false);
    });

    it.each([
      ["correct", true],
      ["userId", "other-user"],
      ["score", 999],
      ["createdAt", "2026-01-01"],
      ["answer", "x"],
    ])("rejects an unknown key %s (the format is strict)", (key, value) => {
      expect(valid({ ...trueFalse, [key]: value })).toBe(false);
    });
  });

  describe("type", () => {
    it.each(["matching", "text", "Multiple-Choice", "", "__proto__", "constructor"])(
      "rejects the unknown exercise type %j",
      (type) => {
        expect(valid({ ...trueFalse, type })).toBe(false);
      },
    );

    it("rejects a configuration that belongs to a different type", () => {
      expect(valid({ ...trueFalse, configuration: multipleChoice.configuration })).toBe(false);
      expect(valid({ ...multipleChoice, configuration: trueFalse.configuration })).toBe(false);
      expect(valid({ ...textAnswer, configuration: { correctAnswer: true } })).toBe(false);
    });

    it("does not accept executable-looking content as configuration", () => {
      expect(valid({ ...trueFalse, configuration: { correctAnswer: "() => true" } })).toBe(false);
      expect(
        valid({ ...trueFalse, configuration: { evaluate: "return true", correctAnswer: true } }),
      ).toBe(false);
    });
  });

  describe("multiple choice", () => {
    const options = multipleChoice.configuration.options;

    function choice(configuration: unknown) {
      return { ...multipleChoice, configuration };
    }

    function optionsOf(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        id: `o${String(i)}`,
        text: `Text ${String(i)}`,
      }));
    }

    it.each([
      ["no options", { options: [], correctOptionId: "a" }],
      ["a single option", { options: [options[0]], correctOptionId: "a" }],
      ["more than eight options", { options: optionsOf(9), correctOptionId: "o0" }],
      ["a missing correctOptionId", { options }],
      ["a correct option that is not offered", { options, correctOptionId: "z" }],
      ["an empty correctOptionId", { options, correctOptionId: "" }],
      ["several correct options (correctOptionIds)", { options, correctOptionIds: ["a", "b"] }],
      ["several correct options given as a list", { options, correctOptionId: ["a", "b"] }],
      [
        "a correctness flag on an option",
        {
          options: [
            { id: "a", text: "Dzień dobry", correct: true },
            { id: "b", text: "Cześć" },
          ],
          correctOptionId: "a",
        },
      ],
      [
        "duplicate option ids",
        {
          options: [
            { id: "a", text: "One" },
            { id: "a", text: "Two" },
          ],
          correctOptionId: "a",
        },
      ],
      [
        "duplicate option texts",
        {
          options: [
            { id: "a", text: "Same" },
            { id: "b", text: "Same" },
          ],
          correctOptionId: "a",
        },
      ],
      [
        "an option id with capitals",
        {
          options: [
            { id: "A", text: "One" },
            { id: "b", text: "Two" },
          ],
          correctOptionId: "A",
        },
      ],
      [
        "an option id with spaces",
        {
          options: [
            { id: "opt a", text: "One" },
            { id: "b", text: "Two" },
          ],
          correctOptionId: "b",
        },
      ],
      [
        "an empty option text",
        {
          options: [
            { id: "a", text: "" },
            { id: "b", text: "Two" },
          ],
          correctOptionId: "a",
        },
      ],
      [
        "option text with markup",
        {
          options: [
            { id: "a", text: "<b>One</b>" },
            { id: "b", text: "Two" },
          ],
          correctOptionId: "a",
        },
      ],
      [
        "an option missing its text",
        { options: [{ id: "a" }, { id: "b", text: "Two" }], correctOptionId: "a" },
      ],
    ])("rejects %s", (_name, configuration) => {
      expect(valid(choice(configuration))).toBe(false);
    });

    it("accepts the smallest and the largest number of options", () => {
      expect(valid(choice({ options: optionsOf(8), correctOptionId: "o7" }))).toBe(true);
      expect(valid(choice({ options, correctOptionId: "b" }))).toBe(true);
    });
  });

  describe("text answer", () => {
    function text(configuration: unknown) {
      return { ...textAnswer, configuration };
    }

    it.each([
      ["an empty list of accepted answers", { acceptedAnswers: [] }],
      ["no accepted answers key", { caseSensitive: false }],
      ["accepted answers that are not a list", { acceptedAnswers: "Dobranoc" }],
      ["a non-string accepted answer", { acceptedAnswers: [42] }],
      ["an empty accepted answer", { acceptedAnswers: [""] }],
      ["an accepted answer with surrounding whitespace", { acceptedAnswers: [" Dobranoc"] }],
      ["an accepted answer with markup", { acceptedAnswers: ["<b>Dobranoc</b>"] }],
      ["an over-long accepted answer", { acceptedAnswers: ["a".repeat(201)] }],
      [
        "more than twenty accepted answers",
        { acceptedAnswers: Array.from({ length: 21 }, (_, i) => `a${String(i)}`) },
      ],
      ["a non-boolean caseSensitive", { acceptedAnswers: ["Dobranoc"], caseSensitive: "yes" }],
      ["an unknown setting", { acceptedAnswers: ["Dobranoc"], fuzzy: true }],
      ["a duplicate accepted answer", { acceptedAnswers: ["Dobranoc", "Dobranoc"] }],
      [
        "a duplicate that differs only in case, when case is ignored",
        { acceptedAnswers: ["Dobranoc", "dobranoc"] },
      ],
    ])("rejects %s", (_name, configuration) => {
      expect(valid(text(configuration))).toBe(false);
    });

    it("allows answers that differ only in case when case matters", () => {
      expect(valid(text({ acceptedAnswers: ["Polska", "polska"], caseSensitive: true }))).toBe(
        true,
      );
    });

    it("keeps Polish diacritics exactly, and lists variants explicitly", () => {
      const parsed = exerciseFileSchema.parse(
        text({ acceptedAnswers: ["Miło mi cię poznać.", "Miło mi cię poznać"] }),
      );

      expect(parsed.type === "text-answer" && parsed.configuration.acceptedAnswers).toEqual([
        "Miło mi cię poznać.",
        "Miło mi cię poznać",
      ]);
    });

    it("treats an answer and its decomposed spelling as the same, so they are duplicates", () => {
      const decomposed = `z${String.fromCharCode(0x307)}ółty`;

      expect(valid(text({ acceptedAnswers: ["żółty", decomposed] }))).toBe(false);
    });
  });

  describe("true/false", () => {
    it.each([
      ["a string", { correctAnswer: "true" }],
      ["a number", { correctAnswer: 1 }],
      ["null", { correctAnswer: null }],
      ["a missing correctAnswer", {}],
      ["an extra key", { correctAnswer: true, explanation: "x" }],
    ])("rejects %s", (_name, configuration) => {
      expect(valid({ ...trueFalse, configuration })).toBe(false);
    });

    it.each([true, false])("accepts %s", (correctAnswer) => {
      expect(valid({ ...trueFalse, configuration: { correctAnswer } })).toBe(true);
    });
  });
});
