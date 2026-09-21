import {
  createContentId,
  createExerciseId,
  LessonNotFoundError,
  type NewExerciseAttempt,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import {
  FakeContentRepository,
  makeExerciseCatalog,
  FakeExerciseAttemptRepository,
  FakeExerciseRepository,
} from "../../testing.js";
import { ListLessonExercisesUseCase } from "./list-lesson-exercises.use-case.js";

const ANA = "user-ana";
const BEN = "user-ben";

function setup() {
  const catalog = makeExerciseCatalog();
  const exercises = new FakeExerciseRepository(catalog.exercises.slice());
  const attempts = new FakeExerciseAttemptRepository();
  const useCase = new ListLessonExercisesUseCase(
    new GetContentUseCase(new FakeContentRepository(catalog)),
    exercises,
    attempts,
  );
  return { useCase, exercises, attempts };
}

function attempt(
  userId: string,
  exerciseId: string,
  correct: boolean,
  at: string,
): NewExerciseAttempt {
  return {
    userId,
    exerciseId: createExerciseId(exerciseId),
    submittedAnswer: true,
    correct,
    answeredAt: new Date(at),
  };
}

const lesson = (id: string) => createContentId(id);

describe("ListLessonExercisesUseCase", () => {
  it("lists the published exercises of a visible lesson in explicit order, whatever order storage returns them in", async () => {
    const { useCase } = setup();

    const { exercises } = await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      "pl-first-mc",
      "pl-first-text",
      "pl-first-tf",
    ]);
    expect(exercises.map((exercise) => exercise.order)).toEqual([10, 20, 30]);
  });

  it("breaks a tie on order by id, so the order never depends on storage", async () => {
    const { useCase, exercises } = setup();
    const [first, second] = exercises.exercises.filter((e) => e.lessonId === "pl-first");
    if (!first || !second) {
      throw new Error("fixture missing");
    }
    exercises.exercises = [
      { ...second, id: createExerciseId("pl-first-b"), order: 5 },
      { ...first, id: createExerciseId("pl-first-a"), order: 5 },
    ];

    const result = await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(result.exercises.map((e) => e.id)).toEqual(["pl-first-a", "pl-first-b"]);
  });

  it("never lists a draft or an archived exercise", async () => {
    const { useCase } = setup();

    const { exercises } = await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(exercises.map((exercise) => exercise.id)).not.toContain("pl-first-draft");
    expect(exercises.map((exercise) => exercise.id)).not.toContain("pl-first-archived");
  });

  it("gives each exercise its type, prompt and language metadata", async () => {
    const { useCase } = setup();

    const { exercises } = await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(exercises.map((exercise) => exercise.type)).toEqual([
      "multiple-choice",
      "text-answer",
      "true-false",
    ]);
    expect(exercises[0]).toMatchObject({
      lessonId: "pl-first",
      languageId: "pl",
      levelId: "a1",
      instructionLanguage: "en",
    });
    expect(exercises[0]?.prompt.length).toBeGreaterThan(0);
  });

  it("shows every exercise as unanswered to a student with no attempts", async () => {
    const { useCase } = setup();

    const { exercises, progress } = await useCase.execute({
      userId: ANA,
      lessonId: lesson("pl-first"),
    });

    expect(exercises.map((e) => e.result)).toEqual([
      { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
      { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
      { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
    ]);
    expect(progress).toEqual({ total: 3, answered: 0 });
  });

  it("derives each result from the student's latest attempt and counts them all", async () => {
    const { useCase, attempts } = setup();
    attempts.seed(
      attempt(ANA, "pl-first-mc", false, "2026-01-01T10:00:00Z"),
      attempt(ANA, "pl-first-mc", true, "2026-01-01T10:05:00Z"),
      attempt(ANA, "pl-first-tf", true, "2026-01-01T10:06:00Z"),
      attempt(ANA, "pl-first-tf", false, "2026-01-01T10:07:00Z"),
    );

    const { exercises, progress } = await useCase.execute({
      userId: ANA,
      lessonId: lesson("pl-first"),
    });

    expect(exercises.map((e) => e.result)).toEqual([
      { status: "correct", attemptCount: 2, lastAnsweredAt: new Date("2026-01-01T10:05:00Z") },
      { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
      { status: "incorrect", attemptCount: 2, lastAnsweredAt: new Date("2026-01-01T10:07:00Z") },
    ]);
    expect(progress).toEqual({ total: 3, answered: 2 });
  });

  it("only ever uses the requesting student's own attempts", async () => {
    const { useCase, attempts } = setup();
    attempts.seed(attempt(BEN, "pl-first-mc", true, "2026-01-01T10:00:00Z"));

    const { exercises } = await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(exercises[0]?.result.status).toBe("unanswered");
  });

  it("looks attempts up once for the whole list, not once per exercise", async () => {
    const { useCase, attempts } = setup();

    await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(attempts.batchLookups).toBe(1);
  });

  it("returns an empty list, not an error, for a visible lesson with no exercises", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: ANA, lessonId: lesson("pl-empty") });

    expect(result).toEqual({ exercises: [], progress: { total: 0, answered: 0 } });
  });

  it("is a read: it never writes an attempt", async () => {
    const { useCase, attempts } = setup();

    await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(attempts.writeCalls).toBe(0);
    expect(attempts.attempts).toEqual([]);
  });

  it("exposes no answer key anywhere in what it returns", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: ANA, lessonId: lesson("pl-first") });

    expect(JSON.stringify(result)).not.toMatch(
      /correctOptionId|acceptedAnswers|correctAnswer|configuration|explanation|caseSensitive/,
    );
  });

  it.each([
    ["a lesson that does not exist", "pl-nope"],
    ["a draft lesson", "pl-draft"],
    ["an archived lesson", "pl-archived"],
    ["content that is an explanation, not a lesson", "pl-note"],
    ["a lesson in a level that is not available", "pl-planned"],
  ])("refuses %s as a missing lesson, without reading exercises or attempts", async (_name, id) => {
    const { useCase, attempts } = setup();

    await expect(useCase.execute({ userId: ANA, lessonId: lesson(id) })).rejects.toBeInstanceOf(
      LessonNotFoundError,
    );
    expect(attempts.batchLookups).toBe(0);
  });
});
