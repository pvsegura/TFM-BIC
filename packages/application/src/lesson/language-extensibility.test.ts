import { createContentId, createLanguageId, createLevelId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  FakeContentRepository,
  makeContentItem,
  makeLanguage,
  makeLanguageLevel,
} from "../content/test-support/fakes.js";
import { GetContentUseCase } from "../content/use-cases/get-content.use-case.js";
import { ListContentUseCase } from "../content/use-cases/list-content.use-case.js";
import { FixedClock } from "../identity/test-support/fakes.js";
import { FakeLessonProgressRepository } from "./test-support/fakes.js";
import { CompleteLessonUseCase } from "./use-cases/complete-lesson.use-case.js";
import { GetLessonUseCase } from "./use-cases/get-lesson.use-case.js";
import { ListLessonsUseCase } from "./use-cases/list-lessons.use-case.js";
import { StartLessonUseCase } from "./use-cases/start-lesson.use-case.js";

/**
 * Lessons are as generic as content: adding a language or a level is adding data.
 * This builds two languages the codebase has never heard of — one right-to-left,
 * one with several levels — and runs the *same*, unmodified lesson use cases over
 * them, including progress. If any of this needed a new use case, repository or a
 * branch on the language, the design would be wrong.
 */
describe("lessons for a new language or level are data, not code", () => {
  const catalog = {
    languages: [makeLanguage("qq", { direction: "rtl" }), makeLanguage("zz")],
    languageLevels: [
      makeLanguageLevel("qq", "a1", "available"),
      makeLanguageLevel("zz", "a1", "available"),
      makeLanguageLevel("zz", "b2", "available"),
    ],
    content: [
      makeContentItem("qq-second", "qq", "a1", { order: 2 }),
      makeContentItem("qq-first", "qq", "a1", { order: 1 }),
      makeContentItem("zz-a1", "zz", "a1"),
      makeContentItem("zz-b2", "zz", "b2"),
    ],
  };
  const T0 = new Date("2026-01-01T10:00:00.000Z");

  function setup() {
    const content = new FakeContentRepository(catalog);
    const progress = new FakeLessonProgressRepository();
    const getContent = new GetContentUseCase(content);
    return {
      progress,
      list: new ListLessonsUseCase(new ListContentUseCase(content), progress),
      get: new GetLessonUseCase(getContent, progress),
      start: new StartLessonUseCase(getContent, progress, new FixedClock(T0)),
      complete: new CompleteLessonUseCase(getContent, progress, new FixedClock(T0)),
    };
  }

  const list = (
    useCases: ReturnType<typeof setup>,
    language: string,
    level: string,
    userId = "user-1",
  ) =>
    useCases.list.execute({
      userId,
      languageId: createLanguageId(language),
      levelId: createLevelId(level),
    });

  it("lists a new language's lessons in their own explicit order", async () => {
    const lessons = await list(setup(), "qq", "a1");

    expect(lessons.map((lesson) => lesson.id)).toEqual(["qq-first", "qq-second"]);
  });

  it("keeps two levels of the same language apart", async () => {
    const useCases = setup();

    expect((await list(useCases, "zz", "a1")).map((l) => l.id)).toEqual(["zz-a1"]);
    expect((await list(useCases, "zz", "b2")).map((l) => l.id)).toEqual(["zz-b2"]);
  });

  it("opens, starts and completes a new language's lesson exactly as any other", async () => {
    const useCases = setup();
    const lessonId = createContentId("qq-first");

    const { lesson, progress: before } = await useCases.get.execute({ userId: "user-1", lessonId });
    const started = await useCases.start.execute({ userId: "user-1", lessonId });
    const completed = await useCases.complete.execute({ userId: "user-1", lessonId });

    expect(lesson.languageId).toBe("qq");
    expect(before.status).toBe("not_started");
    expect(started.status).toBe("in_progress");
    expect(completed.status).toBe("completed");
  });

  it("tracks progress per student, per lesson, across languages, without any of it being aware of the language", async () => {
    const useCases = setup();
    await useCases.complete.execute({ userId: "user-1", lessonId: createContentId("qq-first") });
    await useCases.start.execute({ userId: "user-1", lessonId: createContentId("zz-a1") });

    const qq = await list(useCases, "qq", "a1");
    const zz = await list(useCases, "zz", "a1");
    const other = await list(useCases, "qq", "a1", "user-2");

    expect(qq.map((l) => l.progress.status)).toEqual(["completed", "not_started"]);
    expect(zz.map((l) => l.progress.status)).toEqual(["in_progress"]);
    expect(other.map((l) => l.progress.status)).toEqual(["not_started", "not_started"]);
  });
});
