import {
  createPassword,
  InvalidTokenError,
  TokenAlreadyUsedError,
  TokenExpiredError,
} from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { PasswordResetTokenRepository } from "../ports/password-reset-token-repository.js";
import type { SessionRepository } from "../ports/session-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface ConfirmPasswordResetInput {
  token: string;
  newPassword: string;
}

/**
 * On success: updates the password, consumes the token, and revokes every
 * existing session for the user (M3 brief: "invalidate appropriate existing
 * sessions" after a reset) — the attacker's old session, if any, stops
 * working immediately.
 */
export class ConfirmPasswordResetUseCase {
  constructor(
    private readonly tokenRepository: PasswordResetTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: ConfirmPasswordResetInput): Promise<void> {
    const tokenHash = this.tokenGenerator.hash(input.token);
    const token = await this.tokenRepository.findByTokenHash(tokenHash);

    if (!token) {
      throw new InvalidTokenError();
    }
    if (token.usedAt !== null) {
      throw new TokenAlreadyUsedError();
    }
    if (this.clock.now().getTime() >= token.expiresAt.getTime()) {
      throw new TokenExpiredError();
    }

    const password = createPassword(input.newPassword);
    const passwordHash = await this.passwordHasher.hash(password);

    await this.userRepository.updatePasswordHash(token.userId, passwordHash);
    await this.tokenRepository.markUsed(token.id);
    await this.sessionRepository.revokeAllForUser(token.userId);
  }
}
