import { describe, expect, it } from "vitest";

import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { InvalidExerciseConfigurationError } from "../errors/invalid-exercise-configuration.error.js";
import { makeTrueFalseExercise, snapshot } from "../test-support/exercise-fixtures.js";
import { trueFalseEvaluator, trueFalsePresenter } from "./true-false.js";

const isTrue = makeTrueFalseExercise();
const isFalse = makeTrueFalseExercise({ configuration: { correctAnswer: false } });

describe("trueFalseEvaluator.parseAnswer", () => {
  it.each([true, false])("accepts the boolean %s", (value) => {
    expect(trueFalseEvaluator.parseAnswer(isTrue, value)).toBe(value);
  });

  it.each([
    ["the string true", "true"],
    ["the string false", "false"],
    ["the number 1", 1],
    ["the number 0", 0],
    ["null", null],
    ["undefined", undefined],
    ["an object", { value: true }],
    ["an array", [true]],
    ["an empty string", ""],
  ])("rejects %s", (_name, input) => {
    expect(() => trueFalseEvaluator.parseAnswer(isTrue, input)).toThrow(InvalidExerciseAnswerError);
  });
});

describe("trueFalseEvaluator.evaluate", () => {
  it("marks true correct when the statement is true", () => {
    expect(trueFalseEvaluator.evaluate(isTrue, true)).toEqual({
      correct: true,
      feedback: isTrue.explanation,
      correctAnswer: true,
    });
  });

  it("marks false incorrect when the statement is true, and says what was correct", () => {
    expect(trueFalseEvaluator.evaluate(isTrue, false)).toEqual({
      correct: false,
      feedback: isTrue.explanation,
      correctAnswer: true,
    });
  });

  it("marks false correct when the statement is false", () => {
    expect(trueFalseEvaluator.evaluate(isFalse, false)).toMatchObject({
      correct: true,
      correctAnswer: false,
    });
  });

  it("marks true incorrect when the statement is false", () => {
    expect(trueFalseEvaluator.evaluate(isFalse, true)).toMatchObject({
      correct: false,
      correctAnswer: false,
    });
  });

  it("gives null feedback when there is no explanation", () => {
    expect(
      trueFalseEvaluator.evaluate(makeTrueFalseExercise({ explanation: undefined }), true).feedback,
    ).toBeNull();
  });

  it("is deterministic and does not mutate the exercise", () => {
    const before = snapshot(isTrue);

    expect(trueFalseEvaluator.evaluate(isTrue, false)).toEqual(
      trueFalseEvaluator.evaluate(isTrue, false),
    );
    expect(isTrue).toEqual(before);
  });

  it("refuses an exercise whose configuration has no boolean answer", () => {
    const malformed = makeTrueFalseExercise({
      configuration: { correctAnswer: "true" as unknown as boolean },
    });

    expect(() => trueFalseEvaluator.evaluate(malformed, true)).toThrow(
      InvalidExerciseConfigurationError,
    );
  });
});

describe("trueFalsePresenter.present", () => {
  it("shows the statement and nothing that reveals whether it is true", () => {
    const presented = trueFalsePresenter.present(isTrue);

    expect(presented).toEqual({
      id: isTrue.id,
      lessonId: isTrue.lessonId,
      languageId: "pl",
      levelId: "a1",
      type: "true-false",
      order: 30,
      instructionLanguage: "en",
      prompt: isTrue.prompt,
    });
    expect(JSON.stringify(presented)).not.toContain("correctAnswer");
  });
});
