import type { VocabularyEvent } from "@tfm-bic/domain";

/**
 * Where a vocabulary use case hands off something that happened, without knowing who — if anyone
 * — reacts to it. This is the seam a future milestone (gamification rewarding a learned word,
 * a review scheduler) plugs into: `VocabularyService → GamificationDatabaseDirectly` never
 * happens, because vocabulary only ever calls this port. M9 wires a publisher that does nothing;
 * publishing must never fail the request that produced the event.
 */
export interface VocabularyEventPublisher {
  publish(event: VocabularyEvent): Promise<void>;
}
