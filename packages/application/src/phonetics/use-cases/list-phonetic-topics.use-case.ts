import {
  isLevelSelectable,
  isPublished,
  LanguageNotFoundError,
  type LanguageId,
  type PhoneticRepresentation,
  type PhoneticTopic,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { PhoneticContentRepository } from "../ports/phonetic-content-repository.js";
import type { UserPhoneticProgressRepository } from "../ports/user-phonetic-progress-repository.js";

export interface ListPhoneticTopicsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  languageId: LanguageId;
}

export interface PhoneticTopicProgressView {
  representationCount: number;
  viewed: number;
  practiced: number;
  completed: number;
}

export interface PhoneticTopicView {
  id: PhoneticTopic["id"];
  languageId: LanguageId;
  title: string;
  description?: string | undefined;
  instructionLanguage: LanguageId;
  progress: PhoneticTopicProgressView;
}

export interface PhoneticTopicsResult {
  topics: PhoneticTopicView[];
  progress: PhoneticTopicProgressView;
}

function emptyProgress(): PhoneticTopicProgressView {
  return { representationCount: 0, viewed: 0, practiced: 0, completed: 0 };
}

/**
 * A language's phonetics topics, in order, each with how many published representations it holds
 * and how far the student has gotten with them — plus the same tally across the whole language
 * (which also includes representations that name no topic at all, unlike a vocabulary category
 * which every entry must have). One batched lookup covers every representation's progress,
 * whatever the number of topics.
 */
export class ListPhoneticTopicsUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly phonetics: PhoneticContentRepository,
    private readonly userProgress: UserPhoneticProgressRepository,
  ) {}

  async execute(input: ListPhoneticTopicsInput): Promise<PhoneticTopicsResult> {
    const language = await this.contentRepository.findLanguage(input.languageId);
    if (!language?.isActive) {
      throw new LanguageNotFoundError(input.languageId);
    }

    const declaredLevels = await this.contentRepository.listLanguageLevels(input.languageId);
    const availableLevels = new Set(
      declaredLevels.filter(isLevelSelectable).map((entry) => entry.levelId),
    );

    const topics = [...(await this.phonetics.listTopics(input.languageId))]
      .filter(isPublished)
      .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id < b.id ? -1 : 1));
    const topicIds = new Set(topics.map((topic) => topic.id));

    const visibleRepresentations = (
      await this.phonetics.listRepresentations(input.languageId)
    ).filter(
      (representation) =>
        isPublished(representation) &&
        (representation.topicId === undefined || topicIds.has(representation.topicId)) &&
        (representation.levelId === undefined || availableLevels.has(representation.levelId)),
    );

    const progressRecords = await this.userProgress.findByUserAndRepresentations(
      input.userId,
      visibleRepresentations.map((representation) => representation.id),
    );
    const statusByRepresentation = new Map(
      progressRecords.map((progress) => [progress.phoneticRepresentationId, progress.status]),
    );

    const representationsByTopic = new Map<string, PhoneticRepresentation[]>();
    for (const representation of visibleRepresentations) {
      if (representation.topicId === undefined) {
        continue;
      }
      const list = representationsByTopic.get(representation.topicId) ?? [];
      list.push(representation);
      representationsByTopic.set(representation.topicId, list);
    }

    function tally(representations: readonly PhoneticRepresentation[]): PhoneticTopicProgressView {
      const progress = emptyProgress();
      progress.representationCount = representations.length;
      for (const representation of representations) {
        const status = statusByRepresentation.get(representation.id);
        if (status !== undefined) {
          progress[status] += 1;
        }
      }
      return progress;
    }

    const topicViews = topics.map((topic) => ({
      id: topic.id,
      languageId: topic.languageId,
      title: topic.title,
      description: topic.description,
      instructionLanguage: topic.instructionLanguage,
      progress: tally(representationsByTopic.get(topic.id) ?? []),
    }));

    return { topics: topicViews, progress: tally(visibleRepresentations) };
  }
}
