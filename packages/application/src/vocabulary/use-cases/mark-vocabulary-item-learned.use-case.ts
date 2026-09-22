import type { VocabularyItemId } from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { Clock } from "../../ports/clock.js";
import { findVisibleVocabularyItem } from "../find-visible-vocabulary-item.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import type { VocabularyEventPublisher } from "../ports/vocabulary-event-publisher.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";
import { toUserStateView, type VocabularyUserStateView } from "../vocabulary-view.js";

export interface MarkVocabularyItemLearnedInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  vocabularyItemId: VocabularyItemId;
}

/**
 * The student marks a word as known. The entry must be one they can see; the target status is
 * always `learned`, which `evaluateStatusChange` allows from every stored status (and treats a
 * word already learned as a no-op) — so, unlike the general status update, this never refuses.
 *
 * Publishes `VocabularyItemLearnedEvent` exactly once per word — only when it actually becomes
 * learned in this call, never when it already was — so a future listener (gamification, a review
 * scheduler) can reward a word once without knowing anything about vocabulary itself.
 */
export class MarkVocabularyItemLearnedUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly userVocabulary: UserVocabularyRepository,
    private readonly clock: Clock,
    private readonly events: VocabularyEventPublisher,
  ) {}

  async execute(input: MarkVocabularyItemLearnedInput): Promise<VocabularyUserStateView> {
    const item = await findVisibleVocabularyItem(
      this.contentRepository,
      this.vocabulary,
      input.vocabularyItemId,
    );

    const before = await this.userVocabulary.findByUserAndItem(input.userId, item.id);
    const wasAlreadyLearned = before?.status === "learned";

    const entry = await this.userVocabulary.changeStatus(
      input.userId,
      item.id,
      "learned",
      this.clock.now(),
    );

    if (!wasAlreadyLearned) {
      await this.events.publish({
        type: "vocabulary-item-learned",
        userId: input.userId,
        vocabularyItemId: item.id,
        languageId: item.languageId,
        learnedAt: entry.learnedAt ?? this.clock.now(),
      });
    }

    return toUserStateView(entry);
  }
}
