import type {
  CreateEmailVerificationTokenInput,
  EmailVerificationTokenRepository,
} from "@tfm-bic/application";
import type { EmailVerificationToken } from "@tfm-bic/domain";
import { and, eq, isNull } from "drizzle-orm";

import type { IdentityDb } from "./db/client.js";
import { emailVerificationTokens } from "./db/schema.js";

function toToken(row: typeof emailVerificationTokens.$inferSelect): EmailVerificationToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
  };
}

export class DrizzleEmailVerificationTokenRepository implements EmailVerificationTokenRepository {
  constructor(private readonly db: IdentityDb) {}

  async create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationToken> {
    const [row] = await this.db
      .insert(emailVerificationTokens)
      .values({ userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt })
      .returning();
    if (!row) {
      throw new Error("Insert into email_verification_tokens returned no row.");
    }
    return toToken(row);
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    const [row] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash));
    return row ? toToken(row) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id));
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)),
      );
  }
}
