import { VocabularyItemNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../content/test-support/fakes.js";
import { findVisibleVocabularyItem } from "./find-visible-vocabulary-item.js";
import { FakeVocabularyRepository, makeVocabularyCatalog } from "./test-support/fakes.js";

const catalog = makeVocabularyCatalog();
const content = new FakeContentRepository(catalog);
const vocabulary = new FakeVocabularyRepository(catalog.vocabularyCategories, catalog.vocabulary);

async function find(id: string) {
  return findVisibleVocabularyItem(content, vocabulary, id as never);
}

describe("findVisibleVocabularyItem", () => {
  it("returns a published entry in an available level and a published category", async () => {
    const item = await find("pl-dom");

    expect(item.lemma).toBe("dom");
  });

  it("returns a published entry that has no level at all", async () => {
    const item = await find("pl-chleb");

    expect(item.levelId).toBeUndefined();
  });

  it.each([
    ["an unknown id", "pl-nope"],
    ["a draft entry", "pl-draft-word"],
    ["an entry hidden behind a draft category", "pl-hidden"],
  ])("refuses %s with the same not-found error", async (_name, id) => {
    await expect(find(id)).rejects.toThrow(VocabularyItemNotFoundError);
  });

  it("refuses an entry of an inactive language", async () => {
    content.catalog = {
      ...catalog,
      languages: catalog.languages.map((l) => (l.code === "pl" ? { ...l, isActive: false } : l)),
    };

    await expect(find("pl-dom")).rejects.toThrow(VocabularyItemNotFoundError);
    content.catalog = catalog;
  });

  it("refuses a published entry whose level is not available", async () => {
    vocabulary.items = [
      ...catalog.vocabulary,
      {
        ...catalog.vocabulary.find((i) => i.id === "pl-dom")!,
        id: "pl-planned-word" as never,
        levelId: "a2",
      },
    ];

    await expect(find("pl-planned-word")).rejects.toThrow(VocabularyItemNotFoundError);
    vocabulary.items = [...catalog.vocabulary];
  });
});
