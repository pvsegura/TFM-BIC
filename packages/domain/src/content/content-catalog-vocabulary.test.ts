import { describe, expect, it } from "vitest";

import { createLanguageId } from "../language/language-id.js";
import { createLevelId } from "../language/level-id.js";
import type { Language } from "../language/language.js";
import type { LanguageLevel } from "../language/language-level.js";
import {
  makeVocabularyCategory,
  makeVocabularyItem,
} from "../vocabulary/test-support/vocabulary-fixtures.js";
import { createVocabularyCategoryId } from "../vocabulary/vocabulary-category-id.js";
import type { VocabularyCategory } from "../vocabulary/vocabulary-category.js";
import { createVocabularyItemId } from "../vocabulary/vocabulary-item-id.js";
import type { VocabularyItem } from "../vocabulary/vocabulary-item.js";
import { validateContentCatalog, type ContentCatalog } from "./content-catalog.js";
import { createContentId } from "./content-id.js";
import type { ContentItem } from "./content-item.js";

const PL = createLanguageId("pl");
const XX = createLanguageId("xx");
const A1 = createLevelId("a1");
const A2 = createLevelId("a2");

const language = (code: typeof PL): Language => ({
  code,
  name: code,
  nativeName: code,
  locale: code,
  direction: "ltr",
  isActive: true,
});

const levels: LanguageLevel[] = [
  { languageId: PL, levelId: A1, status: "available" },
  { languageId: PL, levelId: A2, status: "planned" },
  { languageId: XX, levelId: A1, status: "available" },
];

/** One published lesson per language, so every `available` level has published content. */
const content: ContentItem[] = [PL, XX].map((languageId) => ({
  id: createContentId(`${languageId}-lesson`),
  languageId,
  levelId: A1,
  type: "lesson",
  status: "published",
  order: 10,
  instructionLanguage: createLanguageId("en"),
  title: "A lesson",
  description: "A lesson.",
  blocks: [{ type: "explanation", text: "Text." }],
}));

function catalog(
  vocabularyCategories: VocabularyCategory[],
  vocabulary: VocabularyItem[],
): ContentCatalog {
  return {
    languages: [language(PL), language(XX)],
    languageLevels: levels,
    content,
    exercises: [],
    vocabularyCategories,
    vocabulary,
  };
}

const messages = (c: ContentCatalog) => validateContentCatalog(c).map((issue) => issue.message);

const category = makeVocabularyCategory;
const item = makeVocabularyItem;

describe("validateContentCatalog — vocabulary", () => {
  it("accepts a catalog whose entries all belong to a published category of their own language", () => {
    const result = catalog(
      [category(), category({ id: createVocabularyCategoryId("food"), order: 20 })],
      [
        item(),
        item({ id: createVocabularyItemId("pl-kot"), lemma: "kot", order: 20 }),
        item({
          id: createVocabularyItemId("pl-chleb"),
          categoryId: createVocabularyCategoryId("food"),
          lemma: "chleb",
        }),
      ],
    );

    expect(validateContentCatalog(result)).toEqual([]);
  });

  it("accepts a catalog with no vocabulary at all", () => {
    expect(validateContentCatalog(catalog([], []))).toEqual([]);
  });

  it("accepts an entry with no level: the level is optional metadata", () => {
    const { levelId: _omitted, ...withoutLevel } = item();

    expect(validateContentCatalog(catalog([category()], [withoutLevel]))).toEqual([]);
  });

  it("lets two languages use the same category id, each with its own entries", () => {
    const result = catalog(
      [category(), category({ languageId: XX })],
      [item(), item({ id: createVocabularyItemId("xx-dom"), languageId: XX })],
    );

    expect(validateContentCatalog(result)).toEqual([]);
  });

  it("rejects a category id used twice by one language", () => {
    const result = catalog([category(), category({ order: 20 })], [item()]);

    expect(messages(result)).toContain(
      'Duplicate vocabulary category "everyday" in language "pl".',
    );
  });

  it("rejects a category of an unknown language", () => {
    const result = catalog([category({ languageId: createLanguageId("zz") })], []);

    expect(messages(result)).toContain(
      'Vocabulary category "everyday" references unknown language "zz".',
    );
  });

  it("rejects two categories of one language sharing an order", () => {
    const result = catalog(
      [category(), category({ id: createVocabularyCategoryId("food") })],
      [
        item(),
        item({
          id: createVocabularyItemId("pl-chleb"),
          categoryId: createVocabularyCategoryId("food"),
        }),
      ],
    );

    expect(messages(result)).toContain(
      'Vocabulary category "food" reuses order 10 in language "pl".',
    );
  });

  it("rejects duplicate entry ids across the whole catalog", () => {
    const result = catalog([category()], [item(), item({ order: 20 })]);

    expect(messages(result)).toContain('Duplicate vocabulary item id "pl-dom".');
  });

  it("rejects an entry of an unknown language", () => {
    const result = catalog(
      [category()],
      [item({ id: createVocabularyItemId("zz-dom"), languageId: createLanguageId("zz") })],
    );

    expect(messages(result)).toContain(
      'Vocabulary item "zz-dom" references unknown language "zz".',
    );
  });

  it("rejects an entry id that does not start with its language id", () => {
    const result = catalog([category()], [item({ id: createVocabularyItemId("xx-dom") })]);

    expect(messages(result)).toContain(
      'Vocabulary item id "xx-dom" must start with its language id "pl-".',
    );
  });

  it("rejects an entry whose category does not exist", () => {
    const result = catalog(
      [category()],
      [item({ categoryId: createVocabularyCategoryId("food") })],
    );

    expect(messages(result)).toContain(
      'Vocabulary item "pl-dom" references unknown category "food" in language "pl".',
    );
  });

  it("rejects an entry whose category exists only in another language", () => {
    const result = catalog([category({ languageId: XX })], [item()]);

    expect(messages(result)).toContain(
      'Vocabulary item "pl-dom" references unknown category "everyday" in language "pl".',
    );
  });

  it("rejects two entries of one category sharing an order", () => {
    const result = catalog(
      [category()],
      [item(), item({ id: createVocabularyItemId("pl-kot"), lemma: "kot" })],
    );

    expect(messages(result)).toContain(
      'Vocabulary item "pl-kot" reuses order 10 in category "everyday" of "pl".',
    );
  });

  it("rejects an entry level its language does not declare", () => {
    const result = catalog([category()], [item({ levelId: createLevelId("c2") })]);

    expect(messages(result)).toContain(
      'Vocabulary item "pl-dom" is in level "c2", which language "pl" does not declare.',
    );
  });

  it("rejects a published entry in a level that is not available", () => {
    const result = catalog([category()], [item({ levelId: A2 })]);

    expect(messages(result)).toContain(
      'Published vocabulary item "pl-dom" is in pl/a2, which is not available.',
    );
  });

  it("accepts a draft entry in a level that is not available: it is being prepared", () => {
    const result = catalog(
      [
        category(),
        category({ id: createVocabularyCategoryId("later"), order: 20, status: "draft" }),
      ],
      [
        item(),
        item({
          id: createVocabularyItemId("pl-later"),
          categoryId: createVocabularyCategoryId("later"),
          levelId: A2,
          status: "draft",
        }),
      ],
    );

    expect(validateContentCatalog(result)).toEqual([]);
  });

  it("rejects a published entry in a category that is not published, so nobody is offered a hidden word", () => {
    const result = catalog(
      [
        category(),
        category({ id: createVocabularyCategoryId("food"), order: 20, status: "draft" }),
      ],
      [
        item(),
        item({
          id: createVocabularyItemId("pl-chleb"),
          categoryId: createVocabularyCategoryId("food"),
        }),
      ],
    );

    expect(messages(result)).toContain(
      'Published vocabulary item "pl-chleb" belongs to category "food", which is not published.',
    );
  });

  it("rejects a published category with no published entry, so the interface never lists an empty topic", () => {
    const result = catalog([category()], [item({ status: "draft" })]);

    expect(messages(result)).toContain(
      'Vocabulary category "everyday" of "pl" is published but has no published entries.',
    );
  });

  it("accepts a draft category with no entries", () => {
    expect(validateContentCatalog(catalog([category({ status: "draft" })], []))).toEqual([]);
  });

  it("reports every problem in one pass", () => {
    const result = catalog(
      [category(), category({ order: 20 })],
      [
        item({ id: createVocabularyItemId("xx-dom") }),
        item({ categoryId: createVocabularyCategoryId("nope") }),
      ],
    );

    expect(messages(result).length).toBeGreaterThanOrEqual(3);
  });
});
