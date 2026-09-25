import type { ResolveSessionUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import type { VideoGenerationJob } from "@tfm-bic/domain";
import {
  requestVideoGenerationRequestSchema,
  videoGenerationJobIdParamSchema,
  videoGenerationJobResponseSchema,
  type VideoGenerationJobResponse,
} from "@tfm-bic/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { VideoUseCases } from "../composition/video-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { mapVideoGenerationError } from "./video-generations-error.mapper.js";
import {
  videoGenerationCreateRateLimit,
  videoGenerationStatusRateLimit,
} from "./video-generations-rate-limit.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/** The request body names only which definition to render; anything bigger than a handful of bytes is rejected (413) before it is parsed. */
const CREATE_BODY_LIMIT_BYTES = 1024;

/** A job's status is per student, so no shared cache (browser, proxy or CDN) may keep any of it. */
function noStore(reply: FastifyReply): void {
  void reply.header("Cache-Control", "private, no-store");
}

/** The student the request is for — always the session's, set by `authenticate`. */
function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  if (!user) {
    // Unreachable: `authenticate` replies 401 before any handler runs. Failing loudly beats
    // carrying on with no identity.
    throw new Error("A video-generation handler ran without an authenticated user.");
  }
  return user.id;
}

function toJobResponse(job: VideoGenerationJob): VideoGenerationJobResponse {
  // Parsed through the allowlisting response schema: only the fields it names — never a
  // provider job reference or the owning user id — can leave the API.
  return videoGenerationJobResponseSchema.parse({
    id: job.id,
    videoDefinitionId: job.videoDefinitionId,
    status: job.status,
    mediaReference: job.mediaReference,
    errorCategory: job.errorCategory,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  });
}

/**
 * Video generation (M11) — authenticated-only. A student requests one of the platform's video
 * definitions be generated; the server renders it through whichever `VideoGenerationService` is
 * configured (ADR-011/012) and tracks the job's lifecycle. The user always comes from the
 * session, never a URL/query/body value, and a job is only ever visible to the student who
 * requested it.
 *
 * - `POST /video-generations` — starts a generation and returns immediately (`201`) with the job
 *   `queued`/`processing`; rendering continues in the background (see
 *   `RequestVideoGenerationUseCase`).
 * - `GET /video-generations/:jobId` — the caller's own job, for polling. Never another student's —
 *   the same `404` for "does not exist" and "exists, but is not yours".
 */
export function registerVideoGenerationRoutes(
  app: FastifyInstance,
  deps: { useCases: VideoUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);

  app.post(
    "/video-generations",
    {
      config: { rateLimit: videoGenerationCreateRateLimit(env) },
      bodyLimit: CREATE_BODY_LIMIT_BYTES,
      preHandler: [verifyOrigin, authenticate],
    },
    async (request, reply) => {
      const body = requestVideoGenerationRequestSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const job = await useCases.requestVideoGeneration.execute({
          userId: sessionUserId(request),
          videoDefinitionId: body.data.videoDefinitionId,
        });
        noStore(reply);
        return reply.code(201).send(toJobResponse(job));
      } catch (error) {
        const mapped = mapVideoGenerationError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.get(
    "/video-generations/:jobId",
    {
      config: { rateLimit: videoGenerationStatusRateLimit(env) },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const params = videoGenerationJobIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const job = await useCases.getVideoGenerationStatus.execute({
          userId: sessionUserId(request),
          jobId: params.data.jobId,
        });
        noStore(reply);
        return toJobResponse(job);
      } catch (error) {
        const mapped = mapVideoGenerationError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
