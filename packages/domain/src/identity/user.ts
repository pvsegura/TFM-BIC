import type { Role } from "./role.js";

/**
 * Root identity record (M3 brief's "USER MODEL" — minimum fields required
 * for authentication only; profile fields like name/nickname/avatar belong
 * to the Student/Teacher Profile context, not here — see
 * docs/architecture/domain-model.md).
 */
export interface User {
  readonly id: string;
  /** Trimmed, original-cased address, for display. */
  readonly email: string;
  /** Normalized (trimmed + lowercased) — the uniqueness/lookup key. */
  readonly normalizedEmail: string;
  /** Opaque Argon2id hash — never the plaintext password. */
  readonly passwordHash: string;
  readonly role: Role;
  readonly emailVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** The only fields ever safe to send to a client — see ADR-006. */
export interface SafeUser {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly emailVerified: boolean;
}

/**
 * Strips everything that must never leave the server (password hash,
 * normalized email, timestamps) — the single place this mapping happens,
 * so no route/use case can accidentally serialize a full `User`.
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}
