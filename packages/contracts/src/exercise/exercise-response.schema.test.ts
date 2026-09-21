import { describe, expect, it } from "vitest";

import {
  exerciseAnswerRequestSchema,
  exerciseAnswerResponseSchema,
  exerciseIdParamSchema,
  exerciseListResponseSchema,
  exerciseResponseSchema,
  exerciseResultResponseSchema,
} from "./exercise-response.schema.js";

const UNANSWERED = { status: "unanswered", attemptCount: 0, lastAnsweredAt: null };
const RESULT = {
  status: "incorrect",
  attemptCount: 2,
  lastAnsweredAt: "2026-01-01T10:00:00.000Z",
};

const presentedBase = {
  id: "pl-greetings-polite-hello",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  order: 10,
  instructionLanguage: "en",
  prompt: "Which greeting is polite?",
  result: UNANSWERED,
};

const presentedMultipleChoice = {
  ...presentedBase,
  type: "multiple-choice",
  options: [
    { id: "a", text: "Dzień dobry" },
    { id: "b", text: "Cześć" },
  ],
};

describe("exerciseResultResponseSchema", () => {
  it.each([UNANSWERED, RESULT, { ...RESULT, status: "correct" }])("accepts %j", (result) => {
    expect(exerciseResultResponseSchema.safeParse(result).success).toBe(true);
  });

  it.each([
    { ...RESULT, status: "passed" },
    { ...RESULT, attemptCount: -1 },
    { ...RESULT, attemptCount: 1.5 },
    { ...RESULT, lastAnsweredAt: "yesterday" },
    { ...RESULT, lastAnsweredAt: undefined },
  ])("rejects %j", (result) => {
    expect(exerciseResultResponseSchema.safeParse(result).success).toBe(false);
  });
});

describe("exerciseResponseSchema — what a student sees before answering", () => {
  it.each([
    ["multiple choice", presentedMultipleChoice],
    ["text answer", { ...presentedBase, type: "text-answer" }],
    ["true/false", { ...presentedBase, type: "true-false" }],
  ])("accepts a presented %s exercise", (_name, exercise) => {
    expect(exerciseResponseSchema.safeParse(exercise).success).toBe(true);
  });

  it("carries the options of a multiple-choice exercise", () => {
    const parsed = exerciseResponseSchema.parse(presentedMultipleChoice);

    expect(parsed.type === "multiple-choice" && parsed.options.map((o) => o.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("strips any answer key that a use case result might carry (an allowlist, not a filter)", () => {
    const leaky = {
      ...presentedMultipleChoice,
      correctOptionId: "a",
      explanation: "Dzień dobry is polite.",
      status: "published",
      configuration: { correctOptionId: "a", acceptedAnswers: ["x"] },
      options: [
        { id: "a", text: "Dzień dobry", correct: true },
        { id: "b", text: "Cześć", isCorrect: false },
      ],
    };

    const serialised = JSON.stringify(exerciseResponseSchema.parse(leaky));

    for (const secret of [
      "correctOptionId",
      "explanation",
      'status":"published',
      "configuration",
      "acceptedAnswers",
      'correct":',
      "isCorrect",
    ]) {
      expect(serialised, secret).not.toContain(secret);
    }
  });

  it.each(["text-answer", "true-false"])(
    "strips a correctAnswer or acceptedAnswers from a %s exercise",
    (type) => {
      const serialised = JSON.stringify(
        exerciseResponseSchema.parse({
          ...presentedBase,
          type,
          correctAnswer: true,
          acceptedAnswers: ["Dobranoc"],
          caseSensitive: false,
        }),
      );

      expect(serialised).not.toMatch(/correctAnswer|acceptedAnswers|caseSensitive|Dobranoc/);
    },
  );

  it.each([
    ["an unknown type", { ...presentedBase, type: "matching" }],
    ["a multiple-choice exercise without options", { ...presentedBase, type: "multiple-choice" }],
    ["a missing result", { ...presentedMultipleChoice, result: undefined }],
    ["an invalid id", { ...presentedMultipleChoice, id: "../etc/passwd" }],
  ])("rejects %s", (_name, exercise) => {
    expect(exerciseResponseSchema.safeParse(exercise).success).toBe(false);
  });
});

describe("exerciseListResponseSchema", () => {
  const summary = {
    id: "pl-greetings-polite-hello",
    lessonId: "pl-greetings",
    languageId: "pl",
    levelId: "a1",
    type: "multiple-choice",
    order: 10,
    prompt: "Which greeting is polite?",
    instructionLanguage: "en",
    result: RESULT,
  };

  it("accepts an ordered list with its progress", () => {
    const parsed = exerciseListResponseSchema.parse({
      exercises: [summary],
      progress: { total: 1, answered: 1 },
    });

    expect(parsed.exercises).toHaveLength(1);
  });

  it("strips answer-key fields from a summary", () => {
    const serialised = JSON.stringify(
      exerciseListResponseSchema.parse({
        exercises: [{ ...summary, correctOptionId: "a", options: [], explanation: "secret" }],
        progress: { total: 1, answered: 0 },
      }),
    );

    expect(serialised).not.toMatch(/correctOptionId|options|explanation|secret/);
  });

  it.each([
    { exercises: [summary], progress: { total: -1, answered: 0 } },
    { exercises: [summary], progress: { total: 1 } },
    { exercises: [{ ...summary, type: "matching" }], progress: { total: 1, answered: 0 } },
  ])("rejects %j", (body) => {
    expect(exerciseListResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe("exerciseAnswerRequestSchema — the only thing a client may send", () => {
  it.each([
    ["an option id", { answer: "opt-a" }],
    ["typed text", { answer: "Dzień dobry" }],
    ["true", { answer: true }],
    ["false", { answer: false }],
  ])("accepts %s", (_name, body) => {
    expect(exerciseAnswerRequestSchema.safeParse(body).success).toBe(true);
  });

  it.each([
    ["a client-supplied verdict", { answer: "x", correct: true }],
    ["a user id", { answer: "x", userId: "other-user" }],
    ["a score", { answer: "x", score: 999_999 }],
    ["a timestamp", { answer: "x", answeredAt: "2020-01-01T00:00:00.000Z" }],
    ["an exercise id", { answer: "x", exerciseId: "pl-other" }],
    ["a type", { answer: "x", type: "true-false" }],
    ["no answer", {}],
    ["a verdict instead of an answer", { correct: true }],
    ["a null answer", { answer: null }],
    ["a number answer", { answer: 1 }],
    ["an object answer", { answer: { optionId: "a" } }],
    ["an array answer", { answer: ["a"] }],
    ["an over-long text", { answer: "a".repeat(501) }],
    ["a bare string", "opt-a"],
    ["null", null],
    ["an array", []],
  ])("rejects %s", (_name, body) => {
    expect(exerciseAnswerRequestSchema.safeParse(body).success).toBe(false);
  });

  it("returns only the answer", () => {
    expect(exerciseAnswerRequestSchema.parse({ answer: "opt-a" })).toEqual({ answer: "opt-a" });
  });
});

describe("exerciseAnswerResponseSchema", () => {
  const evaluation = {
    correct: false,
    feedback: "Dzień dobry is polite.",
    correctAnswer: "a",
    result: RESULT,
  };

  it.each([
    evaluation,
    { ...evaluation, feedback: null },
    { ...evaluation, correctAnswer: true },
    { ...evaluation, correctAnswer: "Dobranoc" },
  ])("accepts %j", (body) => {
    expect(exerciseAnswerResponseSchema.safeParse(body).success).toBe(true);
  });

  it("strips anything beyond the verdict, the feedback, the correct answer and the result", () => {
    const serialised = JSON.stringify(
      exerciseAnswerResponseSchema.parse({
        ...evaluation,
        acceptedAnswers: ["Dobranoc", "Dobranoc."],
        userId: "u1",
        configuration: { caseSensitive: false },
      }),
    );

    expect(serialised).not.toMatch(/acceptedAnswers|userId|configuration|caseSensitive/);
  });

  it.each([
    { ...evaluation, correct: "yes" },
    { ...evaluation, correctAnswer: 3 },
    { ...evaluation, result: undefined },
  ])("rejects %j", (body) => {
    expect(exerciseAnswerResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe("exerciseIdParamSchema", () => {
  it("accepts a valid exercise id", () => {
    expect(exerciseIdParamSchema.parse({ exerciseId: "pl-greetings-polite-hello" })).toEqual({
      exerciseId: "pl-greetings-polite-hello",
    });
  });

  it.each([
    "",
    "PL-Greetings",
    "../../etc/passwd",
    "pl-x'; DROP TABLE exercise_attempts;--",
    "<script>alert(1)</script>",
    "pl-x%00",
    `pl-${"a".repeat(80)}`,
  ])("rejects %j", (exerciseId) => {
    expect(exerciseIdParamSchema.safeParse({ exerciseId }).success).toBe(false);
  });
});
