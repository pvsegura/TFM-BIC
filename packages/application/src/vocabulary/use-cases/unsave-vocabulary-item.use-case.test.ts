import { describe, expect, it } from "vitest";

import { FakeUserVocabularyRepository } from "../test-support/fakes.js";
import { UnsaveVocabularyItemUseCase } from "./unsave-vocabulary-item.use-case.js";

const USER = "user-1";
const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("UnsaveVocabularyItemUseCase", () => {
  it("removes the student's record for the word", async () => {
    const userVocabulary = new FakeUserVocabularyRepository();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });
    const useCase = new UnsaveVocabularyItemUseCase(userVocabulary);

    await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(await userVocabulary.findByUserAndItem(USER, "pl-dom" as never)).toBeNull();
  });

  it("does nothing, without error, for a word the student never saved", async () => {
    const userVocabulary = new FakeUserVocabularyRepository();
    const useCase = new UnsaveVocabularyItemUseCase(userVocabulary);

    await expect(
      useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never }),
    ).resolves.toBeUndefined();
  });

  it("never removes another student's record", async () => {
    const userVocabulary = new FakeUserVocabularyRepository();
    userVocabulary.seed({
      userId: "someone-else",
      vocabularyItemId: "pl-dom" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });
    const useCase = new UnsaveVocabularyItemUseCase(userVocabulary);

    await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(
      await userVocabulary.findByUserAndItem("someone-else", "pl-dom" as never),
    ).not.toBeNull();
  });
});
