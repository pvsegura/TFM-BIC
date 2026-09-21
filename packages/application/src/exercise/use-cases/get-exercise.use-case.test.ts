import {
  createDefaultExerciseTypeRegistry,
  createExerciseId,
  ExerciseNotFoundError,
  type NewExerciseAttempt,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import {
  FakeContentRepository,
  FakeExerciseAttemptRepository,
  FakeExerciseRepository,
  makeExerciseCatalog,
} from "../../testing.js";
import { GetExerciseUseCase } from "./get-exercise.use-case.js";

const ANA = "user-ana";
const BEN = "user-ben";
const id = createExerciseId;

function setup() {
  const catalog = makeExerciseCatalog();
  const attempts = new FakeExerciseAttemptRepository();
  const useCase = new GetExerciseUseCase(
    new GetContentUseCase(new FakeContentRepository(catalog)),
    new FakeExerciseRepository(catalog.exercises.slice()),
    attempts,
    createDefaultExerciseTypeRegistry(),
  );
  return { useCase, attempts };
}

function attempt(userId: string, exerciseId: string, correct: boolean): NewExerciseAttempt {
  return {
    userId,
    exerciseId: id(exerciseId),
    submittedAnswer: "opt-b",
    correct,
    answeredAt: new Date("2026-01-01T10:00:00Z"),
  };
}

describe("GetExerciseUseCase", () => {
  it("returns the exercise as a student may see it before answering", async () => {
    const { useCase } = setup();

    const { exercise, result } = await useCase.execute({
      userId: ANA,
      exerciseId: id("pl-first-mc"),
    });

    expect(exercise).toMatchObject({
      id: "pl-first-mc",
      lessonId: "pl-first",
      type: "multiple-choice",
      options: [
        { id: "opt-a", text: "Dzień dobry" },
        { id: "opt-b", text: "Cześć" },
        { id: "opt-c", text: "Dobranoc" },
      ],
    });
    expect(result).toEqual({ status: "unanswered", attemptCount: 0, lastAnsweredAt: null });
  });

  it.each(["pl-first-mc", "pl-first-text", "pl-first-tf"])(
    "never includes the answer key or the explanation for %s",
    async (exerciseId) => {
      const { useCase } = setup();

      const shown = await useCase.execute({ userId: ANA, exerciseId: id(exerciseId) });

      expect(JSON.stringify(shown)).not.toMatch(
        /correctOptionId|acceptedAnswers|correctAnswer|configuration|explanation|caseSensitive|is polite\.|said when saying goodnight|used with friends/,
      );
    },
  );

  it("adds the student's own result, taken from their latest attempt", async () => {
    const { useCase, attempts } = setup();
    attempts.seed(attempt(ANA, "pl-first-mc", false), attempt(ANA, "pl-first-mc", true));

    const { result } = await useCase.execute({ userId: ANA, exerciseId: id("pl-first-mc") });

    expect(result).toMatchObject({ status: "correct", attemptCount: 2 });
  });

  it("does not show one student another's attempts", async () => {
    const { useCase, attempts } = setup();
    attempts.seed(attempt(BEN, "pl-first-mc", true));

    const { result } = await useCase.execute({ userId: ANA, exerciseId: id("pl-first-mc") });

    expect(result.status).toBe("unanswered");
  });

  it("is a read: it never writes", async () => {
    const { useCase, attempts } = setup();

    await useCase.execute({ userId: ANA, exerciseId: id("pl-first-mc") });

    expect(attempts.writeCalls).toBe(0);
  });

  it.each([
    ["an exercise that does not exist", "pl-first-nope"],
    ["a draft exercise", "pl-first-draft"],
    ["an archived exercise", "pl-first-archived"],
    ["an exercise of a draft lesson", "pl-draft-tf"],
    ["an exercise of a lesson in a level that is not available", "pl-planned-tf"],
    ["an exercise attached to content that is not a lesson", "pl-note-tf"],
  ])("refuses %s with the same not-found error", async (_name, exerciseId) => {
    const { useCase, attempts } = setup();

    const failure = await useCase
      .execute({ userId: ANA, exerciseId: id(exerciseId) })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ExerciseNotFoundError);
    expect(attempts.batchLookups).toBe(0);
  });
});
