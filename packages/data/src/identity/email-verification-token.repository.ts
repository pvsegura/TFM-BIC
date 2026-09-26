import type {
  CreateEmailVerificationTokenInput,
  EmailVerificationTokenRepository,
  TokenConsumption,
} from "@tfm-bic/application";
import type { EmailVerificationToken } from "@tfm-bic/domain";
import { and, eq, gt, isNull } from "drizzle-orm";

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

  /**
   * One conditional UPDATE: only an unused, unexpired token is marked, so of two simultaneous
   * calls with the same token exactly one gets it (M16, S-05). A miss is then classified with a
   * read, which changes nothing.
   */
  async consume(tokenHash: string, now: Date): Promise<TokenConsumption<EmailVerificationToken>> {
    const [consumed] = await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now),
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
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)),
      );
  }
}
