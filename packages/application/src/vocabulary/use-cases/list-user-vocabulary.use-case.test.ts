import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakeUserVocabularyRepository,
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../test-support/fakes.js";
import { ListUserVocabularyUseCase } from "./list-user-vocabulary.use-case.js";

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
  const useCase = new ListUserVocabularyUseCase(content, vocabularyRepository, userVocabulary);
  return { useCase, userVocabulary };
}

describe("ListUserVocabularyUseCase", () => {
  it("lists only the words the student has a record for", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items.map((i) => i.item.id)).toEqual(["pl-dom"]);
    expect(result.total).toBe(1);
  });

  it("is empty for a student who has touched nothing", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("filters by a stored status", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-kot" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const result = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      status: "learned",
      limit: 20,
    });

    expect(result.items.map((i) => i.item.id)).toEqual(["pl-kot"]);
  });

  it("never lists another student's saved words", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: "someone-else",
      vocabularyItemId: "pl-dom" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items).toEqual([]);
  });
});
