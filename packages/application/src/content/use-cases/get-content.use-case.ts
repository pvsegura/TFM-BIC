import {
  ContentNotFoundError,
  isLevelSelectable,
  isPublished,
  type ContentId,
  type ContentItem,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../ports/content-repository.js";

export interface GetContentInput {
  contentId: ContentId;
}

/**
 * One published item with its blocks. Every reason it might not be visible —
 * missing, unpublished, inactive language, level not available — is the same
 * `ContentNotFoundError`, so a caller cannot probe for unpublished content.
 */
export class GetContentUseCase {
  constructor(private readonly contentRepository: ContentRepository) {}

  async execute(input: GetContentInput): Promise<ContentItem> {
    const item = await this.contentRepository.findContent(input.contentId);
    if (!item || !isPublished(item)) {
      throw new ContentNotFoundError(input.contentId);
    }

    const language = await this.contentRepository.findLanguage(item.languageId);
    if (!language?.isActive) {
      throw new ContentNotFoundError(input.contentId);
    }

    const declared = await this.contentRepository.listLanguageLevels(item.languageId);
    const entry = declared.find((candidate) => candidate.levelId === item.levelId);
    if (!entry || !isLevelSelectable(entry)) {
      throw new ContentNotFoundError(input.contentId);
    }

    return item;
  }
}
