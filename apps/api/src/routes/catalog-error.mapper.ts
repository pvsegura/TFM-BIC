import {
  ContentNotFoundError,
  LanguageNotFoundError,
  LevelNotAvailableError,
} from "@tfm-bic/domain";

export interface MappedCatalogError {
  statusCode: number;
  body: { error: string };
}

/**
 * Translates the domain errors the discovery use cases throw into a safe HTTP
 * response: a fixed message, never the requested id (see
 * docs/security/security-baseline.md). Everything a student cannot see — an
 * unknown or inactive language, an unavailable level, unpublished or missing
 * content — is a 404. An error not recognised here is rethrown for Fastify's
 * central handler (generic 500, logged) rather than guessed at.
 */
export function mapCatalogError(error: unknown): MappedCatalogError {
  if (error instanceof LanguageNotFoundError) {
    return { statusCode: 404, body: { error: "Language not found." } };
  }
  if (error instanceof LevelNotAvailableError) {
    return { statusCode: 404, body: { error: "Level not available." } };
  }
  if (error instanceof ContentNotFoundError) {
    return { statusCode: 404, body: { error: "Content not found." } };
  }
  throw error;
}
