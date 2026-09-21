import {
  LanguageNotFoundError,
  LessonNotFoundError,
  LevelNotAvailableError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { mapLessonError } from "./lesson-error.mapper.js";

describe("mapLessonError", () => {
  it("maps a missing lesson to a 404 with a fixed message that never echoes the id", () => {
    expect(mapLessonError(new LessonNotFoundError("pl-<script>"))).toEqual({
      statusCode: 404,
      body: { error: "Lesson not found." },
    });
  });

  it("keeps the catalog's outcomes for language and level filters", () => {
    expect(mapLessonError(new LanguageNotFoundError("zz"))).toEqual({
      statusCode: 404,
      body: { error: "Language not found." },
    });
    expect(mapLessonError(new LevelNotAvailableError("pl", "a2"))).toEqual({
      statusCode: 404,
      body: { error: "Level not available." },
    });
  });

  it("rethrows anything unrecognised for the central 500 handler", () => {
    const unexpected = new Error("boom");

    expect(() => mapLessonError(unexpected)).toThrow(unexpected);
  });
});
