import type {
  AchievementKey,
  GamificationFacts,
  NewPointTransaction,
  PointTransaction,
} from "@tfm-bic/domain";

/** A student's unlocked achievement: which one, and when. There is one per (student, achievement). */
export interface UserAchievement {
  readonly userId: string;
  readonly achievementKey: AchievementKey;
  readonly unlockedAt: Date;
}

export type NewUserAchievement = UserAchievement;

export interface PointHistoryRequest {
  /** How many transactions to return, at most. */
  readonly limit: number;
  /** Return only transactions older than the one with this id (the last of the previous page). */
  readonly before?: number;
}

export interface PointTransactionPage {
  /** Newest first. */
  readonly transactions: readonly PointTransaction[];
  /** Pass as `before` for the next page; `null` when this was the last one. */
  readonly nextBefore: number | null;
}

/**
 * Where a student's points and achievements are kept. Owned by this layer, implemented in
 * `packages/data` (Drizzle/Postgres). It stores what happened and nothing more: how many
 * points an action is worth, which achievements exist and when one unlocks are decided by
 * the domain and the reward use case, never here.
 *
 * The **ledger is the single source of truth** for points: there is no stored balance to keep
 * in step, a total is derived from the transactions (`loadFacts`). Its two writes are
 * append-only and *idempotent by identity*: recording a reward that already exists is not an
 * error and changes nothing — it reports `null` — so a repeated request can never pay twice.
 */
export interface GamificationStore {
  /** What the ledger says about the student: total points and how many rewards of each kind. One aggregate query. */
  loadFacts(userId: string): Promise<GamificationFacts>;
  listUnlockedAchievements(userId: string): Promise<readonly UserAchievement[]>;
  listPointTransactions(userId: string, page: PointHistoryRequest): Promise<PointTransactionPage>;
  /**
   * Appends a transaction and returns it with its assigned id — or `null`, having written
   * nothing, when this student already has a transaction for the same reason and source.
   */
  recordPoints(transaction: NewPointTransaction): Promise<PointTransaction | null>;
  /** Records an unlock, or returns `null`, having written nothing, when the student already has it. */
  recordUnlock(unlock: NewUserAchievement): Promise<UserAchievement | null>;
}

/**
 * The store plus the transaction boundary. `transactionForUser` runs `work` in **one database
 * transaction that is also exclusive per student**: two calls for the same student never run
 * their work at the same time, and if `work` throws, every write it made is rolled back. That
 * is what lets a reward, the achievement it unlocks and that achievement's own reward be
 * stored together or not at all, and lets achievement rules see every earlier reward.
 */
export interface GamificationRepository extends GamificationStore {
  transactionForUser<T>(userId: string, work: (store: GamificationStore) => Promise<T>): Promise<T>;
}
