import { createLanguageId } from "../../language/language-id.js";
import { createLevelId } from "../../language/level-id.js";
import { createVocabularyCategoryId } from "../vocabulary-category-id.js";
import type { VocabularyCategory } from "../vocabulary-category.js";
import { createVocabularyItemId } from "../vocabulary-item-id.js";
import type { VocabularyItem } from "../vocabulary-item.js";

/**
 * Builders for well-formed vocabulary, shared by every layer's tests (through
 * `@tfm-bic/domain/testing`). Test-only: never import this from production code.
 */
export function makeVocabularyCategory(
  overrides: Partial<VocabularyCategory> = {},
): VocabularyCategory {
  return {
    id: createVocabularyCategoryId("everyday"),
    languageId: createLanguageId("pl"),
    status: "published",
    order: 10,
    instructionLanguage: createLanguageId("en"),
    title: "Everyday words",
    description: "Words for daily life.",
    ...overrides,
  };
}

export function makeVocabularyItem(overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id: createVocabularyItemId("pl-dom"),
    languageId: createLanguageId("pl"),
    categoryId: createVocabularyCategoryId("everyday"),
    status: "published",
    order: 10,
    lemma: "dom",
    translation: "house; home",
    instructionLanguage: createLanguageId("en"),
    levelId: createLevelId("a1"),
    partOfSpeech: "noun",
    gender: "masculine",
    plural: "domy",
    example: { text: "Mój dom jest mały.", translation: "My house is small." },
    ...overrides,
  };
}
