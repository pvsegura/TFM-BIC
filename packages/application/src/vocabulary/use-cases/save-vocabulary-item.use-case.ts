import type { VocabularyItemId } from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { Clock } from "../../ports/clock.js";
import { findVisibleVocabularyItem } from "../find-visible-vocabulary-item.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";
import { toUserStateView, type VocabularyUserStateView } from "../vocabulary-view.js";

export interface SaveVocabularyItemInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  vocabularyItemId: VocabularyItemId;
}

/**
 * The student puts a word on their list. The entry must be one they can see. Safe to repeat: a
 * word already on the list — whatever its status — keeps it exactly as it is (the repository's
 * `save` is the atomic, race-free "create if none exists").
 */
export class SaveVocabularyItemUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly userVocabulary: UserVocabularyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SaveVocabularyItemInput): Promise<VocabularyUserStateView> {
    const item = await findVisibleVocabularyItem(
      this.contentRepository,
      this.vocabulary,
      input.vocabularyItemId,
    );
    const entry = await this.userVocabulary.save(input.userId, item.id, this.clock.now());
    return toUserStateView(entry);
  }
}
