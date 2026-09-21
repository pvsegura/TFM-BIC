import { LessonNotFoundError } from "@tfm-bic/domain";

import { mapCatalogError, type MappedCatalogError } from "./catalog-error.mapper.js";

/**
 * Translates the domain errors the lesson use cases throw into a safe HTTP
 * response: a fixed message, never the requested id (see
 * docs/security/security-baseline.md). Every reason a lesson is not available
 * — missing, unpublished, not a lesson, hidden level — is the same 404, so a
 * caller cannot probe for unpublished content. Language and level filters keep
 * the catalog's outcomes. An error not recognised is rethrown for Fastify's
 * central handler (generic 500, logged) rather than guessed at.
 */
export function mapLessonError(error: unknown): MappedCatalogError {
  if (error instanceof LessonNotFoundError) {
    return { statusCode: 404, body: { error: "Lesson not found." } };
  }
  return mapCatalogError(error);
}
