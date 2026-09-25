import { VideoDefinitionNotFoundError, VideoGenerationJobNotFoundError } from "@tfm-bic/domain";

import type { MappedCatalogError } from "./catalog-error.mapper.js";

/**
 * Translates the domain errors the video-generation use cases throw into a safe HTTP response: a
 * fixed message, never the requested id (see docs/security/security-baseline.md).
 *
 * Every reason a definition is not available — missing, draft, its language inactive, its level
 * not available — is the same 404 (`findVisibleVideoDefinition`'s rule), so a caller cannot probe
 * for unpublished content. A job that does not exist and a job that belongs to another student are
 * also the same 404, never a 403 — the IDOR-safe pattern every user-owned resource in this
 * codebase uses.
 *
 * Provider failures are never thrown here at all: `RequestVideoGenerationUseCase` catches them and
 * records the job as `failed`, so a caller only ever learns about a failure by polling
 * `GET /video-generations/:id` — a `200` with `status: "failed"`, never an HTTP error. An error not
 * recognised here is rethrown for Fastify's central handler (generic 500, logged) rather than
 * guessed at.
 */
export function mapVideoGenerationError(error: unknown): MappedCatalogError {
  if (error instanceof VideoDefinitionNotFoundError) {
    return { statusCode: 404, body: { error: "Video definition not found." } };
  }
  if (error instanceof VideoGenerationJobNotFoundError) {
    return { statusCode: 404, body: { error: "Video generation job not found." } };
  }
  throw error;
}
