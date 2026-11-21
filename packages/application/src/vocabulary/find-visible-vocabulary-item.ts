import {
  isPublished,
  VocabularyItemNotFoundError,
  type VocabularyItem,
  type VocabularyItemId,
} from "@verbysia/domain";

import { isVisibleInCatalog } from "../content/is-visible-in-catalog.js";
import type { ContentRepository } from "../content/ports/content-repository.js";
import type { VocabularyRepository } from "./ports/vocabulary-repository.js";

/**
 * The one place that decides whether a student may see a vocabulary entry. Reuses the M5
 * language/level visibility rule (`isVisibleInCatalog`) and adds vocabulary's own: the entry and
 * its category must both be `published`. Every reason it is not visible is the same
 * `VocabularyItemNotFoundError`, so a caller cannot tell a draft from a typo.
 */
export async function findVisibleVocabularyItem(
  contentRepository: ContentRepository,
  vocabulary: VocabularyRepository,
  vocabularyItemId: VocabularyItemId,
): Promise<VocabularyItem> {
  const item = await vocabulary.findItem(vocabularyItemId);
  if (!item || !isPublished(item) || !(await isVisibleInCatalog(contentRepository, item))) {
    throw new VocabularyItemNotFoundError(vocabularyItemId);
  }

  const category = await vocabulary.findCategory(item.languageId, item.categoryId);
  if (!category || !isPublished(category)) {
    throw new VocabularyItemNotFoundError(vocabularyItemId);
  }

  return item;
}
