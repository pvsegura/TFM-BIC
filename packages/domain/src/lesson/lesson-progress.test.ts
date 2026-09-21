import { describe, expect, it } from "vitest";

import { createContentId } from "../content/content-id.js";
import {
  completeLesson,
  LESSON_PROGRESS_STATUSES,
  progressStatusOf,
  startLesson,
  type LessonProgress,
} from "./lesson-progress.js";

const USER = "user-1";
const LESSON = createContentId("pl-greetings");
const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T10:05:00.000Z");
const T2 = new Date("2026-01-01T10:10:00.000Z");

const inProgress: LessonProgress = {
  userId: USER,
  lessonId: LESSON,
  status: "in_progress",
  startedAt: T0,
  completedAt: null,
  updatedAt: T0,
};

const completed: LessonProgress = {
  ...inProgress,
  status: "completed",
  completedAt: T1,
  updatedAt: T1,
};

describe("progressStatusOf", () => {
  it("derives not_started from the absence of a record, so it is never stored", () => {
    expect(progressStatusOf(null)).toBe("not_started");
    expect(LESSON_PROGRESS_STATUSES).not.toContain("not_started");
  });

  it("reports the stored status otherwise", () => {
    expect(progressStatusOf(inProgress)).toBe("in_progress");
    expect(progressStatusOf(completed)).toBe("completed");
  });
});

describe("startLesson", () => {
  it("creates an in-progress record stamped with the given time", () => {
    expect(startLesson(null, USER, LESSON, T0)).toEqual(inProgress);
  });

  it("leaves an in-progress lesson untouched, including its start time", () => {
    expect(startLesson(inProgress, USER, LESSON, T2)).toEqual(inProgress);
  });

  it("never takes a completed lesson back to in progress", () => {
    expect(startLesson(completed, USER, LESSON, T2)).toEqual(completed);
  });
});

describe("completeLesson", () => {
  it("completes an in-progress lesson, keeping when it was started", () => {
    expect(completeLesson(inProgress, USER, LESSON, T1)).toEqual(completed);
  });

  it("completes a lesson that was never started, started and completed at the same moment", () => {
    expect(completeLesson(null, USER, LESSON, T1)).toEqual({
      userId: USER,
      lessonId: LESSON,
      status: "completed",
      startedAt: T1,
      completedAt: T1,
      updatedAt: T1,
    });
  });

  it("is idempotent: completing again changes nothing, not even the completion time", () => {
    const again = completeLesson(completed, USER, LESSON, T2);

    expect(again).toEqual(completed);
    expect(again.completedAt).toEqual(T1);
  });

  it("gives the same result however many times it is repeated", () => {
    let progress = completeLesson(null, USER, LESSON, T0);
    for (const time of [T1, T2, T2]) {
      progress = completeLesson(progress, USER, LESSON, time);
    }

    expect(progress).toEqual(completeLesson(null, USER, LESSON, T0));
  });

  it("does not mutate the record it was given", () => {
    const before = { ...inProgress };

    completeLesson(inProgress, USER, LESSON, T1);

    expect(inProgress).toEqual(before);
  });
});
