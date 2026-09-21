import type {
  GamificationRepository,
  GamificationStore,
  NewUserAchievement,
  PointHistoryRequest,
  PointTransactionPage,
  UserAchievement,
} from "@tfm-bic/application";
import {
  createAchievementKey,
  factsFromTotals,
  type GamificationFacts,
  type NewPointTransaction,
  type PointTransaction,
} from "@tfm-bic/domain";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";

import type { GamificationDb } from "./db/client.js";
import { pointTransactions, userAchievements } from "./db/schema.js";

/** What every query here needs, satisfied by both the pool-backed database and a transaction. */
type Executor = Pick<GamificationDb, "select" | "insert" | "execute">;

function toTransaction(row: typeof pointTransactions.$inferSelect): PointTransaction {
  return {
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    reason: row.reason,
    sourceId: row.sourceId,
    createdAt: row.createdAt,
  };
}

/**
 * The gamification queries, over either a plain connection or one open transaction. Both writes
 * are one `INSERT ... ON CONFLICT DO NOTHING ... RETURNING`: the database — not a read-then-write
 * in the application — decides whether a reward or an unlock already exists, so it is atomic and
 * safe under concurrent callers, and an empty `RETURNING` means "already there, nothing written".
 * Nothing here computes a reward, decides an achievement or reads the database's `now()`: every
 * value is the caller's.
 */
class DrizzleGamificationStore implements GamificationStore {
  constructor(private readonly db: Executor) {}

  async loadFacts(userId: string): Promise<GamificationFacts> {
    // One aggregate over the student's own rows, served by the (user_id, reason, source_id) index.
    // `sum` is a bigint in Postgres, so both aggregates are read back as numbers explicitly.
    const rows = await this.db
      .select({
        reason: pointTransactions.reason,
        count: sql<number>`count(*)`.mapWith(Number),
        points: sql<number>`coalesce(sum(${pointTransactions.amount}), 0)`.mapWith(Number),
      })
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .groupBy(pointTransactions.reason);

    return factsFromTotals(rows);
  }

  async listUnlockedAchievements(userId: string): Promise<readonly UserAchievement[]> {
    const rows = await this.db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(asc(userAchievements.unlockedAt), asc(userAchievements.achievementKey));

    return rows.map((row) => ({
      userId: row.userId,
      // Validated again on the way out: a row that somehow holds a malformed key fails loudly
      // here instead of leaking an unchecked string to callers.
      achievementKey: createAchievementKey(row.achievementKey),
      unlockedAt: row.unlockedAt,
    }));
  }

  async listPointTransactions(
    userId: string,
    { limit, before }: PointHistoryRequest,
  ): Promise<PointTransactionPage> {
    // Keyset paging over the (user_id, id) index. One row more than asked for tells whether a
    // next page exists without a second count query.
    const rows = await this.db
      .select()
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.userId, userId),
          before === undefined ? undefined : lt(pointTransactions.id, before),
        ),
      )
      .orderBy(desc(pointTransactions.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit).map(toTransaction);
    const last = page.at(-1);
    return { transactions: page, nextBefore: rows.length > limit && last ? last.id : null };
  }

  async recordPoints(transaction: NewPointTransaction): Promise<PointTransaction | null> {
    const [row] = await this.db
      .insert(pointTransactions)
      .values({
        userId: transaction.userId,
        amount: transaction.amount,
        reason: transaction.reason,
        sourceId: transaction.sourceId,
        createdAt: transaction.createdAt,
      })
      .onConflictDoNothing({
        target: [pointTransactions.userId, pointTransactions.reason, pointTransactions.sourceId],
      })
      .returning();
    return row ? toTransaction(row) : null;
  }

  async recordUnlock(unlock: NewUserAchievement): Promise<UserAchievement | null> {
    const [row] = await this.db
      .insert(userAchievements)
      .values({
        userId: unlock.userId,
        achievementKey: unlock.achievementKey,
        unlockedAt: unlock.unlockedAt,
      })
      .onConflictDoNothing({ target: [userAchievements.userId, userAchievements.achievementKey] })
      .returning();
    return row
      ? {
          userId: row.userId,
          achievementKey: createAchievementKey(row.achievementKey),
          unlockedAt: row.unlockedAt,
        }
      : null;
  }
}

/**
 * Points and achievements in Postgres. The ledger (`point_transactions`) is the only record of
 * points; a total is derived from it, so there is no balance to keep consistent.
 *
 * `transactionForUser` is the transaction boundary for rewards: one database transaction that
 * first takes a **transaction-scoped advisory lock keyed on the student**. Two requests for the
 * same student therefore run their reward work one after the other — the second sees everything
 * the first committed, so an achievement rule that depends on a running total cannot be missed
 * by two requests that each saw only part of it — while different students never wait on each
 * other. The lock is released by commit or rollback, so a failed request cannot leave it held.
 * The unique constraints are the second line of defence: even without the lock a duplicate
 * reward or unlock is refused by the database.
 *
 * Deliberately no method here updates or deletes a transaction (and a trigger refuses an
 * `UPDATE`): history is append-only.
 */
export class DrizzleGamificationRepository
  extends DrizzleGamificationStore
  implements GamificationRepository
{
  constructor(private readonly database: GamificationDb) {
    super(database);
  }

  transactionForUser<T>(
    userId: string,
    work: (store: GamificationStore) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`gamification:${userId}`}, 0))`,
      );
      return work(new DrizzleGamificationStore(tx));
    });
  }
}
