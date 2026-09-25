import type { Role } from "../identity/role.js";
import { InvalidTeacherStudentLinkError } from "./errors/invalid-teacher-student-link.error.js";

/**
 * The minimum relationship M13 needs: a teacher may see a student's learning activity when — and
 * only when — a link between the two exists. There is no school, class or organisation: one row
 * per (teacher, student) pair. Links are created by an operator (see ADR-024), never by a request
 * a teacher or student makes.
 */
export interface TeacherStudentLink {
  readonly teacherId: string;
  readonly studentId: string;
  readonly linkedAt: Date;
}

interface LinkParty {
  readonly id: string;
  readonly role: Role;
}

/** The link rules: a TEACHER, a STUDENT, and two different users. Throws otherwise. */
export function assertCanLink(teacher: LinkParty, student: LinkParty): void {
  if (teacher.id === student.id) {
    throw new InvalidTeacherStudentLinkError("a user cannot be linked to themselves");
  }
  if (teacher.role !== "TEACHER") {
    throw new InvalidTeacherStudentLinkError("the first user is not a teacher");
  }
  if (student.role !== "STUDENT") {
    throw new InvalidTeacherStudentLinkError("the second user is not a student");
  }
}

/** Only teachers may use the teacher dashboard; what they see is further limited to their links. */
export function canAccessTeacherDashboard(role: Role): boolean {
  return role === "TEACHER";
}
