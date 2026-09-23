import type {
  LanguageId,
  PhoneticRepresentation,
  PhoneticRepresentationId,
  PhoneticTopic,
  PhoneticTopicId,
} from "@tfm-bic/domain";

/**
 * Where phonetics content comes from. Owned by this layer, implemented in `packages/data` (today:
 * the same validated files under `content/` as lessons, exercises and vocabulary; later possibly a
 * database or CMS — nothing above this interface changes).
 *
 * Storage only: it returns topics and representations of every status, in no guaranteed order.
 * Which of them a student may see is a business rule of the use cases, so a new adapter cannot
 * accidentally widen visibility.
 */
export interface PhoneticContentRepository {
  listTopics(languageId: LanguageId): Promise<readonly PhoneticTopic[]>;
  findTopic(languageId: LanguageId, topicId: PhoneticTopicId): Promise<PhoneticTopic | null>;
  /** Every representation of one language, of every status, in no guaranteed order. */
  listRepresentations(languageId: LanguageId): Promise<readonly PhoneticRepresentation[]>;
  findRepresentation(
    phoneticRepresentationId: PhoneticRepresentationId,
  ): Promise<PhoneticRepresentation | null>;
}
