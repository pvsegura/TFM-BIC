import type { PhoneticRepresentationId, UserPhoneticProgress } from "@tfm-bic/domain";

/**
 * Where a student's progress on phonetics is kept. Owned by this layer, implemented in
 * `packages/data` (Drizzle/Postgres). It stores per-student progress only: the representation
 * itself — IPA, description, topic — lives in content and is reached through
 * `PhoneticContentRepository`, so the two never mix.
 *
 * `recordView`, `recordPractice` and `complete` are each one atomic operation, so two racing
 * requests cannot create a duplicate record and a repeat action cannot land the student in a state
 * `recordPhoneticView`/`recordPhoneticPractice`/`completePhonetic` would not produce. Every
 * timestamp is the caller's (the `Clock` port), never the database's `now()`.
 */
export interface UserPhoneticProgressRepository {
  findByUserAndRepresentation(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
  ): Promise<UserPhoneticProgress | null>;
  /** The student's progress on several representations in one round trip (a list must not cost a query per representation). */
  findByUserAndRepresentations(
    userId: string,
    phoneticRepresentationIds: readonly PhoneticRepresentationId[],
  ): Promise<readonly UserPhoneticProgress[]>;
  /** Every record the student has, of any status. */
  listByUser(userId: string): Promise<readonly UserPhoneticProgress[]>;
  /** Records a view: `recordPhoneticView`'s rule, applied atomically. */
  recordView(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress>;
  /** Records a practice: `recordPhoneticPractice`'s rule, applied atomically. */
  recordPractice(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress>;
  /** Records a completion: `completePhonetic`'s rule, applied atomically. */
  complete(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress>;
}
