import type { PasswordResetToken } from "@tfm-bic/domain";

import type { TokenConsumption } from "./token-consumption.js";

export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetTokenRepository {
  create(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  /** Marks the token used only if it is unused and `expiresAt > now` — atomically. */
  consume(tokenHash: string, now: Date): Promise<TokenConsumption<PasswordResetToken>>;
  invalidateAllForUser(userId: string): Promise<void>;
}
