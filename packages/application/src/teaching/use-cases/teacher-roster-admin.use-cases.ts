import { assertCanLink, InvalidTeacherStudentLinkError, normalizeEmail } from "@tfm-bic/domain";

import type { UserRepository } from "../../identity/ports/user-repository.js";
import type { Clock } from "../../ports/clock.js";
import type { TeacherStudentLinkRepository } from "../ports/teacher-student-link-repository.js";
import { TeachingUserNotFoundError } from "../teaching-user-not-found.error.js";

/**
 * Operator commands (ADR-024): the only way a TEACHER account or a teacher–student link comes
 * into being in M13. They are run from the `teacher:*` CLI (packages/data) — and, under
 * NODE_ENV=test only, from a test-only route that E2E uses to set up data. No production HTTP
 * route calls them, so neither a teacher nor a student can grant themselves access.
 */

async function findByEmail(
  users: UserRepository,
  email: string,
  which: "teacher" | "student" | "user",
) {
  const user = await users.findByNormalizedEmail(normalizeEmail(email));
  if (!user) {
    throw new TeachingUserNotFoundError(which);
  }
  return user;
}

export class PromoteUserToTeacherUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly links: TeacherStudentLinkRepository,
  ) {}

  async execute(input: { email: string }): Promise<{ userId: string; changed: boolean }> {
    const user = await findByEmail(this.users, input.email, "user");
    if (user.role === "TEACHER") {
      return { userId: user.id, changed: false };
    }
    if (await this.links.isLinkedAsStudent(user.id)) {
      throw new InvalidTeacherStudentLinkError(
        "the user is linked to a teacher as a student; unlink them first",
      );
    }
    await this.users.updateRole(user.id, "TEACHER");
    return { userId: user.id, changed: true };
  }
}

interface LinkInput {
  teacherEmail: string;
  studentEmail: string;
}

export class LinkStudentToTeacherUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly links: TeacherStudentLinkRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: LinkInput,
  ): Promise<{ teacherId: string; studentId: string; created: boolean }> {
    const teacher = await findByEmail(this.users, input.teacherEmail, "teacher");
    const student = await findByEmail(this.users, input.studentEmail, "student");
    assertCanLink(teacher, student);
    const created = await this.links.link(teacher.id, student.id, this.clock.now());
    return { teacherId: teacher.id, studentId: student.id, created };
  }
}

export class UnlinkStudentFromTeacherUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly links: TeacherStudentLinkRepository,
  ) {}

  async execute(input: LinkInput): Promise<{ removed: boolean }> {
    const teacher = await findByEmail(this.users, input.teacherEmail, "teacher");
    const student = await findByEmail(this.users, input.studentEmail, "student");
    return { removed: await this.links.unlink(teacher.id, student.id) };
  }
}
