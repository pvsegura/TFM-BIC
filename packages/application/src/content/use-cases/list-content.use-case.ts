import {
  isLevelSelectable,
  isPublished,
  LanguageNotFoundError,
  LevelNotAvailableError,
  resolveCourse,
  sortContentItems,
  type ContentItem,
  type LanguageId,
  type LevelId,
} from "@verbysia/domain";

import type { ContentRepository } from "../ports/content-repository.js";

export interface ListContentInput {
  languageId: LanguageId;
  levelId: LevelId;
  /** The learner's language; selects the course when the language offers several. */
  instructionLanguage?: string | undefined;
}

/** The discovery view of an item: enough to list it, none of the body. Fields
 * are copied one by one so nothing else can ride along. */
export type ContentSummary = Pick<
  ContentItem,
  | "id"
  | "languageId"
  | "levelId"
  | "type"
  | "title"
  | "description"
  | "order"
  | "instructionLanguage"
>;

/**
 * Published content for one available language and level, in explicit order.
 * Unpublished content, inactive languages and levels that are not `available`
 * are all refused here — the repository does not decide what a student sees.
 */
export class ListContentUseCase {
  constructor(private readonly contentRepository: ContentRepository) {}

  async execute(input: ListContentInput): Promise<ContentSummary[]> {
    const language = await this.contentRepository.findLanguage(input.languageId);
    if (!language?.isActive) {
      throw new LanguageNotFoundError(input.languageId);
    }

    const declared = await this.contentRepository.listLanguageLevels(input.languageId);
    const entry = declared.find((candidate) => candidate.levelId === input.levelId);
    if (!entry || !isLevelSelectable(entry)) {
      throw new LevelNotAvailableError(input.languageId, input.levelId);
    }

    const course = resolveCourse(language, input.instructionLanguage);
    const items = await this.contentRepository.listContent(input.languageId, input.levelId);
    return sortContentItems(
      items
        .filter(isPublished)
        .filter((item) => course === null || item.instructionLanguage === course),
    ).map((item) => ({
      id: item.id,
      languageId: item.languageId,
      levelId: item.levelId,
      type: item.type,
      title: item.title,
      description: item.description,
      order: item.order,
      instructionLanguage: item.instructionLanguage,
    }));
  }
}
