import type { ContentCatalog, Exercise, ExerciseId, LessonId } from "@verbysia/domain";
import { describe, expect, it } from "vitest";

import { FakeExerciseRepository } from "../../exercise/test-support/fakes.js";
import { FakeContentRepository, makeContentItem, makeLanguage } from "../test-support/fakes.js";
import { ResolveShortLinkUseCase } from "./resolve-short-link.use-case.js";

const catalog: ContentCatalog = {
  languages: [makeLanguage("es")],
  languageLevels: [],
  content: [
    makeContentItem("es-unit-3-b", "es", "a1", {
      unit: 3,
      order: 20,
      blocks: [
        { type: "section", phase: "structure", title: "Gramatyka" },
        { type: "explanation", text: "x" },
      ],
    }),
    makeContentItem("es-unit-3-a", "es", "a1", { unit: 3, order: 10 }),
    makeContentItem("es-unit-4-draft", "es", "a1", { unit: 4, status: "draft" }),
  ],
  exercises: [],
  vocabularyCategories: [],
  vocabularyItems: [],
  phoneticTopics: [],
  phoneticRepresentations: [],
} as unknown as ContentCatalog;

const exercise = {
  id: "es-u3-ex" as ExerciseId,
  lessonId: "es-unit-3-b" as LessonId,
  languageId: "es",
  levelId: "a1",
  status: "published",
  order: 1,
  instructionLanguage: "pl",
  prompt: "x",
  book: { unit: 3, number: 14, phase: "structure" },
  type: "true-false",
  configuration: { correctAnswer: true },
} as unknown as Exercise;

const resolve = new ResolveShortLinkUseCase(
  new FakeContentRepository(catalog),
  new FakeExerciseRepository([exercise]),
);

describe("ResolveShortLinkUseCase", () => {
  it("sends a unit link to the unit's first published lesson", async () => {
    await expect(resolve.execute({ course: "es-a1", unit: "3" })).resolves.toBe(
      "/learn/lessons/es-unit-3-a",
    );
  });

  it("sends a section link to the lesson holding that PUENTE section", async () => {
    await expect(
      resolve.execute({ course: "es-a1", unit: "3", target: "structure" }),
    ).resolves.toBe("/learn/lessons/es-unit-3-b#section-structure");
  });

  it("sends a workbook number to its exercise", async () => {
    await expect(resolve.execute({ course: "es-a1", unit: "3", target: "14" })).resolves.toBe(
      "/learn/exercises/es-u3-ex",
    );
  });

  it.each([
    ["an unknown unit", { course: "es-a1", unit: "9" }],
    ["a draft-only unit", { course: "es-a1", unit: "4" }],
    ["a malformed course", { course: "es_a1", unit: "3" }],
    ["a non-numeric unit", { course: "es-a1", unit: "x" }],
    ["a missing section", { course: "es-a1", unit: "3", target: "express" }],
    ["a missing exercise number", { course: "es-a1", unit: "3", target: "15" }],
    ["an unknown target", { course: "es-a1", unit: "3", target: "../admin" }],
  ])("resolves %s to nothing", async (_label, input) => {
    await expect(resolve.execute(input)).resolves.toBeNull();
  });
});
