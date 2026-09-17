import { InvalidTokenError, TokenAlreadyUsedError, TokenExpiredError } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { EmailVerificationTokenRepository } from "../ports/email-verification-token-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface VerifyEmailInput {
  token: string;
}

export class VerifyEmailUseCase {
  constructor(
    private readonly tokenRepository: EmailVerificationTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: VerifyEmailInput): Promise<void> {
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

    await this.userRepository.markEmailVerified(token.userId);
    await this.tokenRepository.markUsed(token.id);
  }
}
