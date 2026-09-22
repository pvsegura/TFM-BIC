import type { UserVocabularyRepository } from "@tfm-bic/application";
import {
  ALLOWED_STATUS_CHANGES,
  createVocabularyItemId,
  type StoredVocabularyStatus,
  type UserVocabularyEntry,
  type VocabularyItemId,
} from "@tfm-bic/domain";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { VocabularyDb } from "./db/client.js";
import { userVocabulary } from "./db/schema.js";

function toEntry(row: typeof userVocabulary.$inferSelect): UserVocabularyEntry {
  return {
    userId: row.userId,
    // Validated again on the way out: a row that somehow holds a malformed id fails loudly
    // here instead of leaking an unchecked string to callers.
    vocabularyItemId: createVocabularyItemId(row.vocabularyItemId),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    learnedAt: row.learnedAt,
  };
}

/**
 * Built once from the domain's own `ALLOWED_STATUS_CHANGES` (never restated by hand), this is
 * the SQL truth of "may this record move from its current status to the one just proposed":
 * `(status, excluded.status)` matching one of the allowed pairs. Used inside a `CASE` on every
 * column `changeStatus` might touch, so a disallowed request changes nothing rather than needing
 * a separate check-then-write.
 */
const ALLOWED_TRANSITION_SQL = sql.join(
  ALLOWED_STATUS_CHANGES.map(
    ([from, to]) => sql`(${userVocabulary.status} = ${from} AND excluded.status = ${to})`,
  ),
  sql` OR `,
);

/**
 * A student's vocabulary state in Postgres. `save` and `changeStatus` are each one atomic
 * `INSERT ... ON CONFLICT DO UPDATE`, so they need no separate read: two racing requests for the
 * same word cannot create a duplicate row, and a disallowed status change cannot land the record
 * anywhere `evaluateStatusChange` would refuse. The rules they implement are the domain's
 * `saveVocabularyItem` / `changeVocabularyStatus` (the in-memory fake applies those functions
 * directly; the tests in this package prove the SQL behaves the same). Every timestamp is the
 * caller's, never the database's `now()`.
 */
export class DrizzleUserVocabularyRepository implements UserVocabularyRepository {
  constructor(private readonly db: VocabularyDb) {}

  async findByUserAndItem(
    userId: string,
    vocabularyItemId: VocabularyItemId,
  ): Promise<UserVocabularyEntry | null> {
    const [row] = await this.db
      .select()
      .from(userVocabulary)
      .where(
        and(
          eq(userVocabulary.userId, userId),
          eq(userVocabulary.vocabularyItemId, vocabularyItemId),
        ),
      );
    return row ? toEntry(row) : null;
  }

  async findByUserAndItems(
    userId: string,
    vocabularyItemIds: readonly VocabularyItemId[],
  ): Promise<readonly UserVocabularyEntry[]> {
    if (vocabularyItemIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(userVocabulary)
      .where(
        and(
          eq(userVocabulary.userId, userId),
          inArray(userVocabulary.vocabularyItemId, [...vocabularyItemIds]),
        ),
      );
    return rows.map(toEntry);
  }

  async listByUser(userId: string): Promise<readonly UserVocabularyEntry[]> {
    const rows = await this.db
      .select()
      .from(userVocabulary)
      .where(eq(userVocabulary.userId, userId));
    return rows.map(toEntry);
  }

  async save(
    userId: string,
    vocabularyItemId: VocabularyItemId,
    now: Date,
  ): Promise<UserVocabularyEntry> {
    // A conflict means a record already exists, whatever its status, and saving must leave it
    // alone. The no-op update exists only so RETURNING yields that existing row in one statement.
    const [row] = await this.db
      .insert(userVocabulary)
      .values({
        userId,
        vocabularyItemId,
        status: "saved",
        createdAt: now,
        updatedAt: now,
        learnedAt: null,
      })
      .onConflictDoUpdate({
        target: [userVocabulary.userId, userVocabulary.vocabularyItemId],
        set: { updatedAt: sql`${userVocabulary.updatedAt}` },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into user_vocabulary returned no row.");
    }
    return toEntry(row);
  }

  async changeStatus(
    userId: string,
    vocabularyItemId: VocabularyItemId,
    target: StoredVocabularyStatus,
    now: Date,
  ): Promise<UserVocabularyEntry> {
    // On a first record this always applies (there is nothing to refuse yet). On a conflict, every
    // column keeps its old value unless the transition is one `ALLOWED_TRANSITION_SQL` names.
    const [row] = await this.db
      .insert(userVocabulary)
      .values({
        userId,
        vocabularyItemId,
        status: target,
        createdAt: now,
        updatedAt: now,
        learnedAt: target === "learned" ? now : null,
      })
      .onConflictDoUpdate({
        target: [userVocabulary.userId, userVocabulary.vocabularyItemId],
        set: {
          status: sql`CASE WHEN (${ALLOWED_TRANSITION_SQL}) THEN excluded.status ELSE ${userVocabulary.status} END`,
          updatedAt: sql`CASE WHEN (${ALLOWED_TRANSITION_SQL}) THEN excluded.updated_at ELSE ${userVocabulary.updatedAt} END`,
          learnedAt: sql`CASE WHEN (${ALLOWED_TRANSITION_SQL}) THEN excluded.learned_at ELSE ${userVocabulary.learnedAt} END`,
        },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into user_vocabulary returned no row.");
    }
    return toEntry(row);
  }

  async remove(userId: string, vocabularyItemId: VocabularyItemId): Promise<void> {
    await this.db
      .delete(userVocabulary)
      .where(
        and(
          eq(userVocabulary.userId, userId),
          eq(userVocabulary.vocabularyItemId, vocabularyItemId),
        ),
      );
  }
}
