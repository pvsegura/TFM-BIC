import { createContentId, LessonNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import { FakeLessonProgressRepository, makeLessonCatalog } from "../test-support/fakes.js";
import { StartLessonUseCase } from "./start-lesson.use-case.js";

const T0 = new Date("2026-01-01T10:00:00.000Z");

function setup() {
  const clock = new FixedClock(T0);
  const progressRepository = new FakeLessonProgressRepository();
  const useCase = new StartLessonUseCase(
    new GetContentUseCase(new FakeContentRepository(makeLessonCatalog())),
    progressRepository,
    clock,
  );
  return { clock, progressRepository, useCase };
}

const lessonId = (id: string) => createContentId(id);

describe("StartLessonUseCase", () => {
  it("marks the lesson in progress, stamped with the clock's time", async () => {
    const { useCase } = setup();

    const progress = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(progress).toEqual({ status: "in_progress", startedAt: T0, completedAt: null });
  });

  it("persists the state so a later read sees it", async () => {
    const { progressRepository, useCase } = setup();

    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(await progressRepository.findByUserAndLesson("user-1", lessonId("pl-first"))).toEqual({
      userId: "user-1",
      lessonId: "pl-first",
      status: "in_progress",
      startedAt: T0,
      completedAt: null,
      updatedAt: T0,
    });
  });

  it("is repeatable: starting again keeps one record and the original start time", async () => {
    const { clock, progressRepository, useCase } = setup();
    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });
    clock.advance(60_000);

    const again = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(again.startedAt).toEqual(T0);
    expect(progressRepository.records).toHaveLength(1);
  });

  it("does not take a completed lesson back to in progress", async () => {
    const { progressRepository, useCase } = setup();
    await progressRepository.complete("user-1", lessonId("pl-first"), T0);

    const progress = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(progress.status).toBe("completed");
  });

  it("records progress for the student it is called for and nobody else", async () => {
    const { progressRepository, useCase } = setup();

    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(progressRepository.records.map((r) => r.userId)).toEqual(["user-1"]);
  });

  it.each([
    ["does not exist", "pl-nonexistent"],
    ["is a draft", "pl-draft"],
    ["is not a lesson", "pl-note"],
    ["is in a level that is not available", "pl-planned"],
  ])("refuses a lesson that %s, without writing anything", async (_reason, id) => {
    const { progressRepository, useCase } = setup();

    await expect(
      useCase.execute({ userId: "user-1", lessonId: lessonId(id) }),
    ).rejects.toBeInstanceOf(LessonNotFoundError);
    expect(progressRepository.writeCalls).toBe(0);
  });
});
