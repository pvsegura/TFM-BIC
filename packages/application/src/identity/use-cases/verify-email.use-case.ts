import type { Clock } from "../../ports/clock.js";
import type { EmailVerificationTokenRepository } from "../ports/email-verification-token-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";
import { requireConsumedToken } from "../require-consumed-token.js";

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

  /** The token is consumed atomically first (M16): of two simultaneous uses, one wins. */
  async execute(input: VerifyEmailInput): Promise<void> {
    const tokenHash = this.tokenGenerator.hash(input.token);
    const token = requireConsumedToken(
      await this.tokenRepository.consume(tokenHash, this.clock.now()),
    );

    await this.userRepository.markEmailVerified(token.userId);
  }
}
