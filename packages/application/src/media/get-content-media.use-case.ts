import {
  ContentMediaNotFoundError,
  GrammarTopicNotFoundError,
  LessonNotFoundError,
  VocabularyItemNotFoundError,
  createContentId,
  createGrammarTopicId,
  createVocabularyItemId,
  isValidContentId,
  isValidGrammarTopicId,
  isValidVocabularyItemId,
  type ContentMedia,
  type MediaContentRef,
} from "@verbysia/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import { GetContentUseCase } from "../content/use-cases/get-content.use-case.js";
import {
  GetGrammarTopicUseCase,
  type GrammarReferenceRepository,
} from "../grammar/grammar-reference.js";
import { findVisibleLesson } from "../lesson/find-visible-lesson.js";
import { findVisibleVocabularyItem } from "../vocabulary/find-visible-vocabulary-item.js";
import type { VocabularyRepository } from "../vocabulary/ports/vocabulary-repository.js";
import type { ContentMediaCatalog } from "./ports/media-generation-ports.js";

/** What each visibility rule throws when the item is not visible. */
const HIDDEN = [LessonNotFoundError, VocabularyItemNotFoundError, GrammarTopicNotFoundError];

export interface GetContentMediaDependencies {
  contentRepository: ContentRepository;
  vocabulary: VocabularyRepository;
  /** Absent when there is no grammar reference: then no topic is visible. */
  grammar?: GrammarReferenceRepository | undefined;
  catalog: ContentMediaCatalog;
}

/**
 * One content item's published media (M21, ADR-031) — only while the item itself is visible,
 * under exactly the rule of its own endpoint: `findVisibleLesson` for a lesson,
 * `findVisibleVocabularyItem` for a word, `GetGrammarTopicUseCase` for a grammar topic. Every
 * reason it is not visible is the same `ContentMediaNotFoundError`. Visible content with nothing
 * published yet resolves to `undefined`.
 */
export class GetContentMediaUseCase {
  private readonly getContent: GetContentUseCase;
  private readonly getGrammarTopic: GetGrammarTopicUseCase | undefined;

  constructor(private readonly deps: GetContentMediaDependencies) {
    this.getContent = new GetContentUseCase(deps.contentRepository);
    this.getGrammarTopic = deps.grammar ? new GetGrammarTopicUseCase(deps.grammar) : undefined;
  }

  async execute(ref: Pick<MediaContentRef, "type" | "id">): Promise<ContentMedia | undefined> {
    if (!(await this.isVisible(ref))) {
      throw new ContentMediaNotFoundError(ref.type, ref.id);
    }
    return this.deps.catalog.find(ref);
  }

  private async isVisible({ type, id }: Pick<MediaContentRef, "type" | "id">): Promise<boolean> {
    try {
      switch (type) {
        case "lesson":
          if (!isValidContentId(id)) return false;
          await findVisibleLesson(this.getContent, createContentId(id));
          return true;
        case "vocabulary-item":
          if (!isValidVocabularyItemId(id)) return false;
          await findVisibleVocabularyItem(
            this.deps.contentRepository,
            this.deps.vocabulary,
            createVocabularyItemId(id),
          );
          return true;
        case "grammar-topic":
          if (!this.getGrammarTopic || !isValidGrammarTopicId(id)) return false;
          await this.getGrammarTopic.execute({ topicId: createGrammarTopicId(id) });
          return true;
      }
    } catch (error) {
      if (HIDDEN.some((NotFound) => error instanceof NotFound)) return false;
      throw error;
    }
  }
}
