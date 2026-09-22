import {
  isLevelSelectable,
  isPublished,
  LanguageNotFoundError,
  type LanguageId,
  type VocabularyCategory,
  type VocabularyItem,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";

export interface ListVocabularyCategoriesInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  languageId: LanguageId;
}

export interface VocabularyProgressView {
  itemCount: number;
  saved: number;
  learning: number;
  learned: number;
}

export interface VocabularyCategoryView {
  id: VocabularyCategory["id"];
  languageId: LanguageId;
  title: string;
  description?: string | undefined;
  instructionLanguage: LanguageId;
  progress: VocabularyProgressView;
}

export interface VocabularyCategoriesResult {
  categories: VocabularyCategoryView[];
  progress: VocabularyProgressView;
}

function emptyProgress(): VocabularyProgressView {
  return { itemCount: 0, saved: 0, learning: 0, learned: 0 };
}

/**
 * A language's vocabulary topics, in order, each with how many published entries it holds and how
 * far the student has gotten with them — plus the same tally across the whole language. One batched
 * lookup covers every entry's state, whatever the number of categories.
 */
export class ListVocabularyCategoriesUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly userVocabulary: UserVocabularyRepository,
  ) {}

  async execute(input: ListVocabularyCategoriesInput): Promise<VocabularyCategoriesResult> {
    const language = await this.contentRepository.findLanguage(input.languageId);
    if (!language?.isActive) {
      throw new LanguageNotFoundError(input.languageId);
    }

    const declaredLevels = await this.contentRepository.listLanguageLevels(input.languageId);
    const availableLevels = new Set(
      declaredLevels.filter(isLevelSelectable).map((entry) => entry.levelId),
    );

    const categories = [...(await this.vocabulary.listCategories(input.languageId))]
      .filter(isPublished)
      .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id < b.id ? -1 : 1));
    const categoryIds = new Set(categories.map((category) => category.id));

    const visibleItems = (await this.vocabulary.listItems(input.languageId)).filter(
      (item) =>
        isPublished(item) &&
        categoryIds.has(item.categoryId) &&
        (item.levelId === undefined || availableLevels.has(item.levelId)),
    );

    const states = await this.userVocabulary.findByUserAndItems(
      input.userId,
      visibleItems.map((item) => item.id),
    );
    const statusByItem = new Map(states.map((state) => [state.vocabularyItemId, state.status]));

    const itemsByCategory = new Map<string, VocabularyItem[]>();
    for (const item of visibleItems) {
      const list = itemsByCategory.get(item.categoryId) ?? [];
      list.push(item);
      itemsByCategory.set(item.categoryId, list);
    }

    function tally(items: readonly VocabularyItem[]): VocabularyProgressView {
      const progress = emptyProgress();
      progress.itemCount = items.length;
      for (const item of items) {
        const status = statusByItem.get(item.id);
        if (status !== undefined) {
          progress[status] += 1;
        }
      }
      return progress;
    }

    const categoryViews = categories.map((category) => ({
      id: category.id,
      languageId: category.languageId,
      title: category.title,
      description: category.description,
      instructionLanguage: category.instructionLanguage,
      progress: tally(itemsByCategory.get(category.id) ?? []),
    }));

    return { categories: categoryViews, progress: tally(visibleItems) };
  }
}
