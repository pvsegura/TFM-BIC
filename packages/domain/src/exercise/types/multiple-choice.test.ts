import { describe, expect, it } from "vitest";

import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { InvalidExerciseConfigurationError } from "../errors/invalid-exercise-configuration.error.js";
import { makeMultipleChoiceExercise, snapshot } from "../test-support/exercise-fixtures.js";
import { multipleChoiceEvaluator, multipleChoicePresenter } from "./multiple-choice.js";

const exercise = makeMultipleChoiceExercise();

describe("multipleChoiceEvaluator.parseAnswer", () => {
  it("accepts the id of one of the exercise's options", () => {
    expect(multipleChoiceEvaluator.parseAnswer(exercise, "opt-b")).toBe("opt-b");
  });

  it.each([
    ["an option id the exercise does not have", "opt-z"],
    ["the option's text instead of its id", "Cześć"],
    ["an empty string", ""],
    ["a number", 1],
    ["a boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["an object", { optionId: "opt-a" }],
    ["an array", ["opt-a"]],
    ["an id with different case", "OPT-A"],
    ["an id with surrounding whitespace", " opt-a "],
    ["an inherited property name", "__proto__"],
  ])("rejects %s", (_name, input) => {
    expect(() => multipleChoiceEvaluator.parseAnswer(exercise, input)).toThrow(
      InvalidExerciseAnswerError,
    );
  });
});

describe("multipleChoiceEvaluator.evaluate", () => {
  it("marks the correct option correct and returns it as the correct answer", () => {
    expect(multipleChoiceEvaluator.evaluate(exercise, "opt-a")).toEqual({
      correct: true,
      feedback: "Dzień dobry is polite.",
      correctAnswer: "opt-a",
    });
  });

  it("marks any other option incorrect and still reports which one was correct", () => {
    expect(multipleChoiceEvaluator.evaluate(exercise, "opt-b")).toEqual({
      correct: false,
      feedback: "Dzień dobry is polite.",
      correctAnswer: "opt-a",
    });
  });

  it("gives null feedback when the exercise has no explanation", () => {
    const bare = makeMultipleChoiceExercise({ explanation: undefined });

    expect(multipleChoiceEvaluator.evaluate(bare, "opt-a").feedback).toBeNull();
  });

  it("is deterministic: the same exercise and answer always give an equal result", () => {
    expect(multipleChoiceEvaluator.evaluate(exercise, "opt-c")).toEqual(
      multipleChoiceEvaluator.evaluate(exercise, "opt-c"),
    );
  });

  it("does not mutate the exercise", () => {
    const before = snapshot(exercise);

    multipleChoiceEvaluator.evaluate(exercise, "opt-b");

    expect(exercise).toEqual(before);
  });

  it("refuses an exercise whose configuration names a correct option it does not offer", () => {
    const malformed = makeMultipleChoiceExercise({
      configuration: {
        options: [
          { id: "opt-a", text: "One" },
          { id: "opt-b", text: "Two" },
        ],
        correctOptionId: "opt-missing",
      },
    });

    expect(() => multipleChoiceEvaluator.evaluate(malformed, "opt-a")).toThrow(
      InvalidExerciseConfigurationError,
    );
  });
});

describe("multipleChoicePresenter.present", () => {
  it("shows the prompt and the options, in order, and nothing that reveals the answer", () => {
    const presented = multipleChoicePresenter.present(exercise);

    expect(presented).toEqual({
      id: exercise.id,
      lessonId: exercise.lessonId,
      languageId: "pl",
      levelId: "a1",
      type: "multiple-choice",
      order: 10,
      instructionLanguage: "en",
      prompt: exercise.prompt,
      options: [
        { id: "opt-a", text: "Dzień dobry" },
        { id: "opt-b", text: "Cześć" },
        { id: "opt-c", text: "Dobranoc" },
      ],
    });
    const serialised = JSON.stringify(presented);
    expect(serialised).not.toContain("correctOptionId");
    expect(serialised).not.toContain("explanation");
    expect(serialised).not.toContain(exercise.explanation);
  });

  it("does not hand out the exercise's own option objects", () => {
    const presented = multipleChoicePresenter.present(exercise);

    expect(presented.options[0]).not.toBe(exercise.configuration.options[0]);
  });
});
