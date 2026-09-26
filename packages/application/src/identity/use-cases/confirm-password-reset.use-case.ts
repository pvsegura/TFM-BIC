import { createPassword } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { PasswordResetTokenRepository } from "../ports/password-reset-token-repository.js";
import type { SessionRepository } from "../ports/session-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";
import { requireConsumedToken } from "../require-consumed-token.js";

export interface ConfirmPasswordResetInput {
  token: string;
  newPassword: string;
}

/**
 * On success: updates the password, consumes the token, and revokes every
 * existing session for the user (M3 brief: "invalidate appropriate existing
 * sessions" after a reset) — the attacker's old session, if any, stops
 * working immediately.
 *
 * Order (M16, S-05): the new password is checked against the policy first (a weak one leaves the
 * token usable), then the token is consumed atomically — so two simultaneous requests cannot both
 * use it, and a failure after this point cannot be replayed with the same link (the user asks for
 * a new one) — and only then is anything changed.
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
    const password = createPassword(input.newPassword);
    const tokenHash = this.tokenGenerator.hash(input.token);
    const token = requireConsumedToken(
      await this.tokenRepository.consume(tokenHash, this.clock.now()),
    );

    const passwordHash = await this.passwordHasher.hash(password);
    await this.userRepository.updatePasswordHash(token.userId, passwordHash);
    await this.sessionRepository.revokeAllForUser(token.userId);
  }
}
