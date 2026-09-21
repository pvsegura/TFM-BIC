import {
  createContentId,
  createLanguageId,
  createLevelId,
  LanguageNotFoundError,
  LevelNotAvailableError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository, makeLanguage } from "../../content/test-support/fakes.js";
import { ListContentUseCase } from "../../content/use-cases/list-content.use-case.js";
import { FakeLessonProgressRepository, makeLessonCatalog } from "../test-support/fakes.js";
import { ListLessonsUseCase } from "./list-lessons.use-case.js";

const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T11:00:00.000Z");

function setup() {
  const contentRepository = new FakeContentRepository(makeLessonCatalog());
  const progressRepository = new FakeLessonProgressRepository();
  const useCase = new ListLessonsUseCase(
    new ListContentUseCase(contentRepository),
    progressRepository,
  );
  return { contentRepository, progressRepository, useCase };
}

const query = (userId: string, language: string, level: string) => ({
  userId,
  languageId: createLanguageId(language),
  levelId: createLevelId(level),
});

describe("ListLessonsUseCase", () => {
  it("lists the published lessons of a language and level in explicit order", async () => {
    const { useCase } = setup();

    const lessons = await useCase.execute(query("user-1", "pl", "a1"));

    // The repository holds pl-second (order 20) before pl-first (order 10).
    expect(lessons.map((lesson) => lesson.id)).toEqual(["pl-first", "pl-second"]);
  });

  it("leaves out drafts, archived items and published content that is not a lesson", async () => {
    const { useCase } = setup();

    const ids = (await useCase.execute(query("user-1", "pl", "a1"))).map((lesson) => lesson.id);

    expect(ids).not.toContain("pl-draft");
    expect(ids).not.toContain("pl-archived");
    expect(ids).not.toContain("pl-note");
  });

  it("returns list metadata only: no blocks and no status", async () => {
    const { useCase } = setup();

    const [lesson] = await useCase.execute(query("user-1", "pl", "a1"));

    expect(Object.keys(lesson ?? {}).sort()).toEqual([
      "description",
      "id",
      "instructionLanguage",
      "languageId",
      "levelId",
      "order",
      "progress",
      "title",
    ]);
  });

  it("reports not_started for lessons the student has no record for", async () => {
    const { useCase } = setup();

    const lessons = await useCase.execute(query("user-1", "pl", "a1"));

    expect(lessons.map((lesson) => lesson.progress)).toEqual([
      { status: "not_started", startedAt: null, completedAt: null },
      { status: "not_started", startedAt: null, completedAt: null },
    ]);
  });

  it("shows this student's own in-progress and completed lessons", async () => {
    const { progressRepository, useCase } = setup();
    await progressRepository.start("user-1", createContentId("pl-first"), T0);
    await progressRepository.complete("user-1", createContentId("pl-second"), T1);

    const lessons = await useCase.execute(query("user-1", "pl", "a1"));

    expect(lessons.map((lesson) => lesson.progress)).toEqual([
      { status: "in_progress", startedAt: T0, completedAt: null },
      { status: "completed", startedAt: T1, completedAt: T1 },
    ]);
  });

  it("never shows another student's progress", async () => {
    const { progressRepository, useCase } = setup();
    await progressRepository.complete("user-2", createContentId("pl-first"), T0);

    const lessons = await useCase.execute(query("user-1", "pl", "a1"));

    expect(lessons.every((lesson) => lesson.progress.status === "not_started")).toBe(true);
  });

  it("looks progress up once for the whole list, not once per lesson", async () => {
    const { progressRepository, useCase } = setup();

    await useCase.execute(query("user-1", "pl", "a1"));

    expect(progressRepository.batchLookups).toBe(1);
  });

  it("does not write anything: listing is a read", async () => {
    const { progressRepository, useCase } = setup();

    await useCase.execute(query("user-1", "pl", "a1"));

    expect(progressRepository.writeCalls).toBe(0);
  });

  it("filters by language: the same use case serves a language it has never heard of", async () => {
    const { useCase } = setup();

    const lessons = await useCase.execute(query("user-1", "xx", "a1"));

    expect(lessons.map((lesson) => lesson.id)).toEqual(["xx-only"]);
  });

  it("rejects an unknown language", async () => {
    const { useCase } = setup();

    await expect(useCase.execute(query("user-1", "zz", "a1"))).rejects.toBeInstanceOf(
      LanguageNotFoundError,
    );
  });

  it("rejects an inactive language", async () => {
    const catalog = makeLessonCatalog();
    const contentRepository = new FakeContentRepository({
      ...catalog,
      languages: catalog.languages.map((l) =>
        l.code === "xx" ? makeLanguage("xx", { isActive: false }) : l,
      ),
    });
    const useCase = new ListLessonsUseCase(
      new ListContentUseCase(contentRepository),
      new FakeLessonProgressRepository(),
    );

    await expect(useCase.execute(query("user-1", "xx", "a1"))).rejects.toBeInstanceOf(
      LanguageNotFoundError,
    );
  });

  it("rejects a level that is planned, even though it holds a published lesson", async () => {
    const { useCase } = setup();

    await expect(useCase.execute(query("user-1", "pl", "a2"))).rejects.toBeInstanceOf(
      LevelNotAvailableError,
    );
  });

  it("rejects a level the language does not declare", async () => {
    const { useCase } = setup();

    await expect(useCase.execute(query("user-1", "pl", "c2"))).rejects.toBeInstanceOf(
      LevelNotAvailableError,
    );
  });
});
