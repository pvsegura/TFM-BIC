import { normalizeEmail } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { EmailService } from "../ports/email-service.js";
import type { PasswordResetTokenRepository } from "../ports/password-reset-token-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface RequestPasswordResetInput {
  email: string;
}

export interface RequestPasswordResetResult {
  message: string;
}

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h — shorter than the verification token

const GENERIC_RESET_REQUEST_MESSAGE =
  "If this email address has an account, we've sent a password reset link to it.";

/** Same generic response regardless of account existence/verification
 * status — no account enumeration (ADR-006). Not gated on email
 * verification: an unverified user can still log in (M3 decision), so they
 * must also be able to reset a forgotten password. */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: PasswordResetTokenRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly emailService: EmailService,
    private readonly clock: Clock,
    private readonly appBaseUrl: string,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<RequestPasswordResetResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.userRepository.findByNormalizedEmail(normalizedEmail);

    if (user) {
      await this.tokenRepository.invalidateAllForUser(user.id);

      const rawToken = this.tokenGenerator.generate();
      const tokenHash = this.tokenGenerator.hash(rawToken);
      const expiresAt = new Date(this.clock.now().getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
      await this.tokenRepository.create({ userId: user.id, tokenHash, expiresAt });

      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        resetUrl: `${this.appBaseUrl}/reset-password?token=${rawToken}`,
      });
    }

    return { message: GENERIC_RESET_REQUEST_MESSAGE };
  }
}
