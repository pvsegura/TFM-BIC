import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
  TokenConsumption,
} from "@tfm-bic/application";
import type { PasswordResetToken } from "@tfm-bic/domain";
import { and, eq, gt, isNull } from "drizzle-orm";

import type { IdentityDb } from "./db/client.js";
import { passwordResetTokens } from "./db/schema.js";

function toToken(row: typeof passwordResetTokens.$inferSelect): PasswordResetToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
  };
}

export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly db: IdentityDb) {}

  async create(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    const [row] = await this.db
      .insert(passwordResetTokens)
      .values({ userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt })
      .returning();
    if (!row) {
      throw new Error("Insert into password_reset_tokens returned no row.");
    }
    return toToken(row);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    return row ? toToken(row) : null;
  }

  /**
   * One conditional UPDATE: only an unused, unexpired token is marked, so of two simultaneous
   * calls with the same token exactly one gets it (M16, S-05). A miss is then classified with a
   * read, which changes nothing.
   */
  async consume(tokenHash: string, now: Date): Promise<TokenConsumption<PasswordResetToken>> {
    const [consumed] = await this.db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning();
    if (consumed) {
      return { outcome: "consumed", token: toToken(consumed) };
    }
    const existing = await this.findByTokenHash(tokenHash);
    if (!existing) {
      return { outcome: "not_found" };
    }
    return { outcome: existing.usedAt === null ? "expired" : "already_used" };
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  }
}
