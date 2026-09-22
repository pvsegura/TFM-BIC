import { statusOf, type UserVocabularyEntry, type VocabularyStatus } from "@tfm-bic/domain";

/** A student's own state for one entry, as the rest of the system sees it: always present, with
 * `new` (and no times) standing in for "no record yet". */
export interface VocabularyUserStateView {
  status: VocabularyStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  learnedAt: Date | null;
}

export function toUserStateView(entry: UserVocabularyEntry | null): VocabularyUserStateView {
  return {
    status: statusOf(entry),
    createdAt: entry?.createdAt ?? null,
    updatedAt: entry?.updatedAt ?? null,
    learnedAt: entry?.learnedAt ?? null,
  };
}
