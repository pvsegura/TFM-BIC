import { TeachingUserNotFoundError } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import { InvalidTeacherStudentLinkError } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";

import type { TeachingUseCases } from "../composition/teaching-use-cases.js";

/** Exactly `{ teacherEmail, studentEmail }`, two short non-empty strings; anything else is refused. */
function parseLinkBody(body: unknown): { teacherEmail: string; studentEmail: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const entries = Object.entries(body);
  const valid =
    entries.length === 2 &&
    entries.every(
      ([key, value]) =>
        (key === "teacherEmail" || key === "studentEmail") &&
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= 320,
    );
  if (!valid) {
    return null;
  }
  const { teacherEmail, studentEmail } = body as Record<string, string>;
  return teacherEmail && studentEmail ? { teacherEmail, studentEmail } : null;
}

/**
 * E2E setup only: M13 has no product flow that creates a teacher or a link — that is an operator
 * command (`pnpm --filter @tfm-bic/data teacher:admin`, ADR-024) which cannot reach the E2E
 * server's in-process database. This route runs the *same* operator use cases. Registered ONLY
 * when `NODE_ENV=test` **and** the E2E composition enabled it (test-dependencies.ts) — the same
 * double guard as the test email inbox — so it can never exist in development, staging or
 * production.
 */
export function registerTeacherDashboardTestSupportRoutes(
  app: FastifyInstance,
  deps: { env: AppEnv; enabled: boolean; useCases: TeachingUseCases },
): void {
  if (deps.env.NODE_ENV !== "test" || !deps.enabled) {
    return;
  }
  const { useCases } = deps;

  app.post("/teacher-dashboard/_test/links", async (request, reply) => {
    const body = parseLinkBody(request.body);
    if (!body) {
      return reply.code(400).send({ error: "Invalid request." });
    }
    try {
      await useCases.promoteToTeacher.execute({ email: body.teacherEmail });
      await useCases.linkStudent.execute(body);
    } catch (error) {
      if (
        error instanceof TeachingUserNotFoundError ||
        error instanceof InvalidTeacherStudentLinkError
      ) {
        return reply.code(400).send({ error: error.message });
      }
      throw error;
    }
    return reply.code(204).send();
  });
}
