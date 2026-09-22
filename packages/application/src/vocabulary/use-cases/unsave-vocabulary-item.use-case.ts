import type { VocabularyItemId } from "@tfm-bic/domain";

import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import { toUserStateView, type VocabularyUserStateView } from "../vocabulary-view.js";

export interface UnsaveVocabularyItemInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  vocabularyItemId: VocabularyItemId;
}

/**
 * The student removes a word from their list, whatever its status — the only way back to `new`.
 * Idempotent: removing a word that was never saved, or removing it twice, does nothing, and
 * always answers with the (derived) `new` state, so the caller can treat every vocabulary action
 * the same way. No visibility check: a word that later became unpublished can still be removed by
 * a student who has it.
 */
export class UnsaveVocabularyItemUseCase {
  constructor(private readonly userVocabulary: UserVocabularyRepository) {}

  async execute(input: UnsaveVocabularyItemInput): Promise<VocabularyUserStateView> {
    await this.userVocabulary.remove(input.userId, input.vocabularyItemId);
    return toUserStateView(null);
  }
}
