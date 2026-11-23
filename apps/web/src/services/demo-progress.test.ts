import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./lessons-api.js", () => ({
  startLesson: vi.fn(() => Promise.resolve({})),
  completeLesson: vi.fn(() => Promise.resolve({})),
}));
vi.mock("./exercises-api.js", () => ({
  submitAnswer: vi.fn((id: string) =>
    id === "gone" ? Promise.reject(new Error("404")) : Promise.resolve({}),
  ),
}));

import { completeLesson, startLesson } from "./lessons-api.js";
import { submitAnswer } from "./exercises-api.js";
import {
  hasDemoProgress,
  readDemoProgress,
  recordDemoAnswer,
  recordDemoLessonCompleted,
  syncDemoProgress,
} from "./demo-progress.js";

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("demo progress", () => {
  it("keeps answers and completed lessons in the browser, without duplicates", () => {
    recordDemoAnswer("ex-1", true);
    recordDemoLessonCompleted("lesson-1");
    recordDemoLessonCompleted("lesson-1");

    expect(readDemoProgress()).toEqual({
      completedLessons: ["lesson-1"],
      answers: { "ex-1": true },
    });
    expect(hasDemoProgress()).toBe(true);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("verbysia-demo-progress", "{not json");
    expect(readDemoProgress()).toEqual({ completedLessons: [], answers: {} });
  });

  it("replays everything into the account, skips what fails, then clears", async () => {
    recordDemoAnswer("ex-1", true);
    recordDemoAnswer("gone", "x");
    recordDemoLessonCompleted("lesson-1");

    expect(await syncDemoProgress()).toBe(2);
    expect(submitAnswer).toHaveBeenCalledTimes(2);
    expect(startLesson).toHaveBeenCalledWith("lesson-1");
    expect(completeLesson).toHaveBeenCalledWith("lesson-1");
    expect(hasDemoProgress()).toBe(false);
  });
});
