import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
} from "@tfm-bic/application";
import type { PasswordResetToken } from "@tfm-bic/domain";
import { and, eq, isNull } from "drizzle-orm";

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

  async markUsed(id: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  }
}
