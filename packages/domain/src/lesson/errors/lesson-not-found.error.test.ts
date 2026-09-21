import { describe, expect, it } from "vitest";

import { LessonNotFoundError } from "./lesson-not-found.error.js";

describe("LessonNotFoundError", () => {
  it("names the error and does not reveal why the lesson is unavailable", () => {
    const error = new LessonNotFoundError("pl-draft-lesson");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("LessonNotFoundError");
    expect(error.message).toBe('Lesson "pl-draft-lesson" was not found.');
    expect(error.message).not.toMatch(/draft status|unpublished|archived/i);
  });
});
