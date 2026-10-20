import type { CoachContextInput, ResolveSessionUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  coachMessageRequestSchema,
  coachMessageResponseSchema,
  coachStatusQuerySchema,
  coachStatusResponseSchema,
  type CoachContextRef,
} from "@tfm-bic/contracts";
import { COACH_MESSAGE_MAX_LENGTH, COACH_MODES, createLanguageId } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";

import type { CoachUseCases } from "../composition/coach-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { mapCoachError } from "./coach-error.mapper.js";
import {
  coachMessageAddressRateLimit,
  coachMessageUserRateLimit,
  coachStatusRateLimit,
} from "./coach-rate-limit.js";
import { INVALID_REQUEST, noStore, sessionUserId } from "./route-helpers.js";

/**
 * A coaching turn carries a message and a replayed transcript, so it needs more than an action
 * route's kilobyte — but far less than the API's default. The contract already caps the message
 * (1,000 characters) and the history (12 turns × 2,000), which this comfortably covers while
 * refusing anything larger before it is parsed.
 */
const MESSAGE_BODY_LIMIT_BYTES = 64 * 1024;

/** The contract's discriminated union, as the application's own input type. */
function toContextInput(context: CoachContextRef | undefined): CoachContextInput | undefined {
  if (!context) return undefined;
  switch (context.type) {
    case "lesson":
      return { type: "lesson", lessonId: context.lessonId };
    case "video":
      return { type: "video", lessonId: context.lessonId };
    case "exercise":
      return { type: "exercise", exerciseId: context.exerciseId };
    case "vocabulary-item":
      return { type: "vocabulary-item", vocabularyItemId: context.vocabularyItemId };
    case "phonetic":
      return { type: "phonetic", phoneticId: context.phoneticId };
  }
}

/**
 * The AI Learning Coach (M23, ADR-034) — two authenticated routes, and nothing else.
 *
 * - `GET /ai-coach/status` — whether the coach is enabled here, so the page can say so before a
 *   learner types a question into something that cannot answer.
 * - `POST /ai-coach/messages` — one coaching turn: a message, the mode, the language, and the
 *   conversation so far. Answers with the coach's reply, which tools were consulted, and any
 *   practice activity the model proposed and the server validated.
 *
 * What a client can and cannot decide is the whole point of this file:
 *
 * - **The learner is the session's**, never a body field. The request schema is strict and has no
 *   `userId`/`studentId` to send; a body that carries one is a `400`, not a silent ignore.
 * - **The level is derived by the application** (`resolveCoachContext`), not accepted from the
 *   client — a learner cannot talk the coach into treating them as C2.
 * - **A context id is re-authorised** through the same use case the corresponding page uses.
 * - **No prompt, model, provider, temperature or tool list crosses the wire.** Those are server
 *   configuration (`AI_COACH_*`) and a versioned instruction module.
 * - The conversation is **not stored** (ADR-034, decision 5): the transcript lives in the browser,
 *   is replayed here, is normalised to learner/coach text by the domain, and is gone when the tab
 *   closes. There is no conversation id and no history endpoint because there is nothing to read.
 */
export function registerCoachRoutes(
  app: FastifyInstance,
  deps: {
    useCases: CoachUseCases;
    resolveSession: ResolveSessionUseCase;
    env: AppEnv;
  },
): void {
  const { useCases, resolveSession, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);

  app.get(
    "/ai-coach/status",
    { config: { rateLimit: coachStatusRateLimit(env) }, preHandler: [authenticate] },
    async (request, reply) => {
      const query = coachStatusQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      // With a language, the page is told the same course context the coach will be given.
      const learner = query.data.language
        ? await useCases.getLearner.execute({
            userId: sessionUserId(request),
            language: query.data.language,
          })
        : null;

      noStore(reply);
      return coachStatusResponseSchema.parse({
        available: useCases.enabled,
        modes: [...COACH_MODES],
        maxMessageLength: COACH_MESSAGE_MAX_LENGTH,
        learner,
      });
    },
  );

  app.post(
    "/ai-coach/messages",
    {
      config: { rateLimit: coachMessageAddressRateLimit(env) },
      bodyLimit: MESSAGE_BODY_LIMIT_BYTES,
      // Origin first (state-changing in the M16 sense: it spends money), then the session, then
      // the per-user limit — which needs `currentUser`, so it must run after `authenticate`.
      preHandler: [verifyOrigin, authenticate, coachMessageUserRateLimit(app, env)],
    },
    async (request, reply) => {
      const body = coachMessageRequestSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      let languageId;
      try {
        languageId = createLanguageId(body.data.language);
      } catch {
        return reply.code(400).send(INVALID_REQUEST);
      }

      const userId = sessionUserId(request);
      try {
        const resolved = await useCases.resolveContext({
          userId,
          languageId,
          context: toContextInput(body.data.context),
        });

        const result = await useCases.askCoach.execute({
          userId,
          languageId,
          levelId: resolved.levelId,
          mode: body.data.mode,
          message: body.data.message,
          history: body.data.history,
          context: resolved.context,
        });

        // M18/ADR-029: one line per turn, safe metadata only — which mode, which tools ran, which
        // instruction version, how many tokens it cost and whether an activity was produced.
        // Never the message, the answer, a tool argument, a tool result or the learner's id.
        request.log.info(
          {
            mode: body.data.mode,
            toolsUsed: result.toolsUsed,
            toolCallCount: result.toolsUsed.length,
            instructionsVersion: result.instructionsVersion,
            inputTokens: result.usage?.inputTokens,
            outputTokens: result.usage?.outputTokens,
            practiceProposed: result.practice !== undefined,
            historyTurns: body.data.history.length,
          },
          "ai_coach.turn_completed",
        );

        noStore(reply);
        // Parsed through the allowlisting response schema: the instructions version, the token
        // usage and anything else the result carries for logs and metrics cannot reach the browser.
        return coachMessageResponseSchema.parse({
          answer: result.answer,
          mode: body.data.mode,
          toolsUsed: [...result.toolsUsed],
          practice: result.practice ?? null,
        });
      } catch (error) {
        const mapped = mapCoachError(error);
        if (mapped.retryAfterSeconds !== undefined) {
          void reply.header("Retry-After", String(mapped.retryAfterSeconds));
        }
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
