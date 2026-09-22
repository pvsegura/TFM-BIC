import {
  GetVocabularyItemUseCase,
  ListUserVocabularyUseCase,
  ListVocabularyCategoriesUseCase,
  ListVocabularyUseCase,
  MarkVocabularyItemLearnedUseCase,
  SaveVocabularyItemUseCase,
  UnsaveVocabularyItemUseCase,
  UpdateVocabularyStatusUseCase,
} from "@tfm-bic/application";

import type { ContentDependencies } from "./content-dependencies.js";
import type { VocabularyDependencies } from "./vocabulary-dependencies.js";

export interface VocabularyUseCases {
  listVocabulary: ListVocabularyUseCase;
  getVocabularyItem: GetVocabularyItemUseCase;
  listVocabularyCategories: ListVocabularyCategoriesUseCase;
  listUserVocabulary: ListUserVocabularyUseCase;
  saveVocabularyItem: SaveVocabularyItemUseCase;
  unsaveVocabularyItem: UnsaveVocabularyItemUseCase;
  markVocabularyItemLearned: MarkVocabularyItemLearnedUseCase;
  updateVocabularyStatus: UpdateVocabularyStatusUseCase;
}

/**
 * Composition-root wiring only. Every use case is built on the same two things: the content
 * dependencies' `contentRepository` (for the M5 language/level visibility rule) and
 * `vocabularyRepository` (categories and entries), plus the student's own state store, the clock
 * and the event publisher.
 */
export function createVocabularyUseCases(
  content: ContentDependencies,
  deps: VocabularyDependencies,
): VocabularyUseCases {
  const { contentRepository, vocabularyRepository } = content;
  const { userVocabularyRepository, clock, events } = deps;

  return {
    listVocabulary: new ListVocabularyUseCase(
      contentRepository,
      vocabularyRepository,
      userVocabularyRepository,
    ),
    getVocabularyItem: new GetVocabularyItemUseCase(
      contentRepository,
      vocabularyRepository,
      userVocabularyRepository,
    ),
    listVocabularyCategories: new ListVocabularyCategoriesUseCase(
      contentRepository,
      vocabularyRepository,
      userVocabularyRepository,
    ),
    listUserVocabulary: new ListUserVocabularyUseCase(
      contentRepository,
      vocabularyRepository,
      userVocabularyRepository,
    ),
    saveVocabularyItem: new SaveVocabularyItemUseCase(
      contentRepository,
      vocabularyRepository,
      userVocabularyRepository,
      clock,
    ),
    unsaveVocabularyItem: new UnsaveVocabularyItemUseCase(userVocabularyRepository),
    markVocabularyItemLearned: new MarkVocabularyItemLearnedUseCase(
      contentRepository,
      vocabularyRepository,
      userVocabularyRepository,
      clock,
      events,
    ),
    updateVocabularyStatus: new UpdateVocabularyStatusUseCase(
      contentRepository,
      vocabularyRepository,
      userVocabularyRepository,
      clock,
    ),
  };
}
