import type { EmailVerificationToken } from "@tfm-bic/domain";

import type { TokenConsumption } from "./token-consumption.js";

export interface CreateEmailVerificationTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface EmailVerificationTokenRepository {
  create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationToken>;
  findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  /** Marks the token used only if it is unused and `expiresAt > now` — atomically. */
  consume(tokenHash: string, now: Date): Promise<TokenConsumption<EmailVerificationToken>>;
  /** Called before issuing a new token, so an old link stops working (resend). */
  invalidateAllForUser(userId: string): Promise<void>;
}
