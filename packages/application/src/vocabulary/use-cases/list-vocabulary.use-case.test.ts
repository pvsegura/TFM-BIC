import { LanguageNotFoundError, LevelNotAvailableError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakeUserVocabularyRepository,
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../test-support/fakes.js";
import { ListVocabularyUseCase } from "./list-vocabulary.use-case.js";

const catalog = makeVocabularyCatalog();

function setup() {
  const content = new FakeContentRepository(catalog);
  const vocabularyRepository = new FakeVocabularyRepository(
    catalog.vocabularyCategories,
    catalog.vocabulary,
  );
  const userVocabulary = new FakeUserVocabularyRepository();
  const useCase = new ListVocabularyUseCase(content, vocabularyRepository, userVocabulary);
  return { useCase, userVocabulary, vocabularyRepository };
}

const USER = "user-1";
const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("ListVocabularyUseCase", () => {
  it("lists the published entries of a language, in category order then entry order", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items.map((i) => i.item.id)).toEqual(["pl-dom", "pl-kot", "pl-chleb"]);
    expect(result.total).toBe(3);
    expect(result.nextAfter).toBeNull();
  });

  it("excludes a draft entry and an entry hidden behind a draft category", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items.map((i) => i.item.id)).not.toContain("pl-draft-word");
    expect(result.items.map((i) => i.item.id)).not.toContain("pl-hidden");
  });

  it("filters by category", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      categoryId: "food" as never,
      limit: 20,
    });

    expect(result.items.map((i) => i.item.id)).toEqual(["pl-chleb"]);
  });

  it("filters by level, excluding entries that have no level", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      levelId: "a1",
      limit: 20,
    });

    expect(result.items.map((i) => i.item.id)).toEqual(["pl-dom", "pl-kot"]);
  });

  it("filters by search term, across the lemma and the meaning", async () => {
    const { useCase } = setup();

    const byLemma = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      q: "dom",
      limit: 20,
    });
    const byMeaning = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      q: "bread",
      limit: 20,
    });

    expect(byLemma.items.map((i) => i.item.id)).toEqual(["pl-dom"]);
    expect(byMeaning.items.map((i) => i.item.id)).toEqual(["pl-chleb"]);
  });

  it("filters by the student's own status, new included", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const learned = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      status: "learned",
      limit: 20,
    });
    const untouched = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      status: "new",
      limit: 20,
    });

    expect(learned.items.map((i) => i.item.id)).toEqual(["pl-dom"]);
    expect(untouched.items.map((i) => i.item.id)).toEqual(["pl-kot", "pl-chleb"]);
  });

  it("never looks at another student's state", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: "someone-else",
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items.find((i) => i.item.id === "pl-dom")?.userState.status).toBe("new");
  });

  it("paginates with a cursor, and needs one batched lookup for the whole page", async () => {
    const { useCase, userVocabulary } = setup();

    const page1 = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 2 });
    expect(page1.items.map((i) => i.item.id)).toEqual(["pl-dom", "pl-kot"]);
    expect(page1.nextAfter).toBe("pl-kot");
    expect(page1.total).toBe(3);

    userVocabulary.batchLookups = 0;
    const page2 = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      limit: 2,
      after: page1.nextAfter as never,
    });
    expect(page2.items.map((i) => i.item.id)).toEqual(["pl-chleb"]);
    expect(page2.nextAfter).toBeNull();
    expect(userVocabulary.batchLookups).toBe(1);
  });

  it("proves the platform is language-agnostic: a second, fictional language works the same way", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "xx" as never, limit: 20 });

    expect(result.items.map((i) => i.item.id)).toEqual(["xx-word"]);
  });

  it("refuses an inactive or unknown language", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: USER, languageId: "zz" as never, limit: 20 }),
    ).rejects.toThrow(LanguageNotFoundError);
  });

  it("refuses a level the language does not offer or has not made available", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        userId: USER,
        languageId: "pl" as never,
        levelId: "a2",
        limit: 20,
      }),
    ).rejects.toThrow(LevelNotAvailableError);
  });
});
