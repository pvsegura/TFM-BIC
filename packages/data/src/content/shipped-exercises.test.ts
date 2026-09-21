import {
  GetContentUseCase,
  GetExerciseUseCase,
  ListLessonExercisesUseCase,
  type ExerciseAttemptRepository,
} from "@tfm-bic/application";
import { FakeExerciseAttemptRepository } from "@tfm-bic/application/testing";
import {
  createDefaultExerciseTypeRegistry,
  createLanguageId,
  createLevelId,
  isPublished,
  sortContentItems,
  validateContentCatalog,
  type ContentCatalog,
  type Exercise,
  type ExerciseAnswerValue,
} from "@tfm-bic/domain";
import { beforeAll, describe, expect, it } from "vitest";

import { CatalogExerciseRepository } from "./catalog-exercise-repository.js";
import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { FileSystemContentRepository } from "./file-system-content-repository.js";
import { loadContentCatalog } from "./load-content-catalog.js";

/**
 * The shipped exercises, tested as data. They run over the real `content/`
 * folder, so a malformed or inconsistent edit to any exercise fails CI here (and
 * in `pnpm content:validate`) before it can reach a student. They also prove the
 * content and the evaluators agree: every exercise's own answer key, fed through
 * the real evaluator, is judged correct.
 */
const PL = createLanguageId("pl");
const A1 = createLevelId("a1");
const registry = createDefaultExerciseTypeRegistry();

let catalog: ContentCatalog;

beforeAll(async () => {
  const result = await loadContentCatalog(DEFAULT_CONTENT_ROOT);
  if (!result.ok) {
    throw new Error(result.issues.map((i) => `${i.location}: ${i.message}`).join("\n"));
  }
  catalog = result.catalog;
});

/** The answer key, read straight from the exercise's configuration. */
function correctAnswerOf(exercise: Exercise): ExerciseAnswerValue {
  switch (exercise.type) {
    case "multiple-choice":
      return exercise.configuration.correctOptionId;
    case "text-answer":
      return exercise.configuration.acceptedAnswers[0] ?? "";
    case "true-false":
      return exercise.configuration.correctAnswer;
  }
}

/** An answer of the right shape that is certainly wrong. */
function wrongAnswerOf(exercise: Exercise): ExerciseAnswerValue {
  switch (exercise.type) {
    case "multiple-choice":
      return (
        exercise.configuration.options.find(
          (option) => option.id !== exercise.configuration.correctOptionId,
        )?.id ?? ""
      );
    case "text-answer":
      return "zzz-not-an-answer";
    case "true-false":
      return !exercise.configuration.correctAnswer;
  }
}

describe("the shipped exercises", () => {
  it("are consistent with the whole catalog", () => {
    expect(validateContentCatalog(catalog)).toEqual([]);
  });

  it("are a small representative set of Polish A1 exercises, not a course", () => {
    const a1 = catalog.exercises.filter((e) => e.languageId === PL && e.levelId === A1);

    expect(a1.length).toBeGreaterThanOrEqual(6);
    expect(a1.length).toBeLessThanOrEqual(20);
    expect(catalog.exercises.every((e) => e.languageId === PL && e.levelId === A1)).toBe(true);
  });

  it("show every exercise type the engine supports", () => {
    expect(new Set(catalog.exercises.map((e) => e.type))).toEqual(
      new Set(["multiple-choice", "text-answer", "true-false"]),
    );
  });

  it("belong to lessons that exist, are lessons, and are published, in the same language and level", () => {
    const lessons = new Map(
      catalog.content.filter((c) => c.type === "lesson").map((c) => [c.id, c]),
    );

    for (const exercise of catalog.exercises) {
      const lesson = lessons.get(exercise.lessonId);
      expect(lesson, exercise.id).toBeDefined();
      expect(lesson && isPublished(lesson), exercise.id).toBe(true);
      expect(lesson?.languageId, exercise.id).toBe(exercise.languageId);
      expect(lesson?.levelId, exercise.id).toBe(exercise.levelId);
    }
  });

  it("have unique, language-prefixed ids that are not content ids", () => {
    const ids = catalog.exercises.map((e) => e.id);
    const contentIds = new Set<string>(catalog.content.map((c) => c.id));

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("pl-")).toBe(true);
      expect(contentIds.has(id)).toBe(false);
    }
  });

  it("have an explicit, unique order inside each lesson", () => {
    const lessons = new Set(catalog.exercises.map((e) => e.lessonId));
    expect(lessons.size).toBeGreaterThan(0);

    for (const lesson of lessons) {
      const orders = catalog.exercises.filter((e) => e.lessonId === lesson).map((e) => e.order);
      expect(new Set(orders).size, lesson).toBe(orders.length);
    }
  });

  it("give every exercise a prompt and an explanation in English (the instruction language)", () => {
    for (const exercise of catalog.exercises) {
      expect(exercise.prompt.length, exercise.id).toBeGreaterThan(0);
      expect(exercise.explanation?.length ?? 0, exercise.id).toBeGreaterThan(0);
      expect(exercise.instructionLanguage).toBe("en");
    }
  });

  it("are all published, so the representative set is what a student actually gets", () => {
    expect(catalog.exercises.every(isPublished)).toBe(true);
  });

  it("are judged correct when answered with their own answer key, by the real evaluators", () => {
    for (const exercise of catalog.exercises) {
      const outcome = registry.evaluate(exercise, correctAnswerOf(exercise));

      expect(outcome.evaluation.correct, exercise.id).toBe(true);
    }
  });

  it("are judged incorrect when answered wrongly", () => {
    for (const exercise of catalog.exercises) {
      const outcome = registry.evaluate(exercise, wrongAnswerOf(exercise));

      expect(outcome.evaluation.correct, exercise.id).toBe(false);
    }
  });

  it("keep Polish diacritics: an accepted answer with diacritics is not matched by its stripped form", () => {
    const withDiacritics = catalog.exercises.filter(
      (e) =>
        e.type === "text-answer" &&
        e.configuration.acceptedAnswers.some((a) => /[ąćęłńóśźż]/i.test(a)),
    );

    expect(withDiacritics.length).toBeGreaterThanOrEqual(2);
    for (const exercise of withDiacritics) {
      if (exercise.type !== "text-answer") {
        continue;
      }
      const [primary = ""] = exercise.configuration.acceptedAnswers;
      const stripped = primary
        .replace(/[ąĄ]/g, "a")
        .replace(/[ćĆ]/g, "c")
        .replace(/[ęĘ]/g, "e")
        .replace(/[łŁ]/g, "l")
        .replace(/[ńŃ]/g, "n")
        .replace(/[óÓ]/g, "o")
        .replace(/[śŚ]/g, "s")
        .replace(/[źŹżŻ]/g, "z");

      expect(registry.evaluate(exercise, primary).evaluation.correct, exercise.id).toBe(true);
      expect(registry.evaluate(exercise, stripped).evaluation.correct, exercise.id).toBe(false);
    }
  });

  it("are not presented with their answer key", () => {
    for (const exercise of catalog.exercises) {
      const shown = JSON.stringify(registry.present(exercise));

      expect(shown, exercise.id).not.toMatch(
        /correctOptionId|acceptedAnswers|correctAnswer|caseSensitive|configuration|explanation/,
      );
      if (exercise.explanation !== undefined) {
        expect(shown, exercise.id).not.toContain(exercise.explanation);
      }
      if (exercise.type === "text-answer") {
        for (const accepted of exercise.configuration.acceptedAnswers) {
          expect(shown, exercise.id).not.toContain(accepted);
        }
      }
    }
  });

  it("are marked honestly: nothing claims to be a complete A1 exercise bank", () => {
    const text = JSON.stringify(catalog.exercises).toLowerCase();

    expect(text).not.toMatch(/complete a1|full a1|entire a1|cefr[- ]certified/);
  });
});

describe("the shipped exercises through the real use cases", () => {
  let list: ListLessonExercisesUseCase;
  let get: GetExerciseUseCase;
  let attempts: ExerciseAttemptRepository;

  beforeAll(async () => {
    const content = await FileSystemContentRepository.load(DEFAULT_CONTENT_ROOT);
    const getContent = new GetContentUseCase(content);
    const exercises = new CatalogExerciseRepository(catalog);
    attempts = new FakeExerciseAttemptRepository();
    list = new ListLessonExercisesUseCase(getContent, exercises, attempts);
    get = new GetExerciseUseCase(getContent, exercises, attempts, registry);
  });

  it("lists each lesson's exercises in order, and every one can be opened", async () => {
    const lessonIds = [...new Set(catalog.exercises.map((e) => e.lessonId))];
    expect(lessonIds.length).toBeGreaterThanOrEqual(2);

    for (const lessonId of lessonIds) {
      const { exercises, progress } = await list.execute({ userId: "user-1", lessonId });
      const expected = sortContentItems(catalog.exercises.filter((e) => e.lessonId === lessonId));

      expect(exercises.map((e) => e.id)).toEqual(expected.map((e) => e.id));
      expect(progress).toEqual({ total: expected.length, answered: 0 });
      for (const summary of exercises) {
        const { exercise } = await get.execute({ userId: "user-1", exerciseId: summary.id });
        expect(exercise.type).toBe(summary.type);
      }
    }
  });
});
