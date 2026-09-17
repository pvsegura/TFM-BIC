import type { Role, User } from "@tfm-bic/domain";

export interface CreateUserInput {
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  role: Role;
}

/**
 * Owned by this layer, implemented in `packages/data` (Drizzle/Postgres) —
 * see docs/architecture/architecture-overview.md. `create` is expected to
 * throw `DuplicateEmailError` (packages/domain) when the normalized-email
 * uniqueness constraint is violated, translating the database-level
 * constraint into a domain error rather than leaking a driver error.
 */
export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByNormalizedEmail(normalizedEmail: string): Promise<User | null>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
}
