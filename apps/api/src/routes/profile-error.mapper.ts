import {
  InvalidAvatarIdError,
  InvalidNicknameError,
  InvalidProfileNameError,
} from "@tfm-bic/domain";

export interface MappedProfileError {
  statusCode: number;
  body: { error: string };
}

/**
 * Translates the domain errors the profile use cases throw into a safe HTTP
 * response — a generic message, never the rejected input (see
 * docs/security/security-baseline.md). The request contract normally rejects
 * these inputs first; this is the independent second check's failure path. An
 * error not recognized here is rethrown for Fastify's central error handler
 * (500, logged, generic body) rather than guessed at.
 */
export function mapProfileError(error: unknown): MappedProfileError {
  if (
    error instanceof InvalidProfileNameError ||
    error instanceof InvalidNicknameError ||
    error instanceof InvalidAvatarIdError
  ) {
    return { statusCode: 400, body: { error: "Invalid profile data." } };
  }
  throw error;
}
