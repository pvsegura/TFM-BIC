import type { VocabularyEventPublisher } from "@tfm-bic/application";
import type { VocabularyEvent } from "@tfm-bic/domain";

/**
 * The M9 wiring for `VocabularyEventPublisher`: acknowledges every event and does nothing with
 * it. A future milestone (gamification rewarding a learned word, a review scheduler) replaces
 * this with a real listener without vocabulary's own code changing — see
 * docs/adr/adr-022-vocabulary.md.
 */
export class NoopVocabularyEventPublisher implements VocabularyEventPublisher {
  publish(_event: VocabularyEvent): Promise<void> {
    return Promise.resolve();
  }
}
