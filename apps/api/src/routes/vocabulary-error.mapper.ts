import { InvalidVocabularyTransitionError, VocabularyItemNotFoundError } from "@tfm-bic/domain";

import { mapCatalogError, type MappedCatalogError } from "./catalog-error.mapper.js";

/**
 * Translates the domain errors the vocabulary use cases throw into a safe HTTP response: a fixed
 * message, never the requested id or the student's current status (see
 * docs/security/security-baseline.md).
 *
 * - Every reason an entry is not available — missing, draft, archived, its category hidden, its
 *   level not available — is the same 404, so a caller cannot probe for unpublished content.
 * - A status change `evaluateStatusChange` refuses (any backward step but `learned` → `learning`)
 *   is a 409: a legitimate request the student's *current* state makes invalid, not a malformed
 *   one.
 *
 * The language/level outcomes are the catalog mapper's. An error not recognised is rethrown for
 * Fastify's central handler (generic 500, logged) rather than guessed at.
 */
export function mapVocabularyError(error: unknown): MappedCatalogError {
  if (error instanceof VocabularyItemNotFoundError) {
    return { statusCode: 404, body: { error: "Vocabulary item not found." } };
  }
  if (error instanceof InvalidVocabularyTransitionError) {
    return { statusCode: 409, body: { error: "Invalid vocabulary status change." } };
  }
  return mapCatalogError(error);
}
