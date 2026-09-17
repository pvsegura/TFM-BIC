import type { CreateUserInput, UserRepository } from "@tfm-bic/application";
import { DuplicateEmailError, type User } from "@tfm-bic/domain";
import { eq } from "drizzle-orm";

import type { IdentityDb } from "./db/client.js";
import { users } from "./db/schema.js";

const UNIQUE_VIOLATION = "23505"; // Postgres standard error code.

function pgErrorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error) {
    return error.code;
  }
  // drizzle-orm wraps the driver error as `DrizzleQueryError`, with the
  // real `pg` error (carrying `.code`) on `.cause`.
  if ("cause" in error) {
    return pgErrorCode(error.cause);
  }
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === UNIQUE_VIOLATION;
}

function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    normalizedEmail: row.normalizedEmail,
    passwordHash: row.passwordHash,
    role: row.role,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: IdentityDb) {}

  async create(input: CreateUserInput): Promise<User> {
    try {
      const [row] = await this.db
        .insert(users)
        .values({
          email: input.email,
          normalizedEmail: input.normalizedEmail,
          passwordHash: input.passwordHash,
          role: input.role,
        })
        .returning();
      if (!row) {
        throw new Error("Insert into users returned no row.");
      }
      return toUser(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    return row ? toUser(row) : null;
  }

  async findByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.normalizedEmail, normalizedEmail));
    return row ? toUser(row) : null;
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
