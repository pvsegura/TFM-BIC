import { createContentId, createExerciseId } from "@tfm-bic/domain";
import { afterEach, describe, expect, it } from "vitest";

import { ContentValidationError } from "./content-validation.error.js";
import { loadContentRepositories } from "./load-content-repositories.js";
import {
  exerciseFile,
  makeContentRoot,
  validTree,
  type ContentRootHandle,
} from "./test-support/content-fixtures.js";

let handle: ContentRootHandle | undefined;

afterEach(async () => {
  await handle?.cleanup();
  handle = undefined;
});

describe("loadContentRepositories", () => {
  it("reads the tree once and serves content and exercises from the same validated catalog", async () => {
    handle = await makeContentRoot({
      ...validTree("xx"),
      "languages/xx/levels/a1/exercises/xx-one-a.json": exerciseFile(
        "xx-one-a",
        "xx",
        "a1",
        "xx-one",
      ),
    });

    const { contentRepository, exerciseRepository } = await loadContentRepositories(handle.root);

    expect(await contentRepository.findContent(createContentId("xx-one"))).not.toBeNull();
    expect(
      (await exerciseRepository.listByLesson(createContentId("xx-one"))).map((e) => e.id),
    ).toEqual(["xx-one-a"]);
    expect(await exerciseRepository.findById(createExerciseId("xx-one-a"))).not.toBeNull();
  });

  it("fails fast, listing every problem, when an exercise is invalid", async () => {
    handle = await makeContentRoot({
      ...validTree("xx"),
      "languages/xx/levels/a1/exercises/xx-one-a.json": exerciseFile(
        "xx-one-a",
        "xx",
        "a1",
        "xx-missing-lesson",
      ),
    });

    const error = await loadContentRepositories(handle.root).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ContentValidationError);
    expect((error as ContentValidationError).message).toContain("xx-missing-lesson");
  });

  it("loads the shipped content tree by default, exercises included", async () => {
    const { exerciseRepository } = await loadContentRepositories();

    const exercises = await exerciseRepository.listByLesson(createContentId("pl-greetings"));
    expect(exercises.length).toBeGreaterThan(0);
  });
});
