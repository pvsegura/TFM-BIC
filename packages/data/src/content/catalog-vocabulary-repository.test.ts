import {
  createLanguageId,
  createVocabularyCategoryId,
  createVocabularyItemId,
  type ContentCatalog,
  type VocabularyCategory,
  type VocabularyItem,
} from "@tfm-bic/domain";
import { makeVocabularyCategory, makeVocabularyItem } from "@tfm-bic/domain/testing";
import { describe, expect, it } from "vitest";

import { CatalogVocabularyRepository } from "./catalog-vocabulary-repository.js";

const PL = createLanguageId("pl");
const XX = createLanguageId("xx");

const categories: VocabularyCategory[] = [
  makeVocabularyCategory({ id: createVocabularyCategoryId("greetings"), languageId: PL }),
  makeVocabularyCategory({ id: createVocabularyCategoryId("greetings"), languageId: XX }),
];

const items: VocabularyItem[] = [
  makeVocabularyItem({ id: createVocabularyItemId("pl-dom"), languageId: PL }),
  makeVocabularyItem({
    id: createVocabularyItemId("pl-draft"),
    languageId: PL,
    status: "draft",
  }),
  makeVocabularyItem({ id: createVocabularyItemId("xx-word"), languageId: XX }),
];

const catalog: ContentCatalog = {
  languages: [],
  languageLevels: [],
  content: [],
  exercises: [],
  vocabularyCategories: categories,
  vocabulary: items,
  phoneticTopics: [],
  phonetics: [],
};
const repository = new CatalogVocabularyRepository(catalog);

describe("CatalogVocabularyRepository", () => {
  it("lists every category of one language (visibility is the use cases' job)", async () => {
    expect((await repository.listCategories(PL)).map((c) => c.languageId)).toEqual([PL]);
  });

  it("finds a category by language and id, or null", async () => {
    expect(
      (await repository.findCategory(PL, createVocabularyCategoryId("greetings")))?.languageId,
    ).toBe(PL);
    expect(await repository.findCategory(PL, createVocabularyCategoryId("nope"))).toBeNull();
    expect(await repository.findCategory(XX, createVocabularyCategoryId("nope"))).toBeNull();
  });

  it("does not confuse two languages' categories sharing an id", async () => {
    const pl = await repository.findCategory(PL, createVocabularyCategoryId("greetings"));
    const xx = await repository.findCategory(XX, createVocabularyCategoryId("greetings"));

    expect(pl?.languageId).toBe(PL);
    expect(xx?.languageId).toBe(XX);
  });

  it("lists every entry of one language, of every status", async () => {
    expect((await repository.listItems(PL)).map((i) => i.id).sort()).toEqual([
      "pl-dom",
      "pl-draft",
    ]);
  });

  it("lists nothing for a language with no vocabulary", async () => {
    expect(await repository.listItems(createLanguageId("zz"))).toEqual([]);
  });

  it("finds an entry by its id, or null", async () => {
    expect((await repository.findItem(createVocabularyItemId("pl-draft")))?.status).toBe("draft");
    expect(await repository.findItem(createVocabularyItemId("pl-nope"))).toBeNull();
  });

  it("does not resolve an inherited property name to a category or an entry", async () => {
    expect(await repository.findCategory(PL, "__proto__" as never)).toBeNull();
    expect(await repository.findItem("constructor" as never)).toBeNull();
  });

  it("offers no way to create or change a category or an entry", () => {
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(repository) as object).sort()).toEqual([
      "constructor",
      "findCategory",
      "findItem",
      "listCategories",
      "listItems",
    ]);
  });
});
