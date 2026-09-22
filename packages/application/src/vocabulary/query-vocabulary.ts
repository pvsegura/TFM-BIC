import {
  isLevelSelectable,
  isPublished,
  LanguageNotFoundError,
  LevelNotAvailableError,
  matchesVocabularySearch,
  type LanguageId,
  type LevelId,
  type UserVocabularyEntry,
  type VocabularyCategory,
  type VocabularyCategoryId,
  type VocabularyItem,
  type VocabularyItemId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import type { UserVocabularyRepository } from "./ports/user-vocabulary-repository.js";
import type { VocabularyRepository } from "./ports/vocabulary-repository.js";

export interface VocabularyQueryFilters {
  languageId: LanguageId;
  levelId?: LevelId | undefined;
  categoryId?: VocabularyCategoryId | undefined;
  q?: string | undefined;
  limit: number;
  /** The id of the last entry of the previous page. */
  after?: VocabularyItemId | undefined;
}

export interface VocabularyQueryEntry {
  item: VocabularyItem;
  category: VocabularyCategory;
  state: UserVocabularyEntry | null;
}

export interface VocabularyQueryResult {
  entries: VocabularyQueryEntry[];
  /** How many entries match the filters in all, not just on this page. */
  total: number;
  nextAfter: VocabularyItemId | null;
}

/**
 * The engine behind both "browse the vocabulary" and "My Vocabulary": one visible, filtered,
 * deterministically ordered (category order, then entry order, ties by id) list, with the
 * student's own state batched in one lookup — never one query per entry. `extraFilter` is where a
 * caller adds what only it needs (a status, "only words I have touched"); everything else —
 * visibility, the language/level/category/search filters, sorting, the cursor — is shared so
 * "browse" and "My Vocabulary" can never disagree about what "visible" or "in order" means.
 *
 * Pagination slices an already-filtered, already-sorted in-memory list (like the rest of the
 * content catalog: a validated file tree, not a growing table) rather than paging in SQL; `after`
 * not found in the current result starts from the beginning rather than failing, since content can
 * change between two requests.
 */
export async function queryVisibleVocabulary(
  contentRepository: ContentRepository,
  vocabulary: VocabularyRepository,
  userVocabulary: UserVocabularyRepository,
  userId: string,
  filters: VocabularyQueryFilters,
  extraFilter: (item: VocabularyItem, state: UserVocabularyEntry | null) => boolean = () => true,
): Promise<VocabularyQueryResult> {
  const language = await contentRepository.findLanguage(filters.languageId);
  if (!language?.isActive) {
    throw new LanguageNotFoundError(filters.languageId);
  }

  const declaredLevels = await contentRepository.listLanguageLevels(filters.languageId);
  if (filters.levelId !== undefined) {
    const declared = declaredLevels.find((candidate) => candidate.levelId === filters.levelId);
    if (!declared || !isLevelSelectable(declared)) {
      throw new LevelNotAvailableError(filters.languageId, filters.levelId);
    }
  }
  const availableLevels = new Set(
    declaredLevels.filter(isLevelSelectable).map((entry) => entry.levelId),
  );

  const categoryById = new Map<VocabularyCategoryId, VocabularyCategory>(
    (await vocabulary.listCategories(filters.languageId))
      .filter(isPublished)
      .map((category) => [category.id, category]),
  );

  const allItems = await vocabulary.listItems(filters.languageId);
  const visible = allItems.filter((item) => {
    if (!isPublished(item) || !categoryById.has(item.categoryId)) {
      return false;
    }
    if (filters.categoryId !== undefined && item.categoryId !== filters.categoryId) {
      return false;
    }
    if (filters.levelId !== undefined) {
      if (item.levelId !== filters.levelId) {
        return false;
      }
    } else if (item.levelId !== undefined && !availableLevels.has(item.levelId)) {
      return false;
    }
    if (filters.q !== undefined && !matchesVocabularySearch(item, filters.q)) {
      return false;
    }
    return true;
  });

  const sorted = [...visible].sort((a, b) => {
    const orderA = categoryById.get(a.categoryId)!.order;
    const orderB = categoryById.get(b.categoryId)!.order;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
  });

  const states = await userVocabulary.findByUserAndItems(
    userId,
    sorted.map((item) => item.id),
  );
  const stateByItem = new Map(states.map((state) => [state.vocabularyItemId, state]));

  const matched: VocabularyQueryEntry[] = sorted
    .filter((item) => extraFilter(item, stateByItem.get(item.id) ?? null))
    .map((item) => ({
      item,
      category: categoryById.get(item.categoryId)!,
      state: stateByItem.get(item.id) ?? null,
    }));

  const startIndex =
    filters.after === undefined
      ? 0
      : (() => {
          const index = matched.findIndex((entry) => entry.item.id === filters.after);
          return index === -1 ? 0 : index + 1;
        })();

  const page = matched.slice(startIndex, startIndex + filters.limit);
  const lastOfPage = page.at(-1);
  const hasMore = startIndex + filters.limit < matched.length;

  return {
    entries: page,
    total: matched.length,
    nextAfter: hasMore && lastOfPage ? lastOfPage.item.id : null,
  };
}
