import type { VocabularyItem, VocabularyItemId } from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import { findVisibleVocabularyItem } from "../find-visible-vocabulary-item.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";
import { toUserStateView, type VocabularyUserStateView } from "../vocabulary-view.js";

export interface GetVocabularyItemInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  vocabularyItemId: VocabularyItemId;
}

export interface VocabularyItemDetail {
  item: VocabularyItem;
  category: { id: VocabularyItem["categoryId"]; title: string };
  userState: VocabularyUserStateView;
}

/**
 * One visible vocabulary entry, with the student's own state for it. Opening an entry is a read:
 * it never creates or changes a record. The category's title is looked up so the caller needs no
 * second request; visibility is `findVisibleVocabularyItem`'s rule, restated nowhere.
 */
export class GetVocabularyItemUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly userVocabulary: UserVocabularyRepository,
  ) {}

  async execute(input: GetVocabularyItemInput): Promise<VocabularyItemDetail> {
    const item = await findVisibleVocabularyItem(
      this.contentRepository,
      this.vocabulary,
      input.vocabularyItemId,
    );
    const category = await this.vocabulary.findCategory(item.languageId, item.categoryId);
    const state = await this.userVocabulary.findByUserAndItem(input.userId, item.id);

    return {
      item,
      // Visible under findVisibleVocabularyItem only when its category is published, so it exists.
      category: { id: item.categoryId, title: category?.title ?? "" },
      userState: toUserStateView(state),
    };
  }
}
