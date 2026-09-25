import {
  TeachingUserNotFoundError,
  type LinkStudentToTeacherUseCase,
  type PromoteUserToTeacherUseCase,
  type UnlinkStudentFromTeacherUseCase,
} from "@tfm-bic/application";
import { InvalidTeacherStudentLinkError } from "@tfm-bic/domain";

export const TEACHER_ADMIN_USAGE = [
  "Usage:",
  "  pnpm --filter @tfm-bic/data teacher:admin promote <email>",
  "  pnpm --filter @tfm-bic/data teacher:admin link <teacherEmail> <studentEmail>",
  "  pnpm --filter @tfm-bic/data teacher:admin unlink <teacherEmail> <studentEmail>",
].join("\n");

export interface TeacherAdminUseCases {
  promote: PromoteUserToTeacherUseCase;
  link: LinkStudentToTeacherUseCase;
  unlink: UnlinkStudentFromTeacherUseCase;
}

export interface TeacherAdminResult {
  exitCode: 0 | 1 | 2;
  message: string;
}

async function dispatch(
  [command, first, second, ...rest]: readonly string[],
  useCases: TeacherAdminUseCases,
): Promise<TeacherAdminResult> {
  const usage: TeacherAdminResult = { exitCode: 2, message: TEACHER_ADMIN_USAGE };
  if (rest.length > 0 || first === undefined) {
    return usage;
  }
  if (command === "promote" && second === undefined) {
    const { changed } = await useCases.promote.execute({ email: first });
    return {
      exitCode: 0,
      message: changed
        ? "Promoted the account to TEACHER."
        : "The account already is a TEACHER; nothing changed.",
    };
  }
  if (second === undefined) {
    return usage;
  }
  const input = { teacherEmail: first, studentEmail: second };
  if (command === "link") {
    const { created } = await useCases.link.execute(input);
    return {
      exitCode: 0,
      message: created
        ? "Linked the student to the teacher."
        : "The link already existed; nothing changed.",
    };
  }
  if (command === "unlink") {
    const { removed } = await useCases.unlink.execute(input);
    return {
      exitCode: 0,
      message: removed ? "Removed the link." : "There was no such link; nothing changed.",
    };
  }
  return usage;
}

/**
 * The operator command behind `pnpm --filter @tfm-bic/data teacher:admin` (ADR-024): the only
 * production path that creates a TEACHER or a teacher–student link in M13. Its output names no
 * account (no email, no id) so a terminal log or CI transcript leaks nothing. Rule violations and
 * unknown accounts are exit code 1, usage errors 2; anything unexpected is rethrown.
 */
export async function runTeacherAdminCommand(
  argv: readonly string[],
  useCases: TeacherAdminUseCases,
): Promise<TeacherAdminResult> {
  try {
    return await dispatch(argv, useCases);
  } catch (error) {
    if (
      error instanceof TeachingUserNotFoundError ||
      error instanceof InvalidTeacherStudentLinkError
    ) {
      return { exitCode: 1, message: error.message };
    }
    throw error;
  }
}
