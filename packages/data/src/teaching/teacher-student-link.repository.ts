import type { TeacherStudentLinkRepository } from "@tfm-bic/application";
import { and, eq } from "drizzle-orm";

import type { TeachingDb } from "./db/client.js";
import { teacherStudents } from "./db/schema.js";

/**
 * Teacher–student links in Postgres. `link` is one `INSERT … ON CONFLICT DO NOTHING RETURNING`:
 * the primary key — not a read-then-write — decides whether the link already exists. The role
 * rules are the operator use case's (domain `assertCanLink`); the database adds the self-link
 * CHECK and cascades a deleted user's links.
 */
export class DrizzleTeacherStudentLinkRepository implements TeacherStudentLinkRepository {
  constructor(private readonly db: TeachingDb) {}

  async link(teacherId: string, studentId: string, now: Date): Promise<boolean> {
    const rows = await this.db
      .insert(teacherStudents)
      .values({ teacherId, studentId, linkedAt: now })
      .onConflictDoNothing({ target: [teacherStudents.teacherId, teacherStudents.studentId] })
      .returning({ studentId: teacherStudents.studentId });
    return rows.length > 0;
  }

  async unlink(teacherId: string, studentId: string): Promise<boolean> {
    const rows = await this.db
      .delete(teacherStudents)
      .where(
        and(eq(teacherStudents.teacherId, teacherId), eq(teacherStudents.studentId, studentId)),
      )
      .returning({ studentId: teacherStudents.studentId });
    return rows.length > 0;
  }

  async isLinkedAsStudent(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ studentId: teacherStudents.studentId })
      .from(teacherStudents)
      .where(eq(teacherStudents.studentId, userId))
      .limit(1);
    return rows.length > 0;
  }
}
