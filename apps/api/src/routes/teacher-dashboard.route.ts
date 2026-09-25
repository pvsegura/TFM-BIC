import type {
  ResolveSessionUseCase,
  RosterStudentView,
  TeacherStudentDetail,
  TeacherStudentsPage,
  TeachingViewer,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  teacherDashboardEmptyQuerySchema,
  teacherOverviewResponseSchema,
  teacherStudentDetailResponseSchema,
  teacherStudentIdParamSchema,
  teacherStudentListQuerySchema,
  teacherStudentsResponseSchema,
} from "@tfm-bic/contracts";
import { TeachingStudentNotFoundError } from "@tfm-bic/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { TeachingUseCases } from "../composition/teaching-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createRequireRoleHook } from "../hooks/require-role.js";
import { requestLocale } from "./interface-locale.js";
import { teacherDashboardRateLimit } from "./teacher-dashboard-rate-limit.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;
/** One body for "does not exist", "not a student", "not yours" and "malformed id" alike. */
const STUDENT_NOT_FOUND = { error: "Student not found." } as const;

/** Student data is per teacher, so no shared cache (browser, proxy or CDN) may keep any of it. */
function noStore(reply: FastifyReply): void {
  void reply.header("Cache-Control", "private, no-store");
}

/** The viewer is always the session's user, set by `authenticate` — never the request. */
function sessionViewer(request: FastifyRequest): TeachingViewer {
  const user = request.currentUser;
  if (!user) {
    // Unreachable: `authenticate` replies 401 before any handler runs.
    throw new Error("A teacher-dashboard handler ran without an authenticated user.");
  }
  return { id: user.id, role: user.role };
}

const iso = (value: Date | null) => value?.toISOString() ?? null;

function toStudentResponse(student: RosterStudentView) {
  return { ...student, lastActivityAt: iso(student.lastActivityAt) };
}

function toStudentsResponse(page: TeacherStudentsPage) {
  return teacherStudentsResponseSchema.parse({
    ...page,
    students: page.students.map(toStudentResponse),
  });
}

function toDetailResponse(detail: TeacherStudentDetail) {
  return teacherStudentDetailResponseSchema.parse({
    student: toStudentResponse(detail.student),
    lessons: {
      ...detail.lessons,
      recent: detail.lessons.recent.map((lesson) => ({
        ...lesson,
        startedAt: lesson.startedAt.toISOString(),
        completedAt: iso(lesson.completedAt),
        updatedAt: lesson.updatedAt.toISOString(),
      })),
    },
    exercises: {
      ...detail.exercises,
      recent: detail.exercises.recent.map((attempt) => ({
        ...attempt,
        answeredAt: attempt.answeredAt.toISOString(),
      })),
    },
    gamification: {
      ...detail.gamification,
      unlocked: detail.gamification.unlocked.map((a) => ({
        ...a,
        unlockedAt: a.unlockedAt.toISOString(),
      })),
    },
    weekly: detail.weekly.map((week) => ({ ...week, weekStart: week.weekStart.toISOString() })),
  });
}

/**
 * The teacher dashboard (M13) — authenticated, TEACHER-only and **read-only**.
 *
 * - `GET /teacher-dashboard/overview` — totals over the teacher's own students.
 * - `GET /teacher-dashboard/students?q=&activity=&sort=&direction=&page=&pageSize=` — one page.
 * - `GET /teacher-dashboard/students/:studentId` — one student's learning picture.
 *
 * Order of checks on every route: session (`401`), TEACHER role (`403`, before any read), strict
 * query validation (`400`). The teacher is always the session's user; there is no teacher id in
 * any path or query. A student id is only ever looked up *through the teacher's links*, so a
 * student of another teacher, a missing or non-student id and a malformed id are all the same
 * `404` — the response never reveals whether an account exists. Viewing a student is audit-logged
 * (`teacher.student_viewed`, with the two user ids and nothing else).
 */
export function registerTeacherDashboardRoutes(
  app: FastifyInstance,
  deps: { useCases: TeachingUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const preHandler = [createAuthenticateHook(resolveSession), createRequireRoleHook(["TEACHER"])];
  const config = { rateLimit: teacherDashboardRateLimit(env) };

  app.get("/teacher-dashboard/overview", { config, preHandler }, async (request, reply) => {
    if (!teacherDashboardEmptyQuerySchema.safeParse(request.query).success) {
      return reply.code(400).send(INVALID_REQUEST);
    }
    const overview = await useCases.getOverview.execute({ viewer: sessionViewer(request) });
    noStore(reply);
    return teacherOverviewResponseSchema.parse(overview);
  });

  app.get("/teacher-dashboard/students", { config, preHandler }, async (request, reply) => {
    const query = teacherStudentListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }
    const page = await useCases.listStudents.execute({
      viewer: sessionViewer(request),
      page: query.data.page,
      pageSize: query.data.pageSize,
      search: query.data.q,
      activity: query.data.activity,
      sort: query.data.sort,
      direction: query.data.direction,
    });
    noStore(reply);
    return toStudentsResponse(page);
  });

  app.get(
    "/teacher-dashboard/students/:studentId",
    { config, preHandler },
    async (request, reply) => {
      if (!teacherDashboardEmptyQuerySchema.safeParse(request.query).success) {
        return reply.code(400).send(INVALID_REQUEST);
      }
      const params = teacherStudentIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(404).send(STUDENT_NOT_FOUND);
      }
      const viewer = sessionViewer(request);
      try {
        const detail = await useCases.getStudentDetail.execute({
          viewer,
          studentId: params.data.studentId,
          locale: requestLocale(request, useCases.achievementTexts),
        });
        request.log.info(
          { teacherId: viewer.id, studentId: params.data.studentId },
          "teacher.student_viewed",
        );
        noStore(reply);
        return toDetailResponse(detail);
      } catch (error) {
        if (error instanceof TeachingStudentNotFoundError) {
          return reply.code(404).send(STUDENT_NOT_FOUND);
        }
        throw error;
      }
    },
  );
}
