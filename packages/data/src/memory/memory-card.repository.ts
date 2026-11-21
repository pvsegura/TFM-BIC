import type {
  MemoryCard,
  MemoryCardRepository,
  MemoryReviewLog,
  RecordReviewInput,
  RecordReviewResult,
} from "@verbysia/application";
import { createVocabularyItemId, newMemoryCardSchedule, scheduleReview } from "@verbysia/domain";
import { and, eq, gte, sql } from "drizzle-orm";

import type { MemoryDb } from "./db/client.js";
import { memoryCards, memoryReviews } from "./db/schema.js";

function toCard(row: typeof memoryCards.$inferSelect): MemoryCard {
  return {
    userId: row.userId,
    vocabularyItemId: createVocabularyItemId(row.vocabularyItemId),
    repetitions: row.repetitions,
    intervalDays: row.intervalDays,
    ease: row.ease,
    dueAt: row.dueAt,
    lapses: row.lapses,
    version: row.version,
    lastReviewedAt: row.lastReviewedAt,
    createdAt: row.createdAt,
  };
}

/**
 * Memory-trainer cards in Postgres. `recordReview` is one transaction:
 *
 * 1. If this learner already recorded `clientReviewId`, return the card untouched (a retried
 *    request after a dropped connection must not count twice).
 * 2. `SELECT … FOR UPDATE` the card, so two devices answering the same card serialise.
 * 3. Schedule with the domain's SM-2 and write the card with `version + 1`.
 * 4. Append the review. The unique `(user_id, client_review_id)` index is the final guard: if
 *    two identical retries race past step 1, the second insert fails and its transaction rolls
 *    back, card included — then the caller's retry finds the review in step 1.
 */
export class DrizzleMemoryCardRepository implements MemoryCardRepository {
  constructor(private readonly db: MemoryDb) {}

  async listByUser(userId: string): Promise<readonly MemoryCard[]> {
    const rows = await this.db.select().from(memoryCards).where(eq(memoryCards.userId, userId));
    return rows.map(toCard);
  }

  async recordReview(input: RecordReviewInput): Promise<RecordReviewResult> {
    try {
      return await this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: memoryReviews.id })
          .from(memoryReviews)
          .where(
            and(
              eq(memoryReviews.userId, input.userId),
              eq(memoryReviews.clientReviewId, input.clientReviewId),
            ),
          );
        if (existing) {
          const card = await this.readCard(tx, input);
          if (!card) throw new Error("A recorded review has no card.");
          return { card, duplicate: true };
        }

        const [locked] = await tx
          .select()
          .from(memoryCards)
          .where(
            and(
              eq(memoryCards.userId, input.userId),
              eq(memoryCards.vocabularyItemId, input.vocabularyItemId),
            ),
          )
          .for("update");
        const current = locked ? toCard(locked) : null;
        const next = scheduleReview(
          current ?? newMemoryCardSchedule(input.now),
          input.grade,
          input.now,
        );

        const [row] = await tx
          .insert(memoryCards)
          .values({
            userId: input.userId,
            vocabularyItemId: input.vocabularyItemId,
            ...next,
            version: 1,
            lastReviewedAt: input.now,
            createdAt: input.now,
          })
          .onConflictDoUpdate({
            target: [memoryCards.userId, memoryCards.vocabularyItemId],
            set: {
              repetitions: next.repetitions,
              intervalDays: next.intervalDays,
              ease: next.ease,
              dueAt: next.dueAt,
              lapses: next.lapses,
              version: sql`${memoryCards.version} + 1`,
              lastReviewedAt: input.now,
            },
          })
          .returning();
        if (!row) throw new Error("Memory card upsert returned no row.");

        await tx.insert(memoryReviews).values({
          userId: input.userId,
          vocabularyItemId: input.vocabularyItemId,
          clientReviewId: input.clientReviewId,
          grade: input.grade,
          usedHint: input.usedHint ? 1 : 0,
          previousIntervalDays: current?.intervalDays ?? 0,
          intervalDays: next.intervalDays,
          ease: next.ease,
          reviewedAt: input.now,
        });

        return { card: toCard(row), duplicate: false };
      });
    } catch (error) {
      // Lost a race with an identical retry: the other transaction recorded it — report that.
      if (isUniqueViolation(error)) {
        const card = await this.readCard(this.db, input);
        if (card) return { card, duplicate: true };
      }
      throw error;
    }
  }

  async listReviewsSince(userId: string, since: Date): Promise<readonly MemoryReviewLog[]> {
    const rows = await this.db
      .select()
      .from(memoryReviews)
      .where(and(eq(memoryReviews.userId, userId), gte(memoryReviews.reviewedAt, since)));
    return rows.map((row) => ({
      vocabularyItemId: createVocabularyItemId(row.vocabularyItemId),
      grade: row.grade,
      usedHint: row.usedHint === 1,
      reviewedAt: row.reviewedAt,
    }));
  }

  private async readCard(
    db: Pick<MemoryDb, "select">,
    input: Pick<RecordReviewInput, "userId" | "vocabularyItemId">,
  ): Promise<MemoryCard | null> {
    const [row] = await db
      .select()
      .from(memoryCards)
      .where(
        and(
          eq(memoryCards.userId, input.userId),
          eq(memoryCards.vocabularyItemId, input.vocabularyItemId),
        ),
      );
    return row ? toCard(row) : null;
  }
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current instanceof Error; depth += 1) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
