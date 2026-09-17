/**
 * Argon2id in `packages/data` (ADR-006) — the domain/application layers
 * never import a hashing library directly, only this interface.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(hash: string, plainPassword: string): Promise<boolean>;
}
