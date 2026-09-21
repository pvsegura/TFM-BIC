import {
  createDefaultExerciseTypeRegistry,
  createExerciseId,
  ExerciseNotFoundError,
  ExerciseTypeRegistry,
  InvalidExerciseAnswerError,
  registerExerciseType,
  multipleChoiceEvaluator,
  multipleChoicePresenter,
  UnsupportedExerciseTypeError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import {
  FakeContentRepository,
  FakeExerciseAttemptRepository,
  FakeExerciseRepository,
  makeExerciseCatalog,
} from "../../testing.js";
import { SubmitExerciseAnswerUseCase } from "./submit-exercise-answer.use-case.js";

const ANA = "user-ana";
const BEN = "user-ben";
const id = createExerciseId;
const T1 = new Date("2026-01-01T10:00:00.000Z");
const T2 = new Date("2026-01-01T10:05:00.000Z");

function setup(registry = createDefaultExerciseTypeRegistry()) {
  const catalog = makeExerciseCatalog();
  const attempts = new FakeExerciseAttemptRepository();
  const clock = { current: T1, now: () => clock.current };
  const useCase = new SubmitExerciseAnswerUseCase(
    new GetContentUseCase(new FakeContentRepository(catalog)),
    new FakeExerciseRepository(catalog.exercises.slice()),
    attempts,
    registry,
    clock,
  );
  return { useCase, attempts, clock };
}

describe("SubmitExerciseAnswerUseCase", () => {
  it("judges a correct answer and records it as an attempt stamped by the clock", async () => {
    const { useCase, attempts } = setup();

    const outcome = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-mc"),
      answer: "opt-a",
    });

    expect(outcome.evaluation).toEqual({
      correct: true,
      feedback: "Dzień dobry is polite.",
      correctAnswer: "opt-a",
    });
    expect(outcome.result).toEqual({ status: "correct", attemptCount: 1, lastAnsweredAt: T1 });
    expect(attempts.attempts).toEqual([
      {
        id: 1,
        userId: ANA,
        exerciseId: "pl-first-mc",
        submittedAnswer: "opt-a",
        correct: true,
        answeredAt: T1,
      },
    ]);
  });

  it("records an incorrect answer too, and says what was correct", async () => {
    const { useCase, attempts } = setup();

    const outcome = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-mc"),
      answer: "opt-c",
    });

    expect(outcome.evaluation).toMatchObject({ correct: false, correctAnswer: "opt-a" });
    expect(outcome.result.status).toBe("incorrect");
    expect(attempts.attempts).toHaveLength(1);
    expect(attempts.attempts[0]?.correct).toBe(false);
  });

  it("evaluates every type through its own evaluator", async () => {
    const { useCase } = setup();

    const text = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-text"),
      answer: "  dobranoc ",
    });
    const trueFalse = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-tf"),
      answer: false,
    });

    expect(text.evaluation.correct).toBe(true);
    expect(trueFalse.evaluation.correct).toBe(false);
  });

  it("stores the validated answer — a text answer without the whitespace around it", async () => {
    const { useCase, attempts } = setup();

    await useCase.execute({ userId: ANA, exerciseId: id("pl-first-text"), answer: "  Dobranoc " });

    expect(attempts.attempts[0]?.submittedAnswer).toBe("Dobranoc");
  });

  it("makes a retry a new attempt and leaves the earlier one exactly as it was", async () => {
    const { useCase, attempts, clock } = setup();
    await useCase.execute({ userId: ANA, exerciseId: id("pl-first-mc"), answer: "opt-b" });
    const first = { ...attempts.attempts[0] };

    clock.current = T2;
    const retry = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-mc"),
      answer: "opt-a",
    });

    expect(attempts.attempts).toHaveLength(2);
    expect(attempts.attempts[0]).toEqual(first);
    expect(attempts.attempts[0]?.correct).toBe(false);
    expect(attempts.attempts[1]).toMatchObject({ id: 2, correct: true, answeredAt: T2 });
    expect(retry.result).toEqual({ status: "correct", attemptCount: 2, lastAnsweredAt: T2 });
  });

  it("does not deduplicate: submitting the same answer twice is two attempts", async () => {
    const { useCase, attempts } = setup();

    await useCase.execute({ userId: ANA, exerciseId: id("pl-first-tf"), answer: true });
    const second = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-tf"),
      answer: true,
    });

    expect(attempts.attempts).toHaveLength(2);
    expect(second.result.attemptCount).toBe(2);
  });

  it("records the attempt for the given user only, and counts only that user's attempts", async () => {
    const { useCase, attempts } = setup();
    await useCase.execute({ userId: BEN, exerciseId: id("pl-first-mc"), answer: "opt-a" });

    const outcome = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-mc"),
      answer: "opt-b",
    });

    expect(attempts.attempts.map((a) => a.userId)).toEqual([BEN, ANA]);
    expect(outcome.result).toMatchObject({ status: "incorrect", attemptCount: 1 });
  });

  it("ignores any verdict, score, user or time a caller tries to smuggle into the input", async () => {
    const { useCase, attempts } = setup();
    const forged = {
      userId: ANA,
      exerciseId: id("pl-first-mc"),
      answer: "opt-c",
      correct: true,
      score: 999_999,
      answeredAt: new Date("1999-01-01T00:00:00Z"),
    };

    const outcome = await useCase.execute(forged);

    expect(outcome.evaluation.correct).toBe(false);
    expect(attempts.attempts[0]).toMatchObject({ correct: false, answeredAt: T1, userId: ANA });
    expect(attempts.attempts[0]).not.toHaveProperty("score");
  });

  it.each([
    ["an option the exercise does not have", "pl-first-mc", "opt-z"],
    ["a boolean for a multiple-choice exercise", "pl-first-mc", true],
    ["an empty text answer", "pl-first-text", ""],
    ["a whitespace-only text answer", "pl-first-text", "   "],
    ["a string for a true/false exercise", "pl-first-tf", "true"],
    ["no answer at all", "pl-first-tf", undefined],
    ["an object", "pl-first-mc", { optionId: "opt-a" }],
  ])("refuses %s without recording anything", async (_name, exerciseId, answer) => {
    const { useCase, attempts } = setup();

    await expect(
      useCase.execute({ userId: ANA, exerciseId: id(exerciseId), answer }),
    ).rejects.toBeInstanceOf(InvalidExerciseAnswerError);
    expect(attempts.writeCalls).toBe(0);
  });

  it.each([
    ["an exercise that does not exist", "pl-first-nope"],
    ["a draft exercise", "pl-first-draft"],
    ["an archived exercise", "pl-first-archived"],
    ["an exercise of a draft lesson", "pl-draft-tf"],
    ["an exercise of a lesson in a level that is not available", "pl-planned-tf"],
    ["an exercise attached to content that is not a lesson", "pl-note-tf"],
  ])("refuses %s as not found, without recording anything", async (_name, exerciseId) => {
    const { useCase, attempts } = setup();

    await expect(
      useCase.execute({ userId: ANA, exerciseId: id(exerciseId), answer: true }),
    ).rejects.toBeInstanceOf(ExerciseNotFoundError);
    expect(attempts.writeCalls).toBe(0);
  });

  it("refuses an exercise type nobody registered an evaluator for, without recording anything", async () => {
    const onlyMultipleChoice = new ExerciseTypeRegistry([
      registerExerciseType({
        evaluator: multipleChoiceEvaluator,
        presenter: multipleChoicePresenter,
      }),
    ]);
    const { useCase, attempts } = setup(onlyMultipleChoice);

    await expect(
      useCase.execute({ userId: ANA, exerciseId: id("pl-first-tf"), answer: true }),
    ).rejects.toBeInstanceOf(UnsupportedExerciseTypeError);
    expect(attempts.writeCalls).toBe(0);
  });
});
