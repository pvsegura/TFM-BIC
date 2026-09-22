import { VocabularyItemNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import {
  FakeUserVocabularyRepository,
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../test-support/fakes.js";
import { SaveVocabularyItemUseCase } from "./save-vocabulary-item.use-case.js";

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
  const clock = new FixedClock(T0);
  const useCase = new SaveVocabularyItemUseCase(
    content,
    vocabularyRepository,
    userVocabulary,
    clock,
  );
  return { useCase, userVocabulary, clock };
}

describe("SaveVocabularyItemUseCase", () => {
  it("saves a visible entry, stamped with the current time", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(result).toEqual({ status: "saved", createdAt: T0, updatedAt: T0, learnedAt: null });
  });

  it("does not create a duplicate when the word is already saved", async () => {
    const { useCase, userVocabulary, clock } = setup();
    await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });
    clock.advance(5 * 60 * 1000);

    await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(userVocabulary.records.filter((r) => r.userId === USER)).toHaveLength(1);
  });

  it("leaves a learned word learned: saving never regresses a word's status", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const result = await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(result.status).toBe("learned");
  });

  it("refuses to save an entry that is not visible, and writes nothing", async () => {
    const { useCase, userVocabulary } = setup();

    await expect(
      useCase.execute({ userId: USER, vocabularyItemId: "pl-draft-word" as never }),
    ).rejects.toThrow(VocabularyItemNotFoundError);
    expect(userVocabulary.writeCalls).toBe(0);
  });
});
