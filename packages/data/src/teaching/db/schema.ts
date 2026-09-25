import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

/**
 * The teacher–student relationship (M13, ADR-024): one row per (teacher, student) pair, nothing
 * else — no school, class or invitation. Created and removed only by operator commands.
 *
 * - The primary key `(teacher_id, student_id)` makes a link unique and serves every dashboard
 *   query, which always starts from "this teacher's students".
 * - `student_id` gets its own index for the reverse direction: the `ON DELETE CASCADE` from
 *   `users` and the "is this user anyone's student?" check before a promotion.
 * - Roles are not checked here (Postgres CHECKs cannot see another table); the operator use case
 *   enforces them with the domain rule, and the read model filters on `role = 'STUDENT'` again.
 */
export const teacherStudents = pgTable(
  "teacher_students",
  {
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ name: "teacher_students_pk", columns: [table.teacherId, table.studentId] }),
    index("teacher_students_student_id_idx").on(table.studentId),
    check("teacher_students_distinct_users", sql`${table.teacherId} <> ${table.studentId}`),
  ],
);
