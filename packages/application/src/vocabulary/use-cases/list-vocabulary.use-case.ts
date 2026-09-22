import {
  statusOf,
  type LanguageId,
  type LevelId,
  type VocabularyCategoryId,
  type VocabularyItemId,
  type VocabularyStatus,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";
import { queryVisibleVocabulary, type VocabularyQueryEntry } from "../query-vocabulary.js";
import { toUserStateView, type VocabularyUserStateView } from "../vocabulary-view.js";

export interface ListVocabularyInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  languageId: LanguageId;
  levelId?: LevelId | undefined;
  categoryId?: VocabularyCategoryId | undefined;
  status?: VocabularyStatus | undefined;
  q?: string | undefined;
  limit: number;
  after?: VocabularyItemId | undefined;
}

export interface VocabularyListEntry {
  item: VocabularyQueryEntry["item"];
  category: { id: VocabularyCategoryId; title: string };
  userState: VocabularyUserStateView;
}

export interface VocabularyListResult {
  items: VocabularyListEntry[];
  total: number;
  nextAfter: VocabularyItemId | null;
}

/**
 * The vocabulary of one language a student can browse, filtered and searched, one page at a time,
 * each entry with the student's own state (`new` when untouched). Visibility, filtering, sorting
 * and paging are `queryVisibleVocabulary`'s job; this adds only the `status` filter, which compares
 * against the *derived* view status (`new` included) — unlike "My Vocabulary", browsing is not
 * limited to words the student has already touched.
 */
export class ListVocabularyUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly userVocabulary: UserVocabularyRepository,
  ) {}

  async execute(input: ListVocabularyInput): Promise<VocabularyListResult> {
    const result = await queryVisibleVocabulary(
      this.contentRepository,
      this.vocabulary,
      this.userVocabulary,
      input.userId,
      input,
      (_item, state) => input.status === undefined || statusOf(state) === input.status,
    );

    return {
      items: result.entries.map((entry) => ({
        item: entry.item,
        category: { id: entry.category.id, title: entry.category.title },
        userState: toUserStateView(entry.state),
      })),
      total: result.total,
      nextAfter: result.nextAfter,
    };
  }
}
