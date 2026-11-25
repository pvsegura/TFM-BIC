import type {
  AchievementTexts,
  CompleteLessonWithRewardsResult,
  LessonDetail,
  LessonProgressView,
  LessonSummary,
  ContentGate,
  ResolveSessionUseCase,
} from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import {
  lessonActionRequestSchema,
  lessonCompletionResponseSchema,
  lessonIdParamSchema,
  lessonListQuerySchema,
  lessonListResponseSchema,
  lessonProgressResponseSchema,
  lessonResponseSchema,
  type LessonProgressResponse,
} from "@verbysia/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";

import type { LessonUseCases } from "../composition/lesson-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { requestLocale } from "./interface-locale.js";
import { mapLessonError } from "./lesson-error.mapper.js";
import { lessonRateLimit } from "./lesson-rate-limit.js";
import { INVALID_REQUEST, privateResponse, sessionUserId } from "./route-helpers.js";
import { createContentAccessHook, paramOf } from "../hooks/content-access.js";

/** `start` and `complete` take no input, so nothing legitimate needs more than a
 * few bytes; anything bigger is rejected (413) before it is parsed. */
const ACTION_BODY_LIMIT_BYTES = 1024;

function toProgressResponse(progress: LessonProgressView): LessonProgressResponse {
  return lessonProgressResponseSchema.parse({
    status: progress.status,
    startedAt: progress.startedAt?.toISOString() ?? null,
    completedAt: progress.completedAt?.toISOString() ?? null,
  });
}

function toCompletionResponse({ progress, rewards }: CompleteLessonWithRewardsResult) {
  return lessonCompletionResponseSchema.parse({ ...toProgressResponse(progress), rewards });
}

function toSummaryResponse(lesson: LessonSummary) {
  return {
    id: lesson.id,
    languageId: lesson.languageId,
    levelId: lesson.levelId,
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    instructionLanguage: lesson.instructionLanguage,
    progress: toProgressResponse(lesson.progress),
  };
}

function toLessonResponse({ lesson, progress }: LessonDetail) {
  // Parsed through the response schema: content that is not valid plain text or
  // has a block type this version does not know never leaves the API.
  return lessonResponseSchema.parse({
    id: lesson.id,
    languageId: lesson.languageId,
    levelId: lesson.levelId,
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    instructionLanguage: lesson.instructionLanguage,
    blocks: lesson.blocks,
    progress: toProgressResponse(progress),
  });
}

/**
 * The student lesson experience (M6) — authenticated-only, and generic: one set
 * of routes for every language and level. Lessons are M5 content items of type
 * `lesson`; only the student's progress is stored.
 *
 * - `GET /lessons?language=&level=` — lesson cards with the caller's progress.
 * - `GET /lessons/:lessonId` — one lesson with its blocks and the caller's progress.
 * - `POST /lessons/:lessonId/start` — the caller opened the lesson (idempotent).
 * - `POST /lessons/:lessonId/complete` — the caller finished it (idempotent). The response also
 *   says what it earned (M8): the first completion of a lesson is rewarded once, a repeat earns
 *   nothing.
 *
 * The user is always the session's, never a URL/query/body value. There is no
 * route that creates, edits or publishes a lesson.
 */
export function registerLessonRoutes(
  app: FastifyInstance,
  deps: {
    useCases: LessonUseCases;
    resolveSession: ResolveSessionUseCase;
    env: AppEnv;
    /** Verbysia: paid lessons need a licence (checked after authentication). */
    contentGate?: ContentGate;
    achievementTexts: AchievementTexts;
  },
): void {
  const { useCases, resolveSession, env, achievementTexts } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);
  const config = { rateLimit: lessonRateLimit(env) };
  const lessonGate = deps.contentGate
    ? [
        createContentAccessHook(deps.contentGate, (request) => {
          const id = paramOf(request, "lessonId");
          return id ? { kind: "content", id } : null;
        }),
      ]
    : [];

  app.get("/lessons", { config, preHandler: [authenticate] }, async (request, reply) => {
    const query = lessonListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    return privateResponse(reply, mapLessonError, async () => {
      const lessons = await useCases.listLessons.execute({
        ...(query.data.instruction ? { instructionLanguage: query.data.instruction } : {}),
        userId: sessionUserId(request),
        languageId: query.data.language,
        levelId: query.data.level,
      });
      return lessonListResponseSchema.parse({ lessons: lessons.map(toSummaryResponse) });
    });
  });

  app.get(
    "/lessons/:lessonId",
    { config, preHandler: [authenticate, ...lessonGate] },
    async (request, reply) => {
      const params = lessonIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      return privateResponse(reply, mapLessonError, async () => {
        const detail = await useCases.getLesson.execute({
          userId: sessionUserId(request),
          lessonId: params.data.lessonId,
        });
        return toLessonResponse(detail);
      });
    },
  );

  const actionRoute = {
    config,
    bodyLimit: ACTION_BODY_LIMIT_BYTES,
    preHandler: [verifyOrigin, authenticate, ...lessonGate],
  };

  /** The client controls nothing but which lesson: a body naming a user, a time or a status is
   * refused, not silently ignored. */
  function parseAction(request: FastifyRequest) {
    const params = lessonIdParamSchema.safeParse(request.params);
    const body = lessonActionRequestSchema.safeParse(request.body);
    return params.success && body.success ? params.data.lessonId : null;
  }

  app.post("/lessons/:lessonId/start", actionRoute, async (request, reply) => {
    const lessonId = parseAction(request);
    if (lessonId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    return privateResponse(reply, mapLessonError, async () => {
      const progress = await useCases.startLesson.execute({
        userId: sessionUserId(request),
        lessonId,
      });
      request.log.info({ lessonId, status: progress.status }, "Lesson start");
      return toProgressResponse(progress);
    });
  });

  app.post("/lessons/:lessonId/complete", actionRoute, async (request, reply) => {
    const lessonId = parseAction(request);
    if (lessonId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    return privateResponse(reply, mapLessonError, async () => {
      const outcome = await useCases.completeLesson.execute({
        userId: sessionUserId(request),
        lessonId,
        locale: requestLocale(request, achievementTexts),
      });
      // Never the student's id.
      request.log.info(
        {
          lessonId,
          status: outcome.progress.status,
          pointsAwarded: outcome.rewards.pointsAwarded,
          achievementsUnlocked: outcome.rewards.achievementsUnlocked.map((a) => a.key),
        },
        "Lesson complete",
      );
      return toCompletionResponse(outcome);
    });
  });
}
