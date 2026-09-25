/**
 * Where teacher–student links are kept. Owned by this layer, implemented in `packages/data`
 * (`teacher_students`). Writes are used only by the operator use cases (ADR-024) — no HTTP route
 * creates or removes a link. The dashboard never asks this port "may I?": its read model joins
 * through the link itself, so an unlinked student simply is not in any result.
 */
export interface TeacherStudentLinkRepository {
  /** Creates the link; `false` (and nothing written) when it already exists. One atomic insert. */
  link(teacherId: string, studentId: string, now: Date): Promise<boolean>;
  /** Removes the link; `false` when there was none. */
  unlink(teacherId: string, studentId: string): Promise<boolean>;
  /** Whether the user appears as a student in any link (a linked student cannot become a teacher). */
  isLinkedAsStudent(userId: string): Promise<boolean>;
}
