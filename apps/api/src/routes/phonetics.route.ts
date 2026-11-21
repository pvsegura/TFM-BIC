import type {
  PhoneticListEntry,
  PhoneticListResult,
  PhoneticRepresentationDetail,
  PhoneticTopicsResult,
  PhoneticTopicView,
  PhoneticUserProgressView,
  ResolveSessionUseCase,
} from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import {
  phoneticActionRequestSchema,
  phoneticIdParamSchema,
  phoneticListQuerySchema,
  phoneticListResponseSchema,
  phoneticRepresentationResponseSchema,
  phoneticTopicsQuerySchema,
  phoneticTopicsResponseSchema,
  phoneticUserProgressResponseSchema,
  type PhoneticRepresentationResponse,
  type PhoneticUserProgressResponse,
} from "@verbysia/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";

import type { PhoneticsUseCases } from "../composition/phonetics-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { mapPhoneticsError } from "./phonetics-error.mapper.js";
import { phoneticsReadRateLimit, phoneticsWriteRateLimit } from "./phonetics-rate-limit.js";
import { INVALID_REQUEST, privateResponse, sessionUserId } from "./route-helpers.js";

/** `view`, `practice` and `complete` take no body at all; anything bigger than a handful of bytes
 * is rejected (413) before it is parsed. */
const ACTION_BODY_LIMIT_BYTES = 1024;

function toProgressResponse(progress: PhoneticUserProgressView): PhoneticUserProgressResponse {
  return phoneticUserProgressResponseSchema.parse({
    status: progress.status,
    firstViewedAt: progress.firstViewedAt?.toISOString() ?? null,
    lastViewedAt: progress.lastViewedAt?.toISOString() ?? null,
    practicedAt: progress.practicedAt?.toISOString() ?? null,
    completedAt: progress.completedAt?.toISOString() ?? null,
  });
}

function toRepresentationResponse(entry: {
  representation: PhoneticListEntry["representation"];
  topic: PhoneticListEntry["topic"];
  progress: PhoneticUserProgressView;
}): PhoneticRepresentationResponse {
  // Parsed through the allowlisting response schema: only the fields it names — never a content
  // status, an order, or anything else a domain object might carry — can leave the API.
  return phoneticRepresentationResponseSchema.parse({
    ...entry.representation,
    topic: entry.topic,
    userProgress: toProgressResponse(entry.progress),
  });
}

function toListResponse({ items, total, nextAfter }: PhoneticListResult) {
  return phoneticListResponseSchema.parse({
    items: items.map(toRepresentationResponse),
    total,
    nextAfter,
  });
}

function toTopicResponse(topic: PhoneticTopicView) {
  return {
    id: topic.id,
    languageId: topic.languageId,
    title: topic.title,
    description: topic.description,
    instructionLanguage: topic.instructionLanguage,
    progress: topic.progress,
  };
}

function toTopicsResponse({ topics }: PhoneticTopicsResult) {
  return phoneticTopicsResponseSchema.parse({ topics: topics.map(toTopicResponse) });
}

function toDetailResponse({
  representation,
  topic,
  progress,
}: PhoneticRepresentationDetail): PhoneticRepresentationResponse {
  return toRepresentationResponse({ representation, topic, progress });
}

/**
 * The student phonetics experience (M10) — authenticated-only, and generic: one set of routes for
 * every language. A representation is content, optionally grouped in a topic of its own language;
 * only the student's own progress on it is stored. Independent of Vocabulary: no shared route, no
 * shared identifier.
 *
 * - `GET /phonetics?language=&level=&topic=&status=&limit=&after=` — representations a student may
 *   browse, with their own progress, one page at a time.
 * - `GET /phonetics/topics?language=` — the language's topics with progress per topic and overall.
 * - `GET /phonetics/:phoneticId` — one representation with its topic title and the caller's progress.
 * - `POST /phonetics/:phoneticId/view` — records a view (idempotent; never regresses).
 * - `POST /phonetics/:phoneticId/practice` — records practice (idempotent; never regresses).
 * - `POST /phonetics/:phoneticId/complete` — marks it completed (idempotent; never refused).
 *
 * The user is always the session's, never a URL/query/body value. There is no route that creates,
 * edits or publishes a representation, and none that reads or changes another student's progress.
 */
export function registerPhoneticsRoutes(
  app: FastifyInstance,
  deps: { useCases: PhoneticsUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);
  const readConfig = { config: { rateLimit: phoneticsReadRateLimit(env) } };
  const writeConfig = {
    config: { rateLimit: phoneticsWriteRateLimit(env) },
    bodyLimit: ACTION_BODY_LIMIT_BYTES,
  };

  app.get("/phonetics", { ...readConfig, preHandler: [authenticate] }, async (request, reply) => {
    const query = phoneticListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    return privateResponse(reply, mapPhoneticsError, async () => {
      const result = await useCases.listPhonetics.execute({
        userId: sessionUserId(request),
        languageId: query.data.language,
        levelId: query.data.level,
        topicId: query.data.topic,
        status: query.data.status,
        limit: query.data.limit,
        after: query.data.after,
      });
      return toListResponse(result);
    });
  });

  app.get(
    "/phonetics/topics",
    { ...readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const query = phoneticTopicsQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      return privateResponse(reply, mapPhoneticsError, async () => {
        const result = await useCases.listPhoneticTopics.execute({
          userId: sessionUserId(request),
          languageId: query.data.language,
        });
        return toTopicsResponse(result);
      });
    },
  );

  app.get(
    "/phonetics/:phoneticId",
    { ...readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const params = phoneticIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      return privateResponse(reply, mapPhoneticsError, async () => {
        const detail = await useCases.getPhoneticRepresentation.execute({
          userId: sessionUserId(request),
          phoneticRepresentationId: params.data.phoneticId,
        });
        return toDetailResponse(detail);
      });
    },
  );

  /** The client controls nothing but which representation: a body naming a user, a time or a
   * status is refused, not silently ignored. */
  function parseAction(request: FastifyRequest) {
    const params = phoneticIdParamSchema.safeParse(request.params);
    const body = phoneticActionRequestSchema.safeParse(request.body);
    return params.success && body.success ? params.data.phoneticId : null;
  }

  const actionRoute = { ...writeConfig, preHandler: [verifyOrigin, authenticate] };

  app.post("/phonetics/:phoneticId/view", actionRoute, async (request, reply) => {
    const phoneticRepresentationId = parseAction(request);
    if (phoneticRepresentationId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    return privateResponse(reply, mapPhoneticsError, async () => {
      const progress = await useCases.recordPhoneticView.execute({
        userId: sessionUserId(request),
        phoneticRepresentationId,
      });
      return toProgressResponse(progress);
    });
  });

  app.post("/phonetics/:phoneticId/practice", actionRoute, async (request, reply) => {
    const phoneticRepresentationId = parseAction(request);
    if (phoneticRepresentationId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    return privateResponse(reply, mapPhoneticsError, async () => {
      const progress = await useCases.recordPhoneticPractice.execute({
        userId: sessionUserId(request),
        phoneticRepresentationId,
      });
      return toProgressResponse(progress);
    });
  });

  app.post("/phonetics/:phoneticId/complete", actionRoute, async (request, reply) => {
    const phoneticRepresentationId = parseAction(request);
    if (phoneticRepresentationId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    return privateResponse(reply, mapPhoneticsError, async () => {
      const progress = await useCases.completePhonetic.execute({
        userId: sessionUserId(request),
        phoneticRepresentationId,
      });
      return toProgressResponse(progress);
    });
  });
}
