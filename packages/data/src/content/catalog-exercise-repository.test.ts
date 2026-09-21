import {
  createContentId,
  createExerciseId,
  type ContentCatalog,
  type Exercise,
} from "@tfm-bic/domain";
import {
  makeMultipleChoiceExercise,
  makeTextAnswerExercise,
  makeTrueFalseExercise,
} from "@tfm-bic/domain/testing";
import { describe, expect, it } from "vitest";

import { CatalogExerciseRepository } from "./catalog-exercise-repository.js";

const exercises: Exercise[] = [
  makeTrueFalseExercise({ id: createExerciseId("pl-a-tf"), lessonId: createContentId("pl-a") }),
  makeMultipleChoiceExercise({
    id: createExerciseId("pl-a-draft"),
    lessonId: createContentId("pl-a"),
    status: "draft",
  }),
  makeTextAnswerExercise({ id: createExerciseId("pl-b-text"), lessonId: createContentId("pl-b") }),
];

const catalog: ContentCatalog = {
  languages: [],
  languageLevels: [],
  content: [],
  exercises,
  vocabularyCategories: [],
  vocabulary: [],
};
const repository = new CatalogExerciseRepository(catalog);

describe("CatalogExerciseRepository", () => {
  it("lists every exercise of one lesson, of every status (visibility is the use cases' job)", async () => {
    const found = await repository.listByLesson(createContentId("pl-a"));

    expect(found.map((exercise) => exercise.id).sort()).toEqual(["pl-a-draft", "pl-a-tf"]);
  });

  it("lists nothing for a lesson that has no exercises, or does not exist", async () => {
    expect(await repository.listByLesson(createContentId("pl-empty"))).toEqual([]);
  });

  it("finds an exercise by its id, or null", async () => {
    expect((await repository.findById(createExerciseId("pl-b-text")))?.type).toBe("text-answer");
    expect(await repository.findById(createExerciseId("pl-nope"))).toBeNull();
  });

  it("does not resolve an inherited property name to an exercise", async () => {
    expect(await repository.findById("__proto__" as never)).toBeNull();
    expect(await repository.findById("constructor" as never)).toBeNull();
  });

  it("offers no way to create or change an exercise", () => {
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(repository) as object).sort()).toEqual([
      "constructor",
      "findById",
      "listByLesson",
    ]);
  });
});
