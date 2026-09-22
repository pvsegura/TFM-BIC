import { LanguageNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakeUserVocabularyRepository,
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../test-support/fakes.js";
import { ListVocabularyCategoriesUseCase } from "./list-vocabulary-categories.use-case.js";

const catalog = makeVocabularyCatalog();
const USER = "user-1";
const T0 = new Date("2026-01-01T00:00:00.000Z");

function setup() {
  const content = new FakeContentRepository(catalog);
  const vocabularyRepository = new FakeVocabularyRepository(
    catalog.vocabularyCategories,
    catalog.vocabulary,
  );
  const userVocabulary = new FakeUserVocabularyRepository();
  const useCase = new ListVocabularyCategoriesUseCase(
    content,
    vocabularyRepository,
    userVocabulary,
  );
  return { useCase, userVocabulary };
}

describe("ListVocabularyCategoriesUseCase", () => {
  it("lists only published categories, in order, with how many published entries each has", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never });

    expect(result.categories.map((c) => c.id)).toEqual(["greetings", "food"]);
    expect(result.categories.find((c) => c.id === "greetings")?.progress).toEqual({
      itemCount: 2,
      saved: 0,
      learning: 0,
      learned: 0,
    });
    expect(result.categories.find((c) => c.id === "food")?.progress).toEqual({
      itemCount: 1,
      saved: 0,
      learning: 0,
      learned: 0,
    });
  });

  it("counts the student's own progress per category and for the language as a whole", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-kot" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never });

    expect(result.categories.find((c) => c.id === "greetings")?.progress).toEqual({
      itemCount: 2,
      saved: 1,
      learning: 0,
      learned: 1,
    });
    expect(result.progress).toEqual({ itemCount: 3, saved: 1, learning: 0, learned: 1 });
  });

  it("never counts another student's progress", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: "someone-else",
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never });

    expect(result.progress).toEqual({ itemCount: 3, saved: 0, learning: 0, learned: 0 });
  });

  it("refuses an inactive or unknown language", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ userId: USER, languageId: "zz" as never })).rejects.toThrow(
      LanguageNotFoundError,
    );
  });

  it("proves the platform is language-agnostic", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "xx" as never });

    expect(result.categories.map((c) => c.id)).toEqual(["greetings"]);
    expect(result.categories[0]?.progress.itemCount).toBe(1);
  });
});
