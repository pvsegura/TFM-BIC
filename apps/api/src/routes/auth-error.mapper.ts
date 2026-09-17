import {
  DuplicateEmailError,
  ForbiddenError,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidTokenError,
  TokenAlreadyUsedError,
  TokenExpiredError,
  WeakPasswordError,
} from "@tfm-bic/domain";

export interface MappedAuthError {
  statusCode: number;
  body: { error: string };
}

/**
 * Translates the domain errors the Identity use cases throw into safe HTTP
 * responses — no stack traces, no internal details, generic-but-distinct
 * messages per error kind (see docs/security/security-baseline.md). An
 * error not recognized here is rethrown for Fastify's central error
 * handler (500, logged, generic body) rather than guessed at.
 */
export function mapAuthError(error: unknown): MappedAuthError {
  if (error instanceof InvalidEmailError) {
    return { statusCode: 400, body: { error: "Not a valid email address." } };
  }
  if (error instanceof WeakPasswordError) {
    return { statusCode: 400, body: { error: error.message } };
  }
  if (error instanceof InvalidCredentialsError) {
    return { statusCode: 401, body: { error: "Invalid email or password." } };
  }
  if (error instanceof InvalidTokenError) {
    return { statusCode: 400, body: { error: "This link is invalid." } };
  }
  if (error instanceof TokenExpiredError) {
    return { statusCode: 400, body: { error: "This link has expired." } };
  }
  if (error instanceof TokenAlreadyUsedError) {
    return { statusCode: 400, body: { error: "This link has already been used." } };
  }
  if (error instanceof ForbiddenError) {
    return { statusCode: 403, body: { error: "Forbidden" } };
  }
  if (error instanceof DuplicateEmailError) {
    // Not expected to reach here in practice — RegisterUserUseCase catches
    // this itself and still returns its generic success response (see
    // ADR-006). Mapped anyway so this error type is never accidentally
    // treated as an unknown 500 if that invariant ever changes.
    return { statusCode: 409, body: { error: "An account with this email already exists." } };
  }
  throw error;
}
