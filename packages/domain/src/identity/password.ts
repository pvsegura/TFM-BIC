import { WeakPasswordError } from "./errors/weak-password.error.js";

/**
 * Password policy (documented per M3 brief — "password requirements must be
 * reasonable and documented; do not impose arbitrary complexity rules such
 * as mandatory uppercase/symbol combinations unless justified"). Only a
 * length range is enforced:
 * - Minimum 8 characters — current OWASP ASVS/NIST guidance minimum for
 *   user-chosen passwords, deliberately not paired with composition rules
 *   (composition rules push users toward predictable patterns without a
 *   proven security benefit).
 * - Maximum 128 characters — not a security requirement on its own, but
 *   bounds the input fed to the password hasher (Argon2id's cost scales
 *   with input size) as a cheap guard against a trivial DoS via extremely
 *   long inputs to a deliberately slow hashing function.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH;
}

/**
 * Validates a plaintext password candidate against the policy above. This
 * is not hashing — see the `PasswordHasher` port (packages/application) and
 * its `packages/data` adapter for that.
 */
export function createPassword(value: string): string {
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`must be at most ${MAX_PASSWORD_LENGTH} characters long.`);
  }
  return value;
}
