import { randomUUID } from "node:crypto";

import type { ResolveSessionUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import { audioGenerationRequestSchema } from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";

import type { AudioUseCases } from "../composition/audio-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { audioGenerationFailureLog, audioGenerationSuccessLog } from "./audio-generation-log.js";
import { mapAudioGenerationError } from "./audio-generations-error.mapper.js";
import { audioGenerationRateLimit } from "./audio-generations-rate-limit.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/** The body only names content, a part and a profile; anything larger is rejected (413) unparsed. */
const BODY_LIMIT_BYTES = 1024;

/**
 * Audio generation (M12, ADR-013) — authenticated-only. A student asks to hear a piece of content
 * (today: a vocabulary entry's word or example sentence); the server reads the text from the
 * catalog, generates speech through whichever `AudioGenerationService` is configured, and answers
 * with the clip itself.
 *
 * - `POST /audio-generations` → `200 audio/wav`. Synchronous: the verified provider returns the
 *   whole clip in one response, so there is no job to poll and nothing is persisted.
 *
 * The client never sends the text, a user id, a provider or a model (the request schema is strict).
 * Any signed-in student may hear any content they can see — the same visibility rule as reading
 * it; nothing about the student is sent to the provider.
 */
export function registerAudioGenerationRoutes(
  app: FastifyInstance,
  deps: { useCases: AudioUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);

  app.post(
    "/audio-generations",
    {
      config: { rateLimit: audioGenerationRateLimit(env) },
      bodyLimit: BODY_LIMIT_BYTES,
      preHandler: [verifyOrigin, authenticate],
    },
    async (request, reply) => {
      const body = audioGenerationRequestSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      const { source, voice } = body.data;
      const context = { generationId: randomUUID(), source, voice };
      const startedAt = performance.now();
      const elapsed = () => Math.round(performance.now() - startedAt);

      try {
        const result = await useCases.generateVocabularyAudio.execute({
          vocabularyItemId: source.vocabularyItemId,
          part: source.part,
          voice,
        });
        request.log.info(
          audioGenerationSuccessLog({ ...context, result, durationMs: elapsed() }),
          "Audio generated",
        );
        return reply
          .code(200)
          .header("Content-Type", result.audio.format)
          .header("Cache-Control", "private, no-store")
          .header("X-Content-Type-Options", "nosniff")
          .send(Buffer.from(result.audio.data));
      } catch (error) {
        request.log.warn(
          audioGenerationFailureLog({ ...context, error, durationMs: elapsed() }),
          "Audio generation failed",
        );
        const mapped = mapAudioGenerationError(error);
        if (mapped.retryAfterSeconds !== undefined) {
          void reply.header("Retry-After", String(mapped.retryAfterSeconds));
        }
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
