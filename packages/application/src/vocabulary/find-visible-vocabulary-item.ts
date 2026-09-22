import {
  isLevelSelectable,
  isPublished,
  VocabularyItemNotFoundError,
  type VocabularyItem,
  type VocabularyItemId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import type { VocabularyRepository } from "./ports/vocabulary-repository.js";

/**
 * The one place that decides whether a student may see a vocabulary entry. Reuses the M5
 * language/level visibility rule (active language; a level, when the entry declares one, that is
 * `available`) and adds vocabulary's own: the entry and its category must both be `published`.
 * Every reason it is not visible is the same `VocabularyItemNotFoundError`, so a caller cannot
 * tell a draft from a typo.
 */
export async function findVisibleVocabularyItem(
  contentRepository: ContentRepository,
  vocabulary: VocabularyRepository,
  vocabularyItemId: VocabularyItemId,
): Promise<VocabularyItem> {
  const item = await vocabulary.findItem(vocabularyItemId);
  if (!item || !isPublished(item)) {
    throw new VocabularyItemNotFoundError(vocabularyItemId);
  }

  const language = await contentRepository.findLanguage(item.languageId);
  if (!language?.isActive) {
    throw new VocabularyItemNotFoundError(vocabularyItemId);
  }

  if (item.levelId !== undefined) {
    const declared = await contentRepository.listLanguageLevels(item.languageId);
    const entry = declared.find((candidate) => candidate.levelId === item.levelId);
    if (!entry || !isLevelSelectable(entry)) {
      throw new VocabularyItemNotFoundError(vocabularyItemId);
    }
  }

  const category = await vocabulary.findCategory(item.languageId, item.categoryId);
  if (!category || !isPublished(category)) {
    throw new VocabularyItemNotFoundError(vocabularyItemId);
  }

  return item;
}
