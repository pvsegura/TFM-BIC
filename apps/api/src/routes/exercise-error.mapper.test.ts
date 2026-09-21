import {
  ContentNotFoundError,
  ExerciseNotFoundError,
  InvalidExerciseAnswerError,
  InvalidExerciseConfigurationError,
  LessonNotFoundError,
  UnsupportedExerciseTypeError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { mapExerciseError } from "./exercise-error.mapper.js";

describe("mapExerciseError", () => {
  it("maps a missing or hidden exercise to one fixed 404 that never echoes the id", () => {
    const mapped = mapExerciseError(new ExerciseNotFoundError("pl-secret-draft"));

    expect(mapped).toEqual({ statusCode: 404, body: { error: "Exercise not found." } });
    expect(JSON.stringify(mapped)).not.toContain("pl-secret-draft");
  });

  it("maps a malformed answer to a 400 with its own fixed message", () => {
    expect(mapExerciseError(new InvalidExerciseAnswerError())).toEqual({
      statusCode: 400,
      body: { error: "Invalid answer." },
    });
  });

  it("maps an exercise type nobody registered to a 501 that says nothing more", () => {
    const mapped = mapExerciseError(new UnsupportedExerciseTypeError("matching"));

    expect(mapped).toEqual({
      statusCode: 501,
      body: { error: "This kind of exercise is not supported." },
    });
    expect(JSON.stringify(mapped)).not.toContain("matching");
  });

  it("keeps the lesson outcomes for a lesson that cannot be seen", () => {
    expect(mapExerciseError(new LessonNotFoundError("pl-draft"))).toEqual({
      statusCode: 404,
      body: { error: "Lesson not found." },
    });
    expect(mapExerciseError(new ContentNotFoundError("pl-x")).statusCode).toBe(404);
  });

  it("rethrows what it does not recognise, so the central handler answers with a generic 500", () => {
    const broken = new InvalidExerciseConfigurationError("pl-a", "the correct option is missing");

    expect(() => mapExerciseError(broken)).toThrow(broken);
    expect(() => mapExerciseError(new Error("database exploded"))).toThrow("database exploded");
  });
});
