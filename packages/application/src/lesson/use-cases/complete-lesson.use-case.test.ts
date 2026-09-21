import { createContentId, LessonNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import { FakeLessonProgressRepository, makeLessonCatalog } from "../test-support/fakes.js";
import { CompleteLessonUseCase } from "./complete-lesson.use-case.js";

const T0 = new Date("2026-01-01T10:00:00.000Z");

function setup() {
  const clock = new FixedClock(T0);
  const progressRepository = new FakeLessonProgressRepository();
  const useCase = new CompleteLessonUseCase(
    new GetContentUseCase(new FakeContentRepository(makeLessonCatalog())),
    progressRepository,
    clock,
  );
  return { clock, progressRepository, useCase };
}

const lessonId = (id: string) => createContentId(id);

describe("CompleteLessonUseCase", () => {
  it("completes a lesson, stamped with the clock's time", async () => {
    const { useCase } = setup();

    const progress = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(progress).toEqual({ status: "completed", startedAt: T0, completedAt: T0 });
  });

  it("completes a lesson that was already started, keeping when it was started", async () => {
    const { clock, progressRepository, useCase } = setup();
    await progressRepository.start("user-1", lessonId("pl-first"), T0);
    clock.advance(5 * 60_000);

    const progress = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(progress).toEqual({
      status: "completed",
      startedAt: T0,
      completedAt: new Date("2026-01-01T10:05:00.000Z"),
    });
  });

  it("persists the state so a later read sees it", async () => {
    const { progressRepository, useCase } = setup();

    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(
      (await progressRepository.findByUserAndLesson("user-1", lessonId("pl-first")))?.status,
    ).toBe("completed");
  });

  it("is idempotent: completing three times leaves one record with the first completion time", async () => {
    const { clock, progressRepository, useCase } = setup();

    const first = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });
    clock.advance(60_000);
    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });
    clock.advance(60_000);
    const third = await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(third).toEqual(first);
    expect(third.completedAt).toEqual(T0);
    expect(progressRepository.records).toHaveLength(1);
  });

  it("completes only the requested lesson", async () => {
    const { progressRepository, useCase } = setup();

    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    expect(progressRepository.records.map((r) => r.lessonId)).toEqual(["pl-first"]);
  });

  it("completes for the student it is called for; another student's progress is untouched", async () => {
    const { progressRepository, useCase } = setup();
    await progressRepository.start("user-2", lessonId("pl-first"), T0);

    await useCase.execute({ userId: "user-1", lessonId: lessonId("pl-first") });

    const other = await progressRepository.findByUserAndLesson("user-2", lessonId("pl-first"));
    expect(other?.status).toBe("in_progress");
    expect(other?.completedAt).toBeNull();
  });

  it.each([
    ["does not exist", "pl-nonexistent"],
    ["is a draft", "pl-draft"],
    ["is archived", "pl-archived"],
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
