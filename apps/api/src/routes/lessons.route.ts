import type {
  AchievementTexts,
  CompleteLessonWithRewardsResult,
  LessonDetail,
  LessonProgressView,
  LessonSummary,
  ResolveSessionUseCase,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  lessonActionRequestSchema,
  lessonCompletionResponseSchema,
  lessonIdParamSchema,
  lessonListQuerySchema,
  lessonListResponseSchema,
  lessonProgressResponseSchema,
  lessonResponseSchema,
  type LessonProgressResponse,
} from "@tfm-bic/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { LessonUseCases } from "../composition/lesson-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { requestLocale } from "./interface-locale.js";
import { mapLessonError } from "./lesson-error.mapper.js";
import { lessonRateLimit } from "./lesson-rate-limit.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/** `start` and `complete` take no input, so nothing legitimate needs more than a
 * few bytes; anything bigger is rejected (413) before it is parsed. */
const ACTION_BODY_LIMIT_BYTES = 1024;

/** Progress is per student, so no shared cache (browser, proxy or CDN) may keep it. */
function noStore(reply: FastifyReply): void {
  void reply.header("Cache-Control", "private, no-store");
}

/** The student the request is for — always the session's, set by `authenticate`. */
function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  if (!user) {
    // Unreachable: `authenticate` replies 401 before any handler runs. Failing
    // loudly beats carrying on with no identity.
    throw new Error("A lesson handler ran without an authenticated user.");
  }
  return user.id;
}

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
    achievementTexts: AchievementTexts;
  },
): void {
  const { useCases, resolveSession, env, achievementTexts } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);
  const config = { rateLimit: lessonRateLimit(env) };

  app.get("/lessons", { config, preHandler: [authenticate] }, async (request, reply) => {
    const query = lessonListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const lessons = await useCases.listLessons.execute({
        userId: sessionUserId(request),
        languageId: query.data.language,
        levelId: query.data.level,
      });
      noStore(reply);
      return lessonListResponseSchema.parse({ lessons: lessons.map(toSummaryResponse) });
    } catch (error) {
      const mapped = mapLessonError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });

  app.get("/lessons/:lessonId", { config, preHandler: [authenticate] }, async (request, reply) => {
    const params = lessonIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const detail = await useCases.getLesson.execute({
        userId: sessionUserId(request),
        lessonId: params.data.lessonId,
      });
      noStore(reply);
      return toLessonResponse(detail);
    } catch (error) {
      const mapped = mapLessonError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });

  const actionRoute = {
    config,
    bodyLimit: ACTION_BODY_LIMIT_BYTES,
    preHandler: [verifyOrigin, authenticate],
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

    try {
      const progress = await useCases.startLesson.execute({
        userId: sessionUserId(request),
        lessonId,
      });
      request.log.info({ lessonId, status: progress.status }, "Lesson start");
      noStore(reply);
      return toProgressResponse(progress);
    } catch (error) {
      const mapped = mapLessonError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });

  app.post("/lessons/:lessonId/complete", actionRoute, async (request, reply) => {
    const lessonId = parseAction(request);
    if (lessonId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
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
      noStore(reply);
      return toCompletionResponse(outcome);
    } catch (error) {
      const mapped = mapLessonError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });
}
