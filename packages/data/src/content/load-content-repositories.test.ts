import {
  createContentId,
  createExerciseId,
  createLanguageId,
  createPhoneticRepresentationId,
  createVocabularyItemId,
} from "@tfm-bic/domain";
import { afterEach, describe, expect, it } from "vitest";

import { ContentValidationError } from "./content-validation.error.js";
import { loadContentRepositories } from "./load-content-repositories.js";
import {
  exerciseFile,
  makeContentRoot,
  phoneticFile,
  validTree,
  vocabularyFile,
  type ContentRootHandle,
} from "./test-support/content-fixtures.js";

let handle: ContentRootHandle | undefined;

afterEach(async () => {
  await handle?.cleanup();
  handle = undefined;
});

describe("loadContentRepositories", () => {
  it("reads the tree once and serves content, exercises and vocabulary from the same validated catalog", async () => {
    handle = await makeContentRoot({
      ...validTree("xx"),
      "languages/xx/levels/a1/exercises/xx-one-a.json": exerciseFile(
        "xx-one-a",
        "xx",
        "a1",
        "xx-one",
      ),
      "languages/xx/vocabulary/greetings.json": vocabularyFile("greetings", "xx"),
      "languages/xx/phonetics/consonants.json": phoneticFile("consonants", "xx"),
    });

    const { contentRepository, exerciseRepository, vocabularyRepository, phoneticRepository } =
      await loadContentRepositories(handle.root);

    expect(await contentRepository.findContent(createContentId("xx-one"))).not.toBeNull();
    expect(
      (await exerciseRepository.listByLesson(createContentId("xx-one"))).map((e) => e.id),
    ).toEqual(["xx-one-a"]);
    expect(await exerciseRepository.findById(createExerciseId("xx-one-a"))).not.toBeNull();
    expect(
      await vocabularyRepository.findItem(createVocabularyItemId("xx-greetings-one")),
    ).not.toBeNull();
    expect(
      await phoneticRepository.findRepresentation(
        createPhoneticRepresentationId("xx-ipa-consonants-one"),
      ),
    ).not.toBeNull();
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

  it("loads the shipped content tree's vocabulary too", async () => {
    const { vocabularyRepository } = await loadContentRepositories();

    const categories = await vocabularyRepository.listCategories(createLanguageId("pl"));
    expect(categories.length).toBeGreaterThan(0);
  });

  it("loads the shipped content tree's phonetics too", async () => {
    const { phoneticRepository } = await loadContentRepositories();

    const topics = await phoneticRepository.listTopics(createLanguageId("pl"));
    expect(topics.length).toBeGreaterThan(0);
  });
});
