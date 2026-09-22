import type {
  StoredVocabularyStatus,
  UserVocabularyEntry,
  VocabularyItemId,
} from "@tfm-bic/domain";

/**
 * Where a student's relationship to vocabulary is kept. Owned by this layer, implemented in
 * `packages/data` (Drizzle/Postgres). It stores per-student state only: the entry itself — lemma,
 * meaning, grammar — lives in content and is reached through `VocabularyRepository`, so the two
 * never mix.
 *
 * `save` and `changeStatus` are each one atomic operation, so two racing requests cannot create a
 * duplicate record and a status change cannot land the student in a state `evaluateStatusChange`
 * would refuse. Every timestamp is the caller's (the `Clock` port), never the database's `now()`.
 */
export interface UserVocabularyRepository {
  findByUserAndItem(
    userId: string,
    vocabularyItemId: VocabularyItemId,
  ): Promise<UserVocabularyEntry | null>;
  /** The student's state for several entries in one round trip (a list must not cost a query per entry). */
  findByUserAndItems(
    userId: string,
    vocabularyItemIds: readonly VocabularyItemId[],
  ): Promise<readonly UserVocabularyEntry[]>;
  /** Every record the student has, of any status — the basis of "My Vocabulary". */
  listByUser(userId: string): Promise<readonly UserVocabularyEntry[]>;
  /** Creates a `saved` record if there is none; otherwise returns the existing one, whatever its status, unchanged. */
  save(userId: string, vocabularyItemId: VocabularyItemId, now: Date): Promise<UserVocabularyEntry>;
  /**
   * Moves the student's record for the entry toward `target`, following `evaluateStatusChange`
   * exactly (a record with none may take any status). A change the rule refuses leaves the record
   * as it is: the caller tells refusal from success by comparing the returned status to `target`.
   */
  changeStatus(
    userId: string,
    vocabularyItemId: VocabularyItemId,
    target: StoredVocabularyStatus,
    now: Date,
  ): Promise<UserVocabularyEntry>;
  /** Removes the student's record for the entry, if any. Idempotent: removing an untouched word does nothing. */
  remove(userId: string, vocabularyItemId: VocabularyItemId): Promise<void>;
}
