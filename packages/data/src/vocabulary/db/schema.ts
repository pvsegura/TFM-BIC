import { STORED_VOCABULARY_STATUSES } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { check, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

const STORED_STATUSES_SQL = STORED_VOCABULARY_STATUSES.map((status) => `'${status}'`).join(", ");

/** Mirrors the domain's slug pattern and length (`isValidVocabularyItemId`). */
const ITEM_ID_PATTERN = "'^[a-z][a-z0-9]*(-[a-z0-9]+)*$'";

/**
 * A student's relationship to one vocabulary entry — and nothing else. There is deliberately no
 * `vocabulary`/`vocabulary_categories` table: an entry is a validated file grouped in a category
 * of its language (ADR-022), and this table only records what a student did with one. The
 * entry's lemma, translation, grammar and category never appear here, so content is never
 * duplicated per student.
 *
 * - The primary key is `(user_id, vocabulary_item_id)`: one logical record per student per word,
 *   enforced by the database, and the index that serves every query this table has (`WHERE
 *   user_id = ? [AND vocabulary_item_id IN (...)]`) — so no further index exists.
 * - `user_id` references `users` with `ON DELETE CASCADE`: a record can only exist for a real
 *   user and can never be orphaned.
 * - `vocabulary_item_id` is a content id held as validated text, *not* a foreign key: the
 *   referenced row is a file. The CHECK mirrors the domain's id pattern and length as defense in
 *   depth. A record for a word that later leaves the content is kept, and simply not listed.
 * - "New" is never stored: it is the absence of a row. Only `saved`, `learning` and `learned`
 *   exist, and `learned_at` is set exactly when the status is `learned`.
 * - Every timestamp is written from the application's `Clock`, never from the database's
 *   `now()`, so tests and production agree on what "now" is.
 */
export const userVocabulary = pgTable(
  "user_vocabulary",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vocabularyItemId: text("vocabulary_item_id").notNull(),
    status: text("status", { enum: STORED_VOCABULARY_STATUSES }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    learnedAt: timestamp("learned_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ name: "user_vocabulary_pk", columns: [table.userId, table.vocabularyItemId] }),
    check(
      "user_vocabulary_status_valid",
      sql`${table.status} IN (${sql.raw(STORED_STATUSES_SQL)})`,
    ),
    check(
      "user_vocabulary_learned_consistent",
      sql`(${table.status} = 'learned') = (${table.learnedAt} IS NOT NULL)`,
    ),
    check(
      "user_vocabulary_item_id_valid",
      sql`char_length(${table.vocabularyItemId}) <= 64 AND ${table.vocabularyItemId} ~ ${sql.raw(ITEM_ID_PATTERN)}`,
    ),
  ],
);
