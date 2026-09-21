import type { LanguageId } from "../language/language-id.js";
import type { VocabularyItemId } from "./vocabulary-item-id.js";

/**
 * Something that happened to a student's vocabulary that another part of the system may want to
 * react to (a reward, a streak, a review schedule). Produced by the use case that changed the
 * state, *after* it has been stored, and handed to a `VocabularyEventPublisher`; vocabulary knows
 * nothing about who listens. There is no broker: the shape is what a later event-driven design
 * would publish, and an internal, in-process listener is enough until then.
 *
 * Events are internal. They carry the student's id because a listener needs to know whom it is
 * about, so they are never serialised to a client or written to a log as they are.
 */
export const VOCABULARY_EVENT_TYPES = ["vocabulary-item-learned"] as const;
export type VocabularyEventType = (typeof VOCABULARY_EVENT_TYPES)[number];

/**
 * A word *became* learned: the status changed to `learned` in this request. Repeating "mark as
 * learned" on a word that already is learned does not produce it again; moving a word back to
 * `learning` and learning it again produces a new one, so a listener that must reward a word
 * once has to key on `(userId, vocabularyItemId)` — which is what the points ledger already does.
 */
export interface VocabularyItemLearnedEvent {
  readonly type: "vocabulary-item-learned";
  readonly userId: string;
  readonly vocabularyItemId: VocabularyItemId;
  readonly languageId: LanguageId;
  readonly learnedAt: Date;
}

export type VocabularyEvent = VocabularyItemLearnedEvent;
