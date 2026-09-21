import { describe, expect, it, vi } from "vitest";

import { InvalidExerciseAnswerError } from "./errors/invalid-exercise-answer.error.js";
import { UnsupportedExerciseTypeError } from "./errors/unsupported-exercise-type.error.js";
import type { Exercise } from "./exercise.js";
import {
  createDefaultExerciseTypeRegistry,
  ExerciseTypeRegistry,
  registerExerciseType,
} from "./exercise-registry.js";
import { EXERCISE_TYPES } from "./exercise-type.js";
import {
  makeMultipleChoiceExercise,
  makeTextAnswerExercise,
  makeTrueFalseExercise,
} from "./test-support/exercise-fixtures.js";
import { multipleChoiceEvaluator, multipleChoicePresenter } from "./types/multiple-choice.js";
import { trueFalseEvaluator, trueFalsePresenter } from "./types/true-false.js";

const multipleChoice = makeMultipleChoiceExercise();
const textAnswer = makeTextAnswerExercise();
const trueFalse = makeTrueFalseExercise();

describe("the default registry", () => {
  const registry = createDefaultExerciseTypeRegistry();

  it("supports every exercise type the domain declares (a new type cannot be forgotten)", () => {
    for (const type of EXERCISE_TYPES) {
      expect(registry.supports(type), type).toBe(true);
    }
  });

  it.each([
    ["multiple choice", multipleChoice, "opt-a", true],
    ["multiple choice", multipleChoice, "opt-b", false],
    ["text answer", textAnswer, "dobranoc", true],
    ["text answer", textAnswer, "dobra noc", false],
    ["true/false", trueFalse, true, true],
    ["true/false", trueFalse, false, false],
  ] as const)("routes a %s exercise to its own evaluator", (_name, exercise, answer, correct) => {
    const result = registry.evaluate(exercise, answer);

    expect(result.evaluation.correct).toBe(correct);
    expect(result.answer).toBe(typeof answer === "string" ? answer.trim() : answer);
  });

  it("refuses a malformed answer instead of judging it", () => {
    expect(() => registry.evaluate(multipleChoice, "no-such-option")).toThrow(
      InvalidExerciseAnswerError,
    );
    expect(() => registry.evaluate(trueFalse, "true")).toThrow(InvalidExerciseAnswerError);
    expect(() => registry.evaluate(textAnswer, "")).toThrow(InvalidExerciseAnswerError);
  });

  it("presents each type without its answer key", () => {
    const shown = [multipleChoice, textAnswer, trueFalse].map((exercise) =>
      JSON.stringify(registry.present(exercise)),
    );

    for (const text of shown) {
      expect(text).not.toMatch(/correctOptionId|acceptedAnswers|correctAnswer|caseSensitive/);
    }
    expect(registry.present(multipleChoice)).toMatchObject({ type: "multiple-choice" });
  });
});

describe("a registered type handed an exercise of another type", () => {
  it("refuses it instead of judging it (the registry routes by type, so this is a defence in depth)", () => {
    const registered = registerExerciseType({
      evaluator: multipleChoiceEvaluator,
      presenter: multipleChoicePresenter,
    });

    expect(() => registered.evaluate(trueFalse, true)).toThrow(UnsupportedExerciseTypeError);
    expect(() => registered.present(trueFalse)).toThrow(UnsupportedExerciseTypeError);
  });
});

describe("registry safety", () => {
  const onlyMultipleChoice = new ExerciseTypeRegistry([
    registerExerciseType({
      evaluator: multipleChoiceEvaluator,
      presenter: multipleChoicePresenter,
    }),
  ]);

  it("rejects an exercise type nobody registered, when evaluating and when presenting", () => {
    expect(() => onlyMultipleChoice.evaluate(trueFalse, true)).toThrow(
      UnsupportedExerciseTypeError,
    );
    expect(() => onlyMultipleChoice.present(trueFalse)).toThrow(UnsupportedExerciseTypeError);
  });

  it.each(["__proto__", "constructor", "toString", "hasOwnProperty", "", "matching"])(
    "never resolves %j to an evaluator",
    (type) => {
      const forged = { ...trueFalse, type } as unknown as Exercise;

      expect(onlyMultipleChoice.supports(type)).toBe(false);
      expect(() => createDefaultExerciseTypeRegistry().evaluate(forged, true)).toThrow(
        UnsupportedExerciseTypeError,
      );
    },
  );

  it("refuses to register two evaluators for one type", () => {
    const registration = registerExerciseType({
      evaluator: trueFalseEvaluator,
      presenter: trueFalsePresenter,
    });

    expect(() => new ExerciseTypeRegistry([registration, registration])).toThrow(/true-false/);
  });

  it("refuses to register an evaluator and presenter of different types", () => {
    expect(() =>
      registerExerciseType({
        evaluator: trueFalseEvaluator,
        presenter: multipleChoicePresenter as never,
      }),
    ).toThrow(/same type/);
  });

  it("uses only the evaluator registered for the exercise's own type", () => {
    const parseAnswer = vi.spyOn(multipleChoiceEvaluator, "parseAnswer");
    const other = vi.spyOn(trueFalseEvaluator, "parseAnswer");
    const registry = createDefaultExerciseTypeRegistry();

    registry.evaluate(trueFalse, true);

    expect(other).toHaveBeenCalledTimes(1);
    expect(parseAnswer).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
