import type {
  AchievementTexts,
  ExerciseDetail,
  ExerciseResultView,
  ExerciseSummary,
  LessonExercises,
  ResolveSessionUseCase,
  SubmitExerciseAnswerWithRewardsResult,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  exerciseAnswerRequestSchema,
  exerciseAnswerResponseSchema,
  exerciseIdParamSchema,
  exerciseListResponseSchema,
  exerciseResponseSchema,
  exerciseResultResponseSchema,
  lessonIdParamSchema,
  type ExerciseResultResponse,
} from "@tfm-bic/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { ExerciseUseCases } from "../composition/exercise-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { mapExerciseError } from "./exercise-error.mapper.js";
import { exerciseAnswerRateLimit, exerciseReadRateLimit } from "./exercise-rate-limit.js";
import { requestLocale } from "./interface-locale.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/** An answer is at most a few hundred characters of text; anything bigger is rejected (413)
 * before it is parsed. */
const ANSWER_BODY_LIMIT_BYTES = 2048;

/** Results are per student, so no shared cache (browser, proxy or CDN) may keep any of it. */
function noStore(reply: FastifyReply): void {
  void reply.header("Cache-Control", "private, no-store");
}

/** The student the request is for — always the session's, set by `authenticate`. */
function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  if (!user) {
    // Unreachable: `authenticate` replies 401 before any handler runs. Failing loudly beats
    // carrying on with no identity.
    throw new Error("An exercise handler ran without an authenticated user.");
  }
  return user.id;
}

function toResultResponse(result: ExerciseResultView): ExerciseResultResponse {
  return exerciseResultResponseSchema.parse({
    status: result.status,
    attemptCount: result.attemptCount,
    lastAnsweredAt: result.lastAnsweredAt?.toISOString() ?? null,
  });
}

function toSummaryResponse(exercise: ExerciseSummary) {
  return {
    id: exercise.id,
    lessonId: exercise.lessonId,
    languageId: exercise.languageId,
    levelId: exercise.levelId,
    type: exercise.type,
    order: exercise.order,
    prompt: exercise.prompt,
    instructionLanguage: exercise.instructionLanguage,
    result: toResultResponse(exercise.result),
  };
}

function toListResponse({ exercises, progress }: LessonExercises) {
  return exerciseListResponseSchema.parse({
    exercises: exercises.map(toSummaryResponse),
    progress,
  });
}

function toExerciseResponse({ exercise, result }: ExerciseDetail) {
  // Parsed through the allowlisting response schema: even if a presenter one day returned more
  // than a student may see, nothing outside the presentation shape can be serialised.
  return exerciseResponseSchema.parse({ ...exercise, result: toResultResponse(result) });
}

function toAnswerResponse({ evaluation, result, rewards }: SubmitExerciseAnswerWithRewardsResult) {
  return exerciseAnswerResponseSchema.parse({
    correct: evaluation.correct,
    feedback: evaluation.feedback,
    correctAnswer: evaluation.correctAnswer,
    result: toResultResponse(result),
    rewards,
  });
}

/**
 * The student exercise experience (M7) — authenticated-only, and generic: one set
 * of routes for every language, level and exercise type. Exercises are content
 * (validated files, like lessons); only the student's attempts are stored.
 *
 * - `GET /lessons/:lessonId/exercises` — the lesson's exercises in order, with the
 *   caller's results. No options, no answer key.
 * - `GET /exercises/:exerciseId` — one exercise as a student may see it *before*
 *   answering (its type's presentation), plus the caller's result.
 * - `POST /exercises/:exerciseId/answer` — the caller's answer. The server picks the
 *   evaluator from the exercise's own type, judges the answer, appends an attempt and
 *   returns the verdict — plus, for a correct answer, what it earned (M8: the first correct
 *   answer to an exercise is rewarded once; a repeat earns nothing).
 *
 * The user is always the session's, never a URL/query/body value; the client sends an
 * answer and nothing else. There is no route that creates, edits or publishes an
 * exercise, and none reads or changes another student's attempts.
 */
export function registerExerciseRoutes(
  app: FastifyInstance,
  deps: {
    useCases: ExerciseUseCases;
    resolveSession: ResolveSessionUseCase;
    env: AppEnv;
    achievementTexts: AchievementTexts;
  },
): void {
  const { useCases, resolveSession, env, achievementTexts } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);
  const readConfig = { rateLimit: exerciseReadRateLimit(env) };
  const answerConfig = { rateLimit: exerciseAnswerRateLimit(env) };

  app.get(
    "/lessons/:lessonId/exercises",
    { config: readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const params = lessonIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const listed = await useCases.listLessonExercises.execute({
          userId: sessionUserId(request),
          lessonId: params.data.lessonId,
        });
        noStore(reply);
        return toListResponse(listed);
      } catch (error) {
        const mapped = mapExerciseError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.get(
    "/exercises/:exerciseId",
    { config: readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const params = exerciseIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const detail = await useCases.getExercise.execute({
          userId: sessionUserId(request),
          exerciseId: params.data.exerciseId,
        });
        noStore(reply);
        return toExerciseResponse(detail);
      } catch (error) {
        const mapped = mapExerciseError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post(
    "/exercises/:exerciseId/answer",
    {
      config: answerConfig,
      bodyLimit: ANSWER_BODY_LIMIT_BYTES,
      preHandler: [verifyOrigin, authenticate],
    },
    async (request, reply) => {
      const params = exerciseIdParamSchema.safeParse(request.params);
      // The client controls nothing but which exercise and what its answer is: a body naming a
      // verdict, a user, a score or a time is refused, not silently ignored.
      const body = exerciseAnswerRequestSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const outcome = await useCases.submitAnswer.execute({
          userId: sessionUserId(request),
          exerciseId: params.data.exerciseId,
          answer: body.data.answer,
          locale: requestLocale(request, achievementTexts),
        });
        // Never the submitted answer (the student's own text) or their id.
        request.log.info(
          {
            exerciseId: params.data.exerciseId,
            correct: outcome.evaluation.correct,
            pointsAwarded: outcome.rewards.pointsAwarded,
            achievementsUnlocked: outcome.rewards.achievementsUnlocked.map((a) => a.key),
          },
          "Exercise answered",
        );
        noStore(reply);
        return toAnswerResponse(outcome);
      } catch (error) {
        const mapped = mapExerciseError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
