import {
  InvalidVocabularyTransitionError,
  type StoredVocabularyStatus,
  type VocabularyItemId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { Clock } from "../../ports/clock.js";
import { findVisibleVocabularyItem } from "../find-visible-vocabulary-item.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";
import { toUserStateView, type VocabularyUserStateView } from "../vocabulary-view.js";

export interface UpdateVocabularyStatusInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  vocabularyItemId: VocabularyItemId;
  status: StoredVocabularyStatus;
}

/**
 * The student sets a word's status directly (`saved`, `learning` or `learned`). The entry must be
 * one they can see. The repository decides the outcome atomically, following
 * `evaluateStatusChange`; a change it refuses is reported back as
 * `InvalidVocabularyTransitionError` — comparing the returned status to what was asked for is
 * enough to tell "refused" from "already there" or "applied", so no extra read is needed.
 */
export class UpdateVocabularyStatusUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly userVocabulary: UserVocabularyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateVocabularyStatusInput): Promise<VocabularyUserStateView> {
    const item = await findVisibleVocabularyItem(
      this.contentRepository,
      this.vocabulary,
      input.vocabularyItemId,
    );
    const entry = await this.userVocabulary.changeStatus(
      input.userId,
      item.id,
      input.status,
      this.clock.now(),
    );
    if (entry.status !== input.status) {
      throw new InvalidVocabularyTransitionError(entry.status, input.status);
    }
    return toUserStateView(entry);
  }
}
