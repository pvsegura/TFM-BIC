import { LESSON_PROGRESS_STATUSES } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { check, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

const STORED_STATUSES_SQL = LESSON_PROGRESS_STATUSES.map((status) => `'${status}'`).join(", ");

/**
 * A student's progress in a lesson — and nothing else. There is deliberately no
 * `lessons` table: lessons are validated files under `content/` (ADR-018), and
 * this table only records what a student did with one. The lesson's text,
 * order, language and level never appear here, so content is never duplicated
 * per student.
 *
 * - The primary key is `(user_id, lesson_id)`: one logical record per student
 *   per lesson, enforced by the database, and the index that serves every
 *   query this table has (`WHERE user_id = ? [AND lesson_id IN (...)]`) — so no
 *   further index exists.
 * - `user_id` references `users` with `ON DELETE CASCADE`: progress can only
 *   exist for a real user and can never be orphaned (the account-deletion
 *   workflow itself is a later milestone).
 * - `lesson_id` is a content id held as validated text, *not* a foreign key:
 *   the referenced rows are files. The CHECK mirrors the domain's content-id
 *   pattern and length (`createContentId`) as defense in depth. Progress for a
 *   lesson that later leaves the content is kept, and simply not listed.
 * - "Not started" is never stored: it is the absence of a row. Only
 *   `in_progress` and `completed` exist, and `completed_at` is set exactly when
 *   the status is `completed`.
 * - Every timestamp is written from the application's `Clock`, never from the
 *   database's `now()`, so tests and production agree on what "now" is.
 */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    status: text("status", { enum: LESSON_PROGRESS_STATUSES }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ name: "lesson_progress_pk", columns: [table.userId, table.lessonId] }),
    check(
      "lesson_progress_status_valid",
      sql`${table.status} IN (${sql.raw(STORED_STATUSES_SQL)})`,
    ),
    check(
      "lesson_progress_completion_consistent",
      sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL)`,
    ),
    check(
      "lesson_progress_lesson_id_valid",
      sql`char_length(${table.lessonId}) <= 64 AND ${table.lessonId} ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'`,
    ),
  ],
);
