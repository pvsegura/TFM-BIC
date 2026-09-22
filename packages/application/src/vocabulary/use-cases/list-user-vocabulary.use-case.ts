import type {
  LanguageId,
  LevelId,
  StoredVocabularyStatus,
  VocabularyCategoryId,
  VocabularyItemId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";
import { queryVisibleVocabulary } from "../query-vocabulary.js";
import { toUserStateView } from "../vocabulary-view.js";
import type { VocabularyListEntry, VocabularyListResult } from "./list-vocabulary.use-case.js";

export interface ListUserVocabularyInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  languageId: LanguageId;
  levelId?: LevelId | undefined;
  categoryId?: VocabularyCategoryId | undefined;
  status?: StoredVocabularyStatus | undefined;
  q?: string | undefined;
  limit: number;
  after?: VocabularyItemId | undefined;
}

/**
 * "My Vocabulary": only the words the student has a record for (saved, learning or learned —
 * never a word they have not touched), filtered, searched and paged the same way browsing is.
 * The one difference from `ListVocabularyUseCase` is the extra "must have a record" filter; every
 * other rule — visibility, ordering, the cursor — is shared, so the two views can never disagree.
 */
export class ListUserVocabularyUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly userVocabulary: UserVocabularyRepository,
  ) {}

  async execute(input: ListUserVocabularyInput): Promise<VocabularyListResult> {
    const result = await queryVisibleVocabulary(
      this.contentRepository,
      this.vocabulary,
      this.userVocabulary,
      input.userId,
      input,
      (_item, state) =>
        state !== null && (input.status === undefined || state.status === input.status),
    );

    const items: VocabularyListEntry[] = result.entries.map((entry) => ({
      item: entry.item,
      category: { id: entry.category.id, title: entry.category.title },
      userState: toUserStateView(entry.state),
    }));

    return { items, total: result.total, nextAfter: result.nextAfter };
  }
}
