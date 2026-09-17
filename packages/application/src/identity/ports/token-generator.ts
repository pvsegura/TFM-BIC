/**
 * One port reused for session tokens, email-verification tokens, and
 * password-reset tokens (same CSPRNG-generation + hash-at-rest scheme for
 * all three, see ADR-006) — avoids three near-identical abstractions.
 */
export interface TokenGenerator {
  /** A CSPRNG-generated, URL-safe raw token — never persisted as-is. */
  generate(): string;
  /** Deterministic one-way hash of a raw token, for storage/lookup. */
  hash(token: string): string;
}
