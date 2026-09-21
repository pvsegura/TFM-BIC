import { createContentId, LessonNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { FakeLessonProgressRepository, makeLessonCatalog } from "../test-support/fakes.js";
import { GetLessonUseCase } from "./get-lesson.use-case.js";

const T0 = new Date("2026-01-01T10:00:00.000Z");

function setup() {
  const contentRepository = new FakeContentRepository(makeLessonCatalog());
  const progressRepository = new FakeLessonProgressRepository();
  const useCase = new GetLessonUseCase(
    new GetContentUseCase(contentRepository),
    progressRepository,
  );
  return { progressRepository, useCase };
}

const lessonId = (id: string) => createContentId(id);

describe("GetLessonUseCase", () => {
  it("returns the published lesson with its blocks", async () => {
    const { useCase } = setup();

    const { lesson } = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(lesson).toMatchObject({
      id: "pl-first",
      languageId: "pl",
      levelId: "a1",
      type: "lesson",
      title: "Title of pl-first",
      blocks: [{ type: "explanation", text: "Body of pl-first" }],
    });
  });

  it("reports not_started when the student has no record", async () => {
    const { useCase } = setup();

    const { progress } = await useCase.execute({
      userId: "user-1",
      lessonId: lessonId("pl-first"),
    });

    expect(progress).toEqual({ status: "not_started", startedAt: null, completedAt: null });
  });

  it("reports the student's own in-progress state", async () => {
    const { progressRepository, useCase } = setup();
    await progressRepository.start("user-1", lessonId("pl-first"), T0);

    const { progress } = await useCase.execute({
      userId: "user-1",
      lessonId: lessonId("pl-first"),
    });

    expect(progress).toEqual({ status: "in_progress", startedAt: T0, completedAt: null });
  });

  it("reports the student's own completed state", async () => {
    const { progressRepository, useCase } = setup();
    await progressRepository.complete("user-1", lessonId("pl-first"), T0);

    const { progress } = await useCase.execute({
      userId: "user-1",
      lessonId: lessonId("pl-first"),
    });

    expect(progress).toEqual({ status: "completed", startedAt: T0, completedAt: T0 });
  });

  it("never shows another student's progress", async () => {
    const { progressRepository, useCase } = setup();
    await progressRepository.complete("user-2", lessonId("pl-first"), T0);

    const { progress } = await useCase.execute({
      userId: "user-1",
      lessonId: lessonId("pl-first"),
    });

    expect(progress.status).toBe("not_started");
  });

  it("does not write anything: opening a lesson through GET is a read", async () => {
    const { progressRepository, useCase } = setup();

    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(progressRepository.writeCalls).toBe(0);
    expect(progressRepository.records).toEqual([]);
  });

  it.each([
    ["does not exist", "pl-nonexistent"],
    ["is a draft", "pl-draft"],
    ["is archived", "pl-archived"],
    ["is published content but not a lesson", "pl-note"],
    ["is published but in a level that is not available", "pl-planned"],
    ["is a draft in a level that is not available", "pl-later"],
  ])("refuses a lesson that %s with the same not-found error", async (_reason, id) => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: "user-1", lessonId: lessonId(id) }),
    ).rejects.toBeInstanceOf(LessonNotFoundError);
  });

  it("serves a lesson of any language through the same code path", async () => {
    const { useCase } = setup();

    const { lesson } = await useCase.execute({ userId: "user-1", lessonId: lessonId("xx-only") });

    expect(lesson.languageId).toBe("xx");
  });
});
