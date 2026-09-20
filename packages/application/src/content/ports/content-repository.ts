import type {
  ContentId,
  ContentItem,
  Language,
  LanguageId,
  LanguageLevel,
  LevelId,
} from "@tfm-bic/domain";

/**
 * Where languages and content come from. Owned by this layer, implemented in
 * `packages/data` (today: validated JSON files under `content/`; later
 * possibly a database or CMS — nothing above this interface changes).
 *
 * It is storage only: it returns items of every status and languages that may
 * be inactive. Which of them a student may see is a business rule enforced by
 * the use cases, so a new adapter cannot accidentally widen visibility.
 */
export interface ContentRepository {
  listLanguages(): Promise<readonly Language[]>;
  findLanguage(languageId: LanguageId): Promise<Language | null>;
  /** The levels this language declares, with their availability. */
  listLanguageLevels(languageId: LanguageId): Promise<readonly LanguageLevel[]>;
  /** Content of every status for one language and level, in no guaranteed order. */
  listContent(languageId: LanguageId, levelId: LevelId): Promise<readonly ContentItem[]>;
  findContent(contentId: ContentId): Promise<ContentItem | null>;
}
