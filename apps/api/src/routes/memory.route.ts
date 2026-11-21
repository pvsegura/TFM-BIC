import type { MemoryCardView, ResolveSessionUseCase } from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import {
  memoryCardResponseSchema,
  memoryReviewRequestSchema,
  memoryReviewResponseSchema,
  memorySessionQuerySchema,
  memorySessionResponseSchema,
  memoryStatsQuerySchema,
  memoryStatsResponseSchema,
} from "@verbysia/contracts";
import type { FastifyInstance } from "fastify";

import type { CommerceUseCases } from "../composition/verbysia-dependencies.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { INVALID_REQUEST, privateResponse, sessionUserId } from "./route-helpers.js";
import { vocabularyReadRateLimit, vocabularyWriteRateLimit } from "./vocabulary-rate-limit.js";
import { mapVocabularyError } from "./vocabulary-error.mapper.js";

const REVIEW_BODY_LIMIT_BYTES = 1024;
const DEFAULT_SESSION_SIZE = 20;

function toCard(card: MemoryCardView) {
  return memoryCardResponseSchema.parse({ ...card, dueAt: card.dueAt?.toISOString() ?? null });
}

/**
 * The PUENTE memory trainer (spaced repetition, SM-2). Authenticated only; the learner is always
 * the session's. Free vocabulary is open to everyone signed in; course vocabulary needs a licence,
 * checked on the server for every session, review and statistic.
 *
 * - `GET /memory/session?language=&limit=` — due cards first, then a few new words.
 * - `POST /memory/reviews` — one answer `{ vocabularyItemId, grade, clientReviewId, usedHint }`;
 *   idempotent per `clientReviewId`, so a retry after a dropped connection is counted once.
 * - `GET /memory/stats?language=` — totals, retention, streak and a 7-day forecast.
 */
export function registerMemoryRoutes(
  app: FastifyInstance,
  deps: { useCases: CommerceUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const authenticate = createAuthenticateHook(resolveSession);
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const readConfig = { config: { rateLimit: vocabularyReadRateLimit(env) } };

  app.get(
    "/memory/session",
    { ...readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const query = memorySessionQuerySchema.safeParse(request.query);
      if (!query.success) return reply.code(400).send(INVALID_REQUEST);

      return privateResponse(reply, mapVocabularyError, async () => {
        const session = await useCases.memorySession.execute({
          userId: sessionUserId(request),
          languageId: query.data.language,
          limit: query.data.limit ?? DEFAULT_SESSION_SIZE,
        });
        return memorySessionResponseSchema.parse({ ...session, cards: session.cards.map(toCard) });
      });
    },
  );

  app.post(
    "/memory/reviews",
    {
      config: { rateLimit: vocabularyWriteRateLimit(env) },
      bodyLimit: REVIEW_BODY_LIMIT_BYTES,
      preHandler: [verifyOrigin, authenticate],
    },
    async (request, reply) => {
      const body = memoryReviewRequestSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send(INVALID_REQUEST);

      return privateResponse(reply, mapVocabularyError, async () => {
        const result = await useCases.memoryReview.execute({
          userId: sessionUserId(request),
          ...body.data,
        });
        return memoryReviewResponseSchema.parse({ ...result, card: toCard(result.card) });
      });
    },
  );

  app.get(
    "/memory/stats",
    { ...readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const query = memoryStatsQuerySchema.safeParse(request.query);
      if (!query.success) return reply.code(400).send(INVALID_REQUEST);

      return privateResponse(reply, mapVocabularyError, async () =>
        memoryStatsResponseSchema.parse(
          await useCases.memoryStats.execute({
            userId: sessionUserId(request),
            languageId: query.data.language,
          }),
        ),
      );
    },
  );
}
