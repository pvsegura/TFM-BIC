import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import type { LanguageId } from "../language/language-id.js";
import { InvalidVocabularyItemIdError } from "./errors/invalid-vocabulary-item-id.error.js";

/**
 * A stable, human-readable identifier for one vocabulary entry, for example `pl-dom`. It is
 * identity, not description: the lemma, the translation and the position may all change and the
 * id never does (retire an entry by `status: archived`, never by renaming), so a student's saved
 * words keep pointing at the same entry. It is deliberately *not* derived from the lemma — a
 * lemma may carry diacritics or be a two-word phrase, and two different words can share a
 * spelling — so an author picks a slug and the slug is what is stored.
 *
 * It follows the content-id rules on purpose — the same strict pattern and length,
 * language-prefixed — so an id is safe in a URL, a file name and a database column, and can never
 * carry path separators, markup or SQL.
 */
export type VocabularyItemId = Brand<string, "VocabularyItemId">;

export function isValidVocabularyItemId(value: string): boolean {
  return isValidContentId(value);
}

export function createVocabularyItemId(value: string): VocabularyItemId {
  if (!isValidVocabularyItemId(value)) {
    throw new InvalidVocabularyItemIdError(value);
  }
  return value as VocabularyItemId;
}

export function vocabularyItemIdBelongsToLanguage(
  id: VocabularyItemId,
  languageId: LanguageId,
): boolean {
  return id.startsWith(`${languageId}-`);
}
