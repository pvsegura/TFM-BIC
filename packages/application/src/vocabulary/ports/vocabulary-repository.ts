import type {
  LanguageId,
  VocabularyCategory,
  VocabularyCategoryId,
  VocabularyItem,
  VocabularyItemId,
} from "@tfm-bic/domain";

/**
 * Where vocabulary content comes from. Owned by this layer, implemented in `packages/data` (today:
 * the same validated files under `content/` as lessons and exercises; later possibly a database or
 * CMS — nothing above this interface changes).
 *
 * Storage only: it returns categories and entries of every status, in no guaranteed order. Which
 * of them a student may see is a business rule of the use cases, so a new adapter cannot
 * accidentally widen visibility.
 */
export interface VocabularyRepository {
  listCategories(languageId: LanguageId): Promise<readonly VocabularyCategory[]>;
  findCategory(
    languageId: LanguageId,
    categoryId: VocabularyCategoryId,
  ): Promise<VocabularyCategory | null>;
  /** Every entry of one language, of every status, in no guaranteed order. */
  listItems(languageId: LanguageId): Promise<readonly VocabularyItem[]>;
  findItem(vocabularyItemId: VocabularyItemId): Promise<VocabularyItem | null>;
}
