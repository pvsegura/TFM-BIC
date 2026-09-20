import type { ContentRepository } from "@tfm-bic/application";
import type {
  ContentCatalog,
  ContentId,
  ContentItem,
  Language,
  LanguageId,
  LanguageLevel,
  LevelId,
} from "@tfm-bic/domain";

/**
 * A `ContentRepository` over an already-validated catalog held in memory.
 * Storage only: it returns every status and inactive languages too — deciding
 * what a student may see belongs to the use cases. A database- or CMS-backed
 * adapter would replace this class and nothing above the port would change.
 */
export class CatalogContentRepository implements ContentRepository {
  private readonly languagesByCode: ReadonlyMap<LanguageId, Language>;
  private readonly contentById: ReadonlyMap<ContentId, ContentItem>;

  constructor(private readonly catalog: ContentCatalog) {
    this.languagesByCode = new Map(catalog.languages.map((language) => [language.code, language]));
    this.contentById = new Map(catalog.content.map((item) => [item.id, item]));
  }

  listLanguages(): Promise<readonly Language[]> {
    return Promise.resolve(this.catalog.languages);
  }

  findLanguage(languageId: LanguageId): Promise<Language | null> {
    return Promise.resolve(this.languagesByCode.get(languageId) ?? null);
  }

  listLanguageLevels(languageId: LanguageId): Promise<readonly LanguageLevel[]> {
    return Promise.resolve(
      this.catalog.languageLevels.filter((entry) => entry.languageId === languageId),
    );
  }

  listContent(languageId: LanguageId, levelId: LevelId): Promise<readonly ContentItem[]> {
    return Promise.resolve(
      this.catalog.content.filter(
        (item) => item.languageId === languageId && item.levelId === levelId,
      ),
    );
  }

  findContent(contentId: ContentId): Promise<ContentItem | null> {
    return Promise.resolve(this.contentById.get(contentId) ?? null);
  }
}
