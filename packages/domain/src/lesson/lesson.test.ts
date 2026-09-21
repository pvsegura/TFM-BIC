import { describe, expect, it } from "vitest";

import { createContentId } from "../content/content-id.js";
import { CONTENT_TYPES } from "../content/content-type.js";
import { isLesson } from "./lesson.js";

describe("isLesson", () => {
  it("is true for content of type lesson", () => {
    expect(isLesson({ type: "lesson" })).toBe(true);
  });

  it("is false for every other content type", () => {
    for (const type of CONTENT_TYPES.filter((candidate) => candidate !== "lesson")) {
      expect(isLesson({ type })).toBe(false);
    }
  });

  it("identifies a lesson by the content id it already has — there is no separate lesson id", () => {
    const id = createContentId("pl-greetings");

    expect(isLesson({ id, type: "lesson" })).toBe(true);
  });
});
