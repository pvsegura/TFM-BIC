import {
  GrammarTopicNotFoundError,
  isPublished,
  sortGrammarTopics,
  type GrammarTopic,
  type GrammarTopicId,
  type LanguageId,
} from "@tfm-bic/domain";

/**
 * Where grammar reference topics come from (M23). Storage only: it returns every status, and
 * deciding what a student may see belongs to the use cases below.
 */
export interface GrammarReferenceRepository {
  listTopics(languageId: LanguageId): Promise<readonly GrammarTopic[]>;
  findTopic(topicId: GrammarTopicId): Promise<GrammarTopic | null>;
}

/** A language's published grammar topics, shelf by shelf. An unknown language has none. */
export class ListGrammarTopicsUseCase {
  constructor(private readonly repository: GrammarReferenceRepository) {}

  async execute(input: { languageId: LanguageId }): Promise<GrammarTopic[]> {
    const topics = await this.repository.listTopics(input.languageId);
    return sortGrammarTopics(topics.filter(isPublished));
  }
}

/** One published topic in full; anything else a student cannot see is "not found". */
export class GetGrammarTopicUseCase {
  constructor(private readonly repository: GrammarReferenceRepository) {}

  async execute(input: { topicId: GrammarTopicId }): Promise<GrammarTopic> {
    const topic = await this.repository.findTopic(input.topicId);
    if (!topic || !isPublished(topic)) {
      throw new GrammarTopicNotFoundError(input.topicId);
    }
    return topic;
  }
}
