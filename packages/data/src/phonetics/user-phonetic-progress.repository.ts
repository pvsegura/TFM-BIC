import type { UserPhoneticProgressRepository } from "@tfm-bic/application";
import {
  createPhoneticRepresentationId,
  type PhoneticRepresentationId,
  type UserPhoneticProgress,
} from "@tfm-bic/domain";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { PhoneticsDb } from "./db/client.js";
import { userPhoneticProgress } from "./db/schema.js";

function toProgress(row: typeof userPhoneticProgress.$inferSelect): UserPhoneticProgress {
  return {
    userId: row.userId,
    // Validated again on the way out: a row that somehow holds a malformed id fails loudly here
    // instead of leaking an unchecked string to callers.
    phoneticRepresentationId: createPhoneticRepresentationId(row.phoneticRepresentationId),
    status: row.status,
    firstViewedAt: row.firstViewedAt,
    lastViewedAt: row.lastViewedAt,
    practicedAt: row.practicedAt,
    completedAt: row.completedAt,
  };
}

/** True when the existing row is already `completed` — the point past which nothing here advances further. */
const NOT_YET_COMPLETED = sql`${userPhoneticProgress.status} != 'completed'`;
/** True when the existing row is still `viewed` — the only status `recordPractice` advances from. */
const STILL_VIEWED = sql`${userPhoneticProgress.status} = 'viewed'`;

/**
 * A student's phonetics progress in Postgres. `recordView`, `recordPractice` and `complete` are
 * each one atomic `INSERT ... ON CONFLICT DO UPDATE`, so they need no separate read: two racing
 * requests for the same representation cannot create a duplicate row, and none of the three can
 * land the record anywhere the domain's `recordPhoneticView`/`recordPhoneticPractice`/
 * `completePhonetic` would not produce. Every timestamp is the caller's, never the database's
 * `now()`.
 */
export class DrizzleUserPhoneticProgressRepository implements UserPhoneticProgressRepository {
  constructor(private readonly db: PhoneticsDb) {}

  async findByUserAndRepresentation(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
  ): Promise<UserPhoneticProgress | null> {
    const [row] = await this.db
      .select()
      .from(userPhoneticProgress)
      .where(
        and(
          eq(userPhoneticProgress.userId, userId),
          eq(userPhoneticProgress.phoneticRepresentationId, phoneticRepresentationId),
        ),
      );
    return row ? toProgress(row) : null;
  }

  async findByUserAndRepresentations(
    userId: string,
    phoneticRepresentationIds: readonly PhoneticRepresentationId[],
  ): Promise<readonly UserPhoneticProgress[]> {
    if (phoneticRepresentationIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(userPhoneticProgress)
      .where(
        and(
          eq(userPhoneticProgress.userId, userId),
          inArray(userPhoneticProgress.phoneticRepresentationId, [...phoneticRepresentationIds]),
        ),
      );
    return rows.map(toProgress);
  }

  async listByUser(userId: string): Promise<readonly UserPhoneticProgress[]> {
    const rows = await this.db
      .select()
      .from(userPhoneticProgress)
      .where(eq(userPhoneticProgress.userId, userId));
    return rows.map(toProgress);
  }

  async recordView(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress> {
    // A conflict means a record already exists: the status, first view time, practice time and
    // completion time are never touched by a view — only the last-viewed time always advances.
    const [row] = await this.db
      .insert(userPhoneticProgress)
      .values({
        userId,
        phoneticRepresentationId,
        status: "viewed",
        firstViewedAt: now,
        lastViewedAt: now,
        practicedAt: null,
        completedAt: null,
      })
      .onConflictDoUpdate({
        target: [userPhoneticProgress.userId, userPhoneticProgress.phoneticRepresentationId],
        set: { lastViewedAt: sql`excluded.last_viewed_at` },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into user_phonetic_progress returned no row.");
    }
    return toProgress(row);
  }

  async recordPractice(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress> {
    // On a first record this always applies. On a conflict, the status only advances from
    // `viewed`; the practice and last-viewed times always refresh, even after completion, so
    // repeated practice stays visible.
    const [row] = await this.db
      .insert(userPhoneticProgress)
      .values({
        userId,
        phoneticRepresentationId,
        status: "practiced",
        firstViewedAt: now,
        lastViewedAt: now,
        practicedAt: now,
        completedAt: null,
      })
      .onConflictDoUpdate({
        target: [userPhoneticProgress.userId, userPhoneticProgress.phoneticRepresentationId],
        set: {
          status: sql`CASE WHEN (${STILL_VIEWED}) THEN excluded.status ELSE ${userPhoneticProgress.status} END`,
          lastViewedAt: sql`excluded.last_viewed_at`,
          practicedAt: sql`excluded.practiced_at`,
        },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into user_phonetic_progress returned no row.");
    }
    return toProgress(row);
  }

  async complete(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress> {
    // On a first record this always applies. On a conflict, an already-completed row is left
    // exactly as it is (idempotent — even its completion time is kept); otherwise the record
    // advances to completed, keeping its first-viewed and practice times.
    const [row] = await this.db
      .insert(userPhoneticProgress)
      .values({
        userId,
        phoneticRepresentationId,
        status: "completed",
        firstViewedAt: now,
        lastViewedAt: now,
        practicedAt: null,
        completedAt: now,
      })
      .onConflictDoUpdate({
        target: [userPhoneticProgress.userId, userPhoneticProgress.phoneticRepresentationId],
        set: {
          status: sql`CASE WHEN (${NOT_YET_COMPLETED}) THEN excluded.status ELSE ${userPhoneticProgress.status} END`,
          lastViewedAt: sql`CASE WHEN (${NOT_YET_COMPLETED}) THEN excluded.last_viewed_at ELSE ${userPhoneticProgress.lastViewedAt} END`,
          completedAt: sql`CASE WHEN (${NOT_YET_COMPLETED}) THEN excluded.completed_at ELSE ${userPhoneticProgress.completedAt} END`,
        },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into user_phonetic_progress returned no row.");
    }
    return toProgress(row);
  }
}
