import { MAX_POINT_AMOUNT, REWARD_REASONS } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

const REASONS_SQL = REWARD_REASONS.map((reason) => `'${reason}'`).join(", ");

/** Mirrors the domain's slug pattern and length (`isValidRewardSourceId` / `isValidAchievementKey`). */
const SLUG_PATTERN = "'^[a-z][a-z0-9]*(-[a-z0-9]+)*$'";

/**
 * The points ledger — and, with `user_achievements`, all that gamification stores. It is the
 * **single source of truth** for points: there is no `total_points` column on `users` or
 * anywhere else, so there is nothing to drift. A student's total is `SUM(amount)`, and "why do
 * I have these points?" is a read of these rows. (A materialised balance is a possible later
 * optimisation, documented in ADR-021, but only as a rebuildable projection of this table.)
 *
 * **Append-only.** The application only ever inserts (the repository port has no update or
 * delete) and a trigger refuses any `UPDATE`, so a historical transaction cannot be edited.
 * Rows go away only with their user (`ON DELETE CASCADE`, for the later account-deletion work).
 *
 * - `id` is a database identity: ascending, so "newest first" and keyset paging are well
 *   defined even when two rows carry the same timestamp.
 * - `(user_id, reason, source_id)` is **unique**: it is the identity of a reward, and the
 *   database — not an `if` in the application — is what stops the same reward being paid twice,
 *   including under concurrent requests. Its index also serves every per-student aggregate
 *   (`WHERE user_id = ? GROUP BY reason`).
 * - `source_id` is what the reward was for — an exercise id, a lesson id or an achievement key —
 *   held as validated text, not a foreign key: exercises and lessons are files (ADR-018/019/020)
 *   and achievements are code (ADR-021). The CHECK mirrors the domain's slug rules.
 * - `amount` is a whole, positive number within a sanity bound; nothing here spends points.
 * - `created_at` comes from the application's `Clock`, never the database's `now()`.
 */
export const pointTransactions = pgTable(
  "point_transactions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: REWARD_REASONS }).notNull(),
    sourceId: text("source_id").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("point_transactions_reward_identity").on(table.userId, table.reason, table.sourceId),
    index("point_transactions_user_id_idx").on(table.userId, table.id),
    check("point_transactions_reason_valid", sql`${table.reason} IN (${sql.raw(REASONS_SQL)})`),
    check(
      "point_transactions_source_id_valid",
      sql`char_length(${table.sourceId}) <= 64 AND ${table.sourceId} ~ ${sql.raw(SLUG_PATTERN)}`,
    ),
    check(
      "point_transactions_amount_valid",
      sql`${table.amount} >= 1 AND ${table.amount} <= ${sql.raw(String(MAX_POINT_AMOUNT))}`,
    ),
  ],
);

/**
 * The achievements a student has unlocked — one row per (student, achievement), enforced by the
 * primary key. There is deliberately no `achievements` table: an achievement is a rule (code)
 * with a stable key, and a table would be a second copy of it to keep in sync (ADR-021).
 * `achievement_key` is therefore validated text, not a foreign key. An unlock is written in the
 * same database transaction as the reward it earns (see the repository), so an unlock without
 * its payout, or a payout without its unlock, cannot be committed.
 */
export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementKey: text("achievement_key").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ name: "user_achievements_pk", columns: [table.userId, table.achievementKey] }),
    check(
      "user_achievements_key_valid",
      sql`char_length(${table.achievementKey}) <= 64 AND ${table.achievementKey} ~ ${sql.raw(SLUG_PATTERN)}`,
    ),
  ],
);
