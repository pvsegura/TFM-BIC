import {
  factsFromTotals,
  REWARD_REASONS,
  type GamificationFacts,
  type NewPointTransaction,
  type PointTransaction,
  type RewardTotal,
} from "@tfm-bic/domain";

import type {
  GamificationRepository,
  GamificationStore,
  NewUserAchievement,
  PointHistoryRequest,
  PointTransactionPage,
  UserAchievement,
} from "../ports/gamification-repository.js";

interface FakeState {
  transactions: PointTransaction[];
  unlocks: UserAchievement[];
}

/** Which write a failure hook is being asked about. */
export interface FakeWrite {
  kind: "points" | "unlock";
  reason?: NewPointTransaction["reason"];
  sourceId?: string;
  achievementKey?: string;
}

/**
 * In-memory `GamificationRepository` for application and HTTP-layer tests. It keeps the two
 * properties the real adapter gets from Postgres, so tests of the use cases prove real
 * behaviour rather than a happy path:
 *
 * - **Identity-idempotent writes**: a second transaction for the same (student, reason,
 *   source), or a second unlock of the same achievement, writes nothing and reports `null`.
 * - **`transactionForUser` is exclusive per student and atomic**: a student's transactions run
 *   one at a time (a queue, like the advisory lock) and every write of one that throws is
 *   undone (a snapshot restore, like a rollback).
 *
 * `failWhen` lets a test make a chosen write throw, to prove the rollback. Counters let a test
 * prove a read never wrote and how many reads a screen needed. Test-only.
 */
export class FakeGamificationRepository implements GamificationRepository {
  private state: FakeState = { transactions: [], unlocks: [] };
  private readonly queues = new Map<string, Promise<unknown>>();
  private nextId = 1;

  writeCalls = 0;
  readCalls = 0;
  transactionCalls = 0;
  /** Makes a write throw when this returns true; cleared by setting it back to `undefined`. */
  failWhen: ((write: FakeWrite) => boolean) | undefined;

  get transactions(): readonly PointTransaction[] {
    return this.state.transactions;
  }

  get unlocks(): readonly UserAchievement[] {
    return this.state.unlocks;
  }

  loadFacts(userId: string): Promise<GamificationFacts> {
    return this.storeOver(() => this.state).loadFacts(userId);
  }

  listUnlockedAchievements(userId: string): Promise<readonly UserAchievement[]> {
    return this.storeOver(() => this.state).listUnlockedAchievements(userId);
  }

  listPointTransactions(userId: string, page: PointHistoryRequest): Promise<PointTransactionPage> {
    return this.storeOver(() => this.state).listPointTransactions(userId, page);
  }

  recordPoints(transaction: NewPointTransaction): Promise<PointTransaction | null> {
    return this.storeOver(() => this.state).recordPoints(transaction);
  }

  recordUnlock(unlock: NewUserAchievement): Promise<UserAchievement | null> {
    return this.storeOver(() => this.state).recordUnlock(unlock);
  }

  async transactionForUser<T>(
    userId: string,
    work: (store: GamificationStore) => Promise<T>,
  ): Promise<T> {
    const previous = this.queues.get(userId) ?? Promise.resolve();
    const run = previous.then(async () => {
      this.transactionCalls += 1;
      const snapshot: FakeState = {
        transactions: [...this.state.transactions],
        unlocks: [...this.state.unlocks],
      };
      const nextIdBefore = this.nextId;
      try {
        return await work(this.storeOver(() => this.state));
      } catch (error) {
        this.state = snapshot;
        this.nextId = nextIdBefore;
        throw error;
      }
    });
    // The queue must keep moving whether `work` succeeded or not.
    this.queues.set(
      userId,
      run.catch(() => undefined),
    );
    return run;
  }

  private storeOver(current: () => FakeState): GamificationStore {
    return {
      loadFacts: (userId) => {
        this.readCalls += 1;
        const totals: RewardTotal[] = REWARD_REASONS.map((reason) => {
          const rows = current().transactions.filter(
            (t) => t.userId === userId && t.reason === reason,
          );
          return { reason, count: rows.length, points: rows.reduce((sum, t) => sum + t.amount, 0) };
        });
        return Promise.resolve(factsFromTotals(totals));
      },

      listUnlockedAchievements: (userId) => {
        this.readCalls += 1;
        return Promise.resolve(current().unlocks.filter((u) => u.userId === userId));
      },

      listPointTransactions: (userId, { limit, before }) => {
        this.readCalls += 1;
        const newestFirst = current()
          .transactions.filter(
            (t) => t.userId === userId && (before === undefined || t.id < before),
          )
          .sort((a, b) => b.id - a.id);
        const transactions = newestFirst.slice(0, limit);
        const last = transactions.at(-1);
        return Promise.resolve({
          transactions,
          nextBefore: newestFirst.length > limit && last ? last.id : null,
        });
      },

      recordPoints: (transaction) => {
        this.writeCalls += 1;
        this.maybeFail({
          kind: "points",
          reason: transaction.reason,
          sourceId: transaction.sourceId,
        });
        const state = current();
        const duplicate = state.transactions.some(
          (t) =>
            t.userId === transaction.userId &&
            t.reason === transaction.reason &&
            t.sourceId === transaction.sourceId,
        );
        if (duplicate) {
          return Promise.resolve(null);
        }
        const stored: PointTransaction = { ...transaction, id: this.nextId };
        this.nextId += 1;
        state.transactions.push(stored);
        return Promise.resolve(stored);
      },

      recordUnlock: (unlock) => {
        this.writeCalls += 1;
        this.maybeFail({ kind: "unlock", achievementKey: unlock.achievementKey });
        const state = current();
        const duplicate = state.unlocks.some(
          (u) => u.userId === unlock.userId && u.achievementKey === unlock.achievementKey,
        );
        if (duplicate) {
          return Promise.resolve(null);
        }
        state.unlocks.push({ ...unlock });
        return Promise.resolve(unlock);
      },
    };
  }

  private maybeFail(write: FakeWrite): void {
    if (this.failWhen?.(write)) {
      throw new Error("Injected gamification storage failure.");
    }
  }
}
