import { createContentId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakeUserVocabularyRepository,
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../test-support/fakes.js";
import { GetVocabularyItemUseCase } from "./get-vocabulary-item.use-case.js";

const catalog = makeVocabularyCatalog();
const content = new FakeContentRepository(catalog);
const vocabularyRepository = new FakeVocabularyRepository(
  catalog.vocabularyCategories,
  catalog.vocabulary,
);
const userVocabulary = new FakeUserVocabularyRepository();
const useCase = new GetVocabularyItemUseCase(content, vocabularyRepository, userVocabulary);

const USER = "user-1";
const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("GetVocabularyItemUseCase", () => {
  it("returns the entry, its category title, and the student's state for it", async () => {
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });

    const result = await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(result.item.lemma).toBe("dom");
    expect(result.category.id).toBe("greetings");
    expect(result.userState).toEqual({
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });
  });

  it("returns the derived new state for a word the student has not touched", async () => {
    const result = await useCase.execute({
      userId: "someone-else",
      vocabularyItemId: "pl-dom" as never,
    });

    expect(result.userState).toEqual({
      status: "new",
      createdAt: null,
      updatedAt: null,
      learnedAt: null,
    });
  });

  it("never reads another student's state for the entry it returns", async () => {
    userVocabulary.seed({
      userId: "other-user",
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const result = await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(result.userState.status).toBe("saved");
  });

  it("throws not-found for a draft entry, without writing", async () => {
    userVocabulary.writeCalls = 0;

    await expect(
      useCase.execute({ userId: USER, vocabularyItemId: "pl-draft-word" as never }),
    ).rejects.toThrow(/was not found/);
    expect(userVocabulary.writeCalls).toBe(0);
  });

  it("ignores an unrelated content id, since vocabulary and lessons are separate namespaces", async () => {
    await expect(
      useCase.execute({ userId: USER, vocabularyItemId: createContentId("pl-first") as never }),
    ).rejects.toThrow(/was not found/);
  });
});
