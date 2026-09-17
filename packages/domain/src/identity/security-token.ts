/**
 * Shared shape for single-use, expiring security tokens (email verification
 * and password reset — see `EmailVerificationToken`/`PasswordResetToken`).
 * Only the hash is stored (`tokenHash`); the raw token is emailed to the
 * user and never persisted or logged.
 */
export interface SecurityToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
}

/** Usable means: not expired, and not already used. */
export function isTokenUsable(token: SecurityToken, now: Date): boolean {
  if (token.usedAt !== null) {
    return false;
  }
  return now.getTime() < token.expiresAt.getTime();
}
