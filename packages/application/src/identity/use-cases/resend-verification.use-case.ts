import { normalizeEmail } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { EmailVerificationTokenRepository } from "../ports/email-verification-token-repository.js";
import type { EmailService } from "../ports/email-service.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface ResendVerificationInput {
  email: string;
}

export interface ResendVerificationResult {
  message: string;
}

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const GENERIC_RESEND_MESSAGE =
  "If this email address has a pending verification, we've sent a new link to it.";

/** Same generic response whether the account exists, is already verified,
 * or genuinely got a new link — no account enumeration (ADR-006). */
export class ResendVerificationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: EmailVerificationTokenRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly emailService: EmailService,
    private readonly clock: Clock,
    private readonly appBaseUrl: string,
  ) {}

  async execute(input: ResendVerificationInput): Promise<ResendVerificationResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.userRepository.findByNormalizedEmail(normalizedEmail);

    if (user && !user.emailVerified) {
      await this.tokenRepository.invalidateAllForUser(user.id);

      const rawToken = this.tokenGenerator.generate();
      const tokenHash = this.tokenGenerator.hash(rawToken);
      const expiresAt = new Date(this.clock.now().getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
      await this.tokenRepository.create({ userId: user.id, tokenHash, expiresAt });

      await this.emailService.sendVerificationEmail({
        to: user.email,
        verificationUrl: `${this.appBaseUrl}/verify-email?token=${rawToken}`,
      });
    }

    return { message: GENERIC_RESEND_MESSAGE };
  }
}
