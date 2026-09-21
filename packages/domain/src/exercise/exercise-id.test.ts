import { describe, expect, it } from "vitest";

import { InvalidExerciseIdError } from "./errors/invalid-exercise-id.error.js";
import { createExerciseId, exerciseIdBelongsToLanguage, isValidExerciseId } from "./exercise-id.js";
import { EXERCISE_TYPES, isValidExerciseType } from "./exercise-type.js";

describe("ExerciseId", () => {
  it.each(["pl-greetings-polite-hello", "xx-a1", "pl-x"])("accepts %s", (id) => {
    expect(isValidExerciseId(id)).toBe(true);
    expect(createExerciseId(id)).toBe(id);
  });

  it.each([
    "",
    "Pl-Greetings",
    "pl_greetings",
    "pl--greetings",
    "-pl-greetings",
    "pl-greetings-",
    "1pl-greetings",
    "pl greetings",
    "pl/greetings",
    "../etc/passwd",
    "<script>",
    "pl-greetings'; DROP TABLE exercise_attempts;--",
    "pl-żółty",
    `pl-${"a".repeat(62)}`,
  ])("rejects %j", (id) => {
    expect(isValidExerciseId(id)).toBe(false);
    expect(() => createExerciseId(id)).toThrow(InvalidExerciseIdError);
  });

  it("accepts an id of exactly 64 characters and rejects 65", () => {
    expect(isValidExerciseId(`pl-${"a".repeat(61)}`)).toBe(true);
    expect(isValidExerciseId(`pl-${"a".repeat(62)}`)).toBe(false);
  });

  it("never echoes the rejected value in the error message beyond the id itself being quoted", () => {
    expect(() => createExerciseId("Bad Id")).toThrow(/Bad Id/);
  });

  it("is namespaced by language, so a misfiled exercise can be detected", () => {
    const id = createExerciseId("pl-greetings-polite-hello");

    expect(exerciseIdBelongsToLanguage(id, "pl" as never)).toBe(true);
    expect(exerciseIdBelongsToLanguage(id, "en" as never)).toBe(false);
    expect(exerciseIdBelongsToLanguage(id, "p" as never)).toBe(false);
  });
});

describe("ExerciseType", () => {
  it("starts with the three M7 types", () => {
    expect(EXERCISE_TYPES).toEqual(["multiple-choice", "text-answer", "true-false"]);
  });

  it.each(["multiple-choice", "text-answer", "true-false"])("accepts %s", (type) => {
    expect(isValidExerciseType(type)).toBe(true);
  });

  it.each(["", "Multiple-Choice", "matching", "text", "__proto__", "constructor", "toString"])(
    "rejects %j",
    (type) => {
      expect(isValidExerciseType(type)).toBe(false);
    },
  );
});
