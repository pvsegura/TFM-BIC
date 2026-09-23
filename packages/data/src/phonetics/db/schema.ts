import { PHONETIC_PROGRESS_STATUSES } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { check, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

const PROGRESS_STATUSES_SQL = PHONETIC_PROGRESS_STATUSES.map((status) => `'${status}'`).join(", ");

/** Mirrors the domain's slug pattern and length (`isValidPhoneticRepresentationId`). */
const REPRESENTATION_ID_PATTERN = "'^[a-z][a-z0-9]*(-[a-z0-9]+)*$'";

/**
 * A student's progress on one phonetic representation — and nothing else. There is deliberately
 * no `phonetic_representations`/`phonetic_topics` table: a representation is a validated file
 * grouped in a topic of its language (like vocabulary, ADR-022), and this table only records what
 * a student did with one. The representation's IPA, description, topic and examples never appear
 * here, so content is never duplicated per student.
 *
 * - The primary key is `(user_id, phonetic_representation_id)`: one logical record per student per
 *   representation, enforced by the database, and the index that serves every query this table has
 *   (`WHERE user_id = ? [AND phonetic_representation_id IN (...)]`) — so no further index exists.
 * - `user_id` references `users` with `ON DELETE CASCADE`: a record can only exist for a real user
 *   and can never be orphaned.
 * - `phonetic_representation_id` is a content id held as validated text, *not* a foreign key: the
 *   referenced row is a file. The CHECK mirrors the domain's id pattern and length as defense in
 *   depth. A record for a representation that later leaves the content is kept, and simply not
 *   listed.
 * - Progress only ever moves forward (`viewed` -> `practiced` -> `completed`; see
 *   `user-phonetic-progress.ts`), so unlike vocabulary's status there is no "step back" to encode
 *   in SQL — a repeat action either advances the status or leaves it as it is.
 * - `completed_at` is set exactly when the status is `completed`. `practiced_at` is set once the
 *   status has reached `practiced` or `completed`.
 * - Every timestamp is written from the application's `Clock`, never from the database's `now()`,
 *   so tests and production agree on what "now" is.
 */
export const userPhoneticProgress = pgTable(
  "user_phonetic_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phoneticRepresentationId: text("phonetic_representation_id").notNull(),
    status: text("status", { enum: PHONETIC_PROGRESS_STATUSES }).notNull(),
    firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }).notNull(),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).notNull(),
    practicedAt: timestamp("practiced_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      name: "user_phonetic_progress_pk",
      columns: [table.userId, table.phoneticRepresentationId],
    }),
    check(
      "user_phonetic_progress_status_valid",
      sql`${table.status} IN (${sql.raw(PROGRESS_STATUSES_SQL)})`,
    ),
    check(
      "user_phonetic_progress_completed_consistent",
      sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL)`,
    ),
    check(
      "user_phonetic_progress_representation_id_valid",
      sql`char_length(${table.phoneticRepresentationId}) <= 64 AND ${table.phoneticRepresentationId} ~ ${sql.raw(REPRESENTATION_ID_PATTERN)}`,
    ),
  ],
);
