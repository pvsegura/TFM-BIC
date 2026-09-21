import type { ExerciseAnswerValue } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

/**
 * A student's exercise attempts — and nothing else. There is deliberately no
 * `exercises` table: exercises are validated files under `content/` (ADR-018,
 * ADR-020), and this table only records what a student submitted. The exercise's
 * prompt, options and answer key never appear here, so content is never
 * duplicated per student and an answer key is never stored next to student data.
 *
 * **Append-only history.** Every submission is one row; the application only ever
 * inserts (the repository port has no update or delete), so a retry never
 * changes an earlier row and the correctness stored with an attempt is what the
 * evaluator said at the time.
 *
 * - `id` is a database identity: ascending, so the *later insert* is always
 *   distinguishable, which makes "the latest attempt" well defined even when two
 *   attempts carry the same timestamp.
 * - `user_id` references `users` with `ON DELETE CASCADE`: an attempt can only
 *   exist for a real user and is never orphaned (the account-deletion workflow
 *   itself is a later milestone).
 * - `exercise_id` is a content id held as validated text, *not* a foreign key:
 *   the referenced rows are files. The CHECK mirrors the domain's id pattern and
 *   length (`createExerciseId`) as defense in depth. Attempts for an exercise
 *   that later leaves the content are kept, and simply not listed.
 * - `submitted_answer` is `jsonb`, so one column serves every exercise type (a
 *   string for a choice or typed text, a boolean for true/false, richer values
 *   later) without a migration per type, and keeps its type. It is bounded.
 * - `correct` and `answered_at` are set by the server: the evaluator's verdict
 *   and the application's `Clock`, never the database's `now()` and never the
 *   client.
 * - One index serves every query this table has: attempts of one user for some
 *   exercises, newest first (`WHERE user_id = ? AND exercise_id IN (...)
 *   ORDER BY answered_at DESC`). No points, streaks or scores are stored: those
 *   are later milestones and can be derived from these rows.
 */
export const exerciseAttempts = pgTable(
  "exercise_attempts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    submittedAnswer: jsonb("submitted_answer").$type<ExerciseAnswerValue>().notNull(),
    correct: boolean("correct").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("exercise_attempts_user_exercise_answered_idx").on(
      table.userId,
      table.exerciseId,
      table.answeredAt,
    ),
    check(
      "exercise_attempts_exercise_id_valid",
      sql`char_length(${table.exerciseId}) <= 64 AND ${table.exerciseId} ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'`,
    ),
    check(
      "exercise_attempts_answer_bounded",
      sql`octet_length(${table.submittedAnswer}::text) <= 4096`,
    ),
  ],
);
