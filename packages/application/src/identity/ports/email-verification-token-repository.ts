import type { EmailVerificationToken } from "@tfm-bic/domain";

export interface CreateEmailVerificationTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface EmailVerificationTokenRepository {
  create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationToken>;
  findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  markUsed(id: string): Promise<void>;
  /** Called before issuing a new token, so an old link stops working (resend). */
  invalidateAllForUser(userId: string): Promise<void>;
}
