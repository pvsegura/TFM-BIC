import { InvalidVocabularyTransitionError, VocabularyItemNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import {
  FakeUserVocabularyRepository,
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../test-support/fakes.js";
import { UpdateVocabularyStatusUseCase } from "./update-vocabulary-status.use-case.js";

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
  const useCase = new UpdateVocabularyStatusUseCase(
    content,
    vocabularyRepository,
    userVocabulary,
    clock,
  );
  return { useCase, userVocabulary };
}

describe("UpdateVocabularyStatusUseCase", () => {
  it("creates a record straight at the requested status for an untouched word", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
    });

    expect(result).toEqual({ status: "learned", createdAt: T0, updatedAt: T0, learnedAt: T0 });
  });

  it("moves a saved word forward to learning", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });

    const result = await useCase.execute({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learning",
    });

    expect(result.status).toBe("learning");
  });

  it("moves a learned word back to learning, the one allowed step back", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const result = await useCase.execute({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learning",
    });

    expect(result).toEqual({ status: "learning", createdAt: T0, updatedAt: T0, learnedAt: null });
  });

  it("refuses any other step back, leaving the record as it is", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    await expect(
      useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never, status: "saved" }),
    ).rejects.toThrow(InvalidVocabularyTransitionError);

    const entry = await userVocabulary.findByUserAndItem(USER, "pl-dom" as never);
    expect(entry?.status).toBe("learned");
  });

  it("refuses to change the status of an entry that is not visible", async () => {
    const { useCase, userVocabulary } = setup();

    await expect(
      useCase.execute({
        userId: USER,
        vocabularyItemId: "pl-draft-word" as never,
        status: "learned",
      }),
    ).rejects.toThrow(VocabularyItemNotFoundError);
    expect(userVocabulary.writeCalls).toBe(0);
  });
});
