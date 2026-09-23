import { PhoneticRepresentationNotFoundError } from "@tfm-bic/domain";

import { mapCatalogError, type MappedCatalogError } from "./catalog-error.mapper.js";

/**
 * Translates the domain errors the phonetics use cases throw into a safe HTTP response: a fixed
 * message, never the requested id (see docs/security/security-baseline.md).
 *
 * Every reason a representation is not available — missing, draft, its topic hidden, its level not
 * available — is the same 404, so a caller cannot probe for unpublished content. Unlike vocabulary,
 * progress only ever moves forward and every repeat action is a no-op or an advance — never a
 * refused transition — so there is no 409 to map here.
 *
 * The language/level outcomes are the catalog mapper's. An error not recognised is rethrown for
 * Fastify's central handler (generic 500, logged) rather than guessed at.
 */
export function mapPhoneticsError(error: unknown): MappedCatalogError {
  if (error instanceof PhoneticRepresentationNotFoundError) {
    return { statusCode: 404, body: { error: "Phonetic representation not found." } };
  }
  return mapCatalogError(error);
}
