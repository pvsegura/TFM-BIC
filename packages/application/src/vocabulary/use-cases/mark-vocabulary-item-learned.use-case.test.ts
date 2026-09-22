import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import {
  FakeUserVocabularyRepository,
  FakeVocabularyEventPublisher,
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../test-support/fakes.js";
import { MarkVocabularyItemLearnedUseCase } from "./mark-vocabulary-item-learned.use-case.js";

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
  const events = new FakeVocabularyEventPublisher();
  const useCase = new MarkVocabularyItemLearnedUseCase(
    content,
    vocabularyRepository,
    userVocabulary,
    clock,
    events,
  );
  return { useCase, userVocabulary, events };
}

describe("MarkVocabularyItemLearnedUseCase", () => {
  it("marks a word learned, stamping the learned time, for a word never saved", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(result).toEqual({ status: "learned", createdAt: T0, updatedAt: T0, learnedAt: T0 });
  });

  it("marks a saved word learned", async () => {
    const { useCase, userVocabulary } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "saved",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: null,
    });

    const result = await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(result.status).toBe("learned");
  });

  it("publishes a VocabularyItemLearned event once the word becomes learned", async () => {
    const { useCase, events } = setup();

    await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(events.events).toEqual([
      {
        type: "vocabulary-item-learned",
        userId: USER,
        vocabularyItemId: "pl-dom",
        languageId: "pl",
        learnedAt: T0,
      },
    ]);
  });

  it("does not publish a second event when the word is already learned: repeating it earns nothing new", async () => {
    const { useCase, userVocabulary, events } = setup();
    userVocabulary.seed({
      userId: USER,
      vocabularyItemId: "pl-dom" as never,
      status: "learned",
      createdAt: T0,
      updatedAt: T0,
      learnedAt: T0,
    });

    const result = await useCase.execute({ userId: USER, vocabularyItemId: "pl-dom" as never });

    expect(result.learnedAt).toEqual(T0);
    expect(events.events).toEqual([]);
  });

  it("refuses to mark an entry that is not visible, and writes nothing", async () => {
    const { useCase, userVocabulary } = setup();

    await expect(
      useCase.execute({ userId: USER, vocabularyItemId: "pl-draft-word" as never }),
    ).rejects.toThrow(/was not found/);
    expect(userVocabulary.writeCalls).toBe(0);
  });
});
