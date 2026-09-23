import type { PhoneticContentRepository } from "@tfm-bic/application";
import type {
  ContentCatalog,
  LanguageId,
  PhoneticRepresentation,
  PhoneticRepresentationId,
  PhoneticTopic,
  PhoneticTopicId,
} from "@tfm-bic/domain";

/**
 * A `PhoneticContentRepository` over an already-validated catalog held in memory — the same
 * catalog the content, exercise and vocabulary repositories serve, so they can never disagree
 * about which version of the content is live. Storage only: it returns every status, and deciding
 * what a student may see belongs to the use cases. Read-only by construction: there is no method
 * to change a topic or a representation. A database- or CMS-backed adapter would replace this
 * class and nothing above the port would change.
 */
export class CatalogPhoneticRepository implements PhoneticContentRepository {
  private readonly topicsByLanguage: ReadonlyMap<LanguageId, readonly PhoneticTopic[]>;
  private readonly topicByKey: ReadonlyMap<string, PhoneticTopic>;
  private readonly representationsByLanguage: ReadonlyMap<
    LanguageId,
    readonly PhoneticRepresentation[]
  >;
  private readonly representationById: ReadonlyMap<
    PhoneticRepresentationId,
    PhoneticRepresentation
  >;

  constructor(catalog: ContentCatalog) {
    const topicsByLanguage = new Map<LanguageId, PhoneticTopic[]>();
    const topicByKey = new Map<string, PhoneticTopic>();
    for (const topic of catalog.phoneticTopics) {
      const siblings = topicsByLanguage.get(topic.languageId) ?? [];
      siblings.push(topic);
      topicsByLanguage.set(topic.languageId, siblings);
      topicByKey.set(`${topic.languageId}/${topic.id}`, topic);
    }
    this.topicsByLanguage = topicsByLanguage;
    this.topicByKey = topicByKey;

    const representationsByLanguage = new Map<LanguageId, PhoneticRepresentation[]>();
    for (const representation of catalog.phonetics) {
      const siblings = representationsByLanguage.get(representation.languageId) ?? [];
      siblings.push(representation);
      representationsByLanguage.set(representation.languageId, siblings);
    }
    this.representationsByLanguage = representationsByLanguage;
    this.representationById = new Map(catalog.phonetics.map((item) => [item.id, item]));
  }

  listTopics(languageId: LanguageId): Promise<readonly PhoneticTopic[]> {
    return Promise.resolve(this.topicsByLanguage.get(languageId) ?? []);
  }

  findTopic(languageId: LanguageId, topicId: PhoneticTopicId): Promise<PhoneticTopic | null> {
    return Promise.resolve(this.topicByKey.get(`${languageId}/${topicId}`) ?? null);
  }

  listRepresentations(languageId: LanguageId): Promise<readonly PhoneticRepresentation[]> {
    return Promise.resolve(this.representationsByLanguage.get(languageId) ?? []);
  }

  findRepresentation(
    phoneticRepresentationId: PhoneticRepresentationId,
  ): Promise<PhoneticRepresentation | null> {
    return Promise.resolve(this.representationById.get(phoneticRepresentationId) ?? null);
  }
}
