import type { VocabularyRepository } from "@tfm-bic/application";
import type {
  ContentCatalog,
  LanguageId,
  VocabularyCategory,
  VocabularyCategoryId,
  VocabularyItem,
  VocabularyItemId,
} from "@tfm-bic/domain";

/**
 * A `VocabularyRepository` over an already-validated catalog held in memory — the same catalog
 * the content and exercise repositories serve, so they can never disagree about which version of
 * the content is live. Storage only: it returns every status, and deciding what a student may see
 * belongs to the use cases. Read-only by construction: there is no method to change a category or
 * an entry. A database- or CMS-backed adapter would replace this class and nothing above the port
 * would change.
 */
export class CatalogVocabularyRepository implements VocabularyRepository {
  private readonly categoriesByLanguage: ReadonlyMap<LanguageId, readonly VocabularyCategory[]>;
  private readonly categoryByKey: ReadonlyMap<string, VocabularyCategory>;
  private readonly itemsByLanguage: ReadonlyMap<LanguageId, readonly VocabularyItem[]>;
  private readonly itemById: ReadonlyMap<VocabularyItemId, VocabularyItem>;

  constructor(catalog: ContentCatalog) {
    const categoriesByLanguage = new Map<LanguageId, VocabularyCategory[]>();
    const categoryByKey = new Map<string, VocabularyCategory>();
    for (const category of catalog.vocabularyCategories) {
      const siblings = categoriesByLanguage.get(category.languageId) ?? [];
      siblings.push(category);
      categoriesByLanguage.set(category.languageId, siblings);
      categoryByKey.set(`${category.languageId}/${category.id}`, category);
    }
    this.categoriesByLanguage = categoriesByLanguage;
    this.categoryByKey = categoryByKey;

    const itemsByLanguage = new Map<LanguageId, VocabularyItem[]>();
    for (const item of catalog.vocabulary) {
      const siblings = itemsByLanguage.get(item.languageId) ?? [];
      siblings.push(item);
      itemsByLanguage.set(item.languageId, siblings);
    }
    this.itemsByLanguage = itemsByLanguage;
    this.itemById = new Map(catalog.vocabulary.map((item) => [item.id, item]));
  }

  listCategories(languageId: LanguageId): Promise<readonly VocabularyCategory[]> {
    return Promise.resolve(this.categoriesByLanguage.get(languageId) ?? []);
  }

  findCategory(
    languageId: LanguageId,
    categoryId: VocabularyCategoryId,
  ): Promise<VocabularyCategory | null> {
    return Promise.resolve(this.categoryByKey.get(`${languageId}/${categoryId}`) ?? null);
  }

  listItems(languageId: LanguageId): Promise<readonly VocabularyItem[]> {
    return Promise.resolve(this.itemsByLanguage.get(languageId) ?? []);
  }

  findItem(vocabularyItemId: VocabularyItemId): Promise<VocabularyItem | null> {
    return Promise.resolve(this.itemById.get(vocabularyItemId) ?? null);
  }
}
